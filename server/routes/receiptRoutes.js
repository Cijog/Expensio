import express from "express"
import multer from "multer"
import path from "path"
import fs from "fs"
import { fileURLToPath } from "url"
import Receipt from "../models/Receipt.js"
import { authenticateToken } from "../middleware/auth.js"

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "../uploads/receipts")
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }
    cb(null, uploadDir)
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9)
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname))
  },
})

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/
    const mimetype = filetypes.test(file.mimetype)
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase())

    if (mimetype && extname) {
      return cb(null, true)
    }
    cb(new Error("Only image files are allowed!"))
  },
})

// Process receipt image to extract amount and vendor information
function extractReceiptData(text) {
  // Default return values
  const result = {
    amount: null,
    vendor: null,
  }

  if (!text) return result

  // Convert text to lowercase for easier matching
  const lowerText = text.toLowerCase()

  // Extract amount - try multiple patterns to increase chances of finding the total
  const amountPatterns = [
    // Common total patterns
    /total[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /amount[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /sum[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /to\s*pay[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /grand\s*total[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,

    // Currency symbol patterns
    /[€$£]\s*(\d+[.,]\d{2})/i,
    /(\d+[.,]\d{2})\s*[€$£]/i,

    // Look for numbers that appear to be totals (near keywords)
    /total.*?(\d+[.,]\d{2})/i,
    /(\d+[.,]\d{2}).*?total/i,

    // Last resort - any number with decimal
    /(\d+[.,]\d{2})/i,
  ]

  // Try each pattern until we find a match
  for (const pattern of amountPatterns) {
    const match = lowerText.match(pattern)
    if (match && match[1]) {
      // Convert the matched amount to a number
      const extractedAmount = match[1].replace(",", ".")
      result.amount = Number.parseFloat(extractedAmount)
      break
    }
  }

  // Extract vendor - usually at the top of the receipt
  const lines = text.split("\n").filter((line) => line.trim().length > 0)

  // Common vendor name patterns
  const vendorPatterns = [/thank you for shopping at (.*)/i, /welcome to (.*)/i, /receipt from (.*)/i]

  // Try to find vendor name using patterns
  for (const pattern of vendorPatterns) {
    for (const line of lines) {
      const match = line.match(pattern)
      if (match && match[1]) {
        result.vendor = match[1].trim()
        break
      }
    }
    if (result.vendor) break
  }

  // If no vendor found with patterns, use first few lines
  if (!result.vendor && lines.length > 0) {
    // First few lines often contain the vendor name
    // Skip very short lines or lines that are likely to be dates/times
    for (let i = 0; i < Math.min(3, lines.length); i++) {
      const line = lines[i].trim()
      if (line.length > 3 && !line.match(/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/) && !line.match(/^\d{1,2}:\d{2}$/)) {
        result.vendor = line
        break
      }
    }
  }

  return result
}

// Process receipt image endpoint
router.post("/process-image", authenticateToken, upload.single("receiptImage"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" })
    }

    // For now, we'll simulate OCR by returning a mock result
    // In a real implementation, you would use a library like Tesseract.js
    const mockText = "RECEIPT\nStore: Example Store\nDate: 2023-04-19\nTotal: $45.99"

    // Extract data from the mock text
    const extractedData = extractReceiptData(mockText)

    res.json({
      success: true,
      amount: extractedData.amount || 0,
      vendor: extractedData.vendor || "Unknown Vendor",
      message: "Image processed successfully",
    })
  } catch (err) {
    console.error("Error processing receipt image:", err)
    res.status(500).json({ error: "Failed to process receipt image" })
  }
})

// Get all receipts for the authenticated user
router.get("/", authenticateToken, async (req, res) => {
  try {
    const receipts = await Receipt.find({ userId: req.user.id }).sort({ date: -1 })

    // Add server URL to image paths
    const receiptsWithUrls = receipts.map((receipt) => {
      const receiptObj = receipt.toObject()
      if (receiptObj.imageUrl) {
        // Ensure the URL is properly formatted with the server base URL
        receiptObj.imageUrl = `http://localhost:5000/${receiptObj.imageUrl.replace(/^\//, "")}`
      }
      return receiptObj
    })

    res.json(receiptsWithUrls)
  } catch (err) {
    console.error("Get receipts error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Create a new receipt for the authenticated user
router.post("/", authenticateToken, upload.single("receiptImage"), async (req, res) => {
  try {
    const { vendor, amount, category, date, notes } = req.body

    const receiptData = {
      vendor: vendor || "Unknown Vendor",
      amount: Number.parseFloat(amount) || 0,
      category,
      date: date || new Date(),
      notes,
      userId: req.user.id,
    }

    // Add image URL if file was uploaded
    if (req.file) {
      // Store relative path from server root
      const relativePath = `uploads/receipts/${path.basename(req.file.path)}`
      receiptData.imageUrl = relativePath
    }

    const receipt = new Receipt(receiptData)
    await receipt.save()

    // Add server URL to image path for response
    const responseReceipt = receipt.toObject()
    if (responseReceipt.imageUrl) {
      responseReceipt.imageUrl = `http://localhost:5000/${responseReceipt.imageUrl}`
    }

    res.status(201).json(responseReceipt)
  } catch (err) {
    console.error("Create receipt error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Get receipt by ID (ensure it belongs to the user)
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" })
    }

    // Add server URL to image path
    const receiptObj = receipt.toObject()
    if (receiptObj.imageUrl) {
      receiptObj.imageUrl = `http://localhost:5000/${receiptObj.imageUrl.replace(/^\//, "")}`
    }

    res.json(receiptObj)
  } catch (err) {
    console.error("Get receipt by ID error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Download receipt image
router.get("/:id/download", authenticateToken, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!receipt || !receipt.imageUrl) {
      return res.status(404).json({ error: "Receipt image not found" })
    }

    // Construct absolute path to the image file
    const filePath = path.join(__dirname, "..", receipt.imageUrl.replace(/^\//, ""))

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "Receipt image file not found" })
    }

    res.download(filePath)
  } catch (err) {
    console.error("Download receipt error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Delete receipt by ID (ensure it belongs to the user)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!receipt) {
      return res.status(404).json({ error: "Receipt not found" })
    }

    // Delete image file if it exists
    if (receipt.imageUrl) {
      const filePath = path.join(__dirname, "..", receipt.imageUrl.replace(/^\//, ""))
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath)
      }
    }

    await Receipt.deleteOne({ _id: req.params.id })
    res.json({ message: "Receipt deleted successfully" })
  } catch (err) {
    console.error("Delete receipt error:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router
