import { createWorker } from "tesseract.js"
import path from "path"
import fs from "fs"
import sharp from "sharp"

/**
 * Process receipt image to extract amount and vendor information
 * @param {string} imagePath - Path to the receipt image
 * @returns {Promise<{amount: number, vendor: string}>} - Extracted amount and vendor
 */
export async function processReceiptImage(imagePath) {
  try {
    console.log("Starting image processing for:", imagePath)

    // Preprocess the image for better OCR results
    const processedImagePath = await preprocessImage(imagePath)
    console.log("Image preprocessed:", processedImagePath)

    // Initialize Tesseract OCR worker
    console.log("Initializing Tesseract worker")
    const worker = await createWorker("eng")
    console.log("Tesseract worker initialized")

    // Recognize text from the image
    console.log("Starting OCR recognition")
    const {
      data: { text },
    } = await worker.recognize(processedImagePath)
    console.log("OCR text extracted:", text)

    // Clean up the temporary processed image
    if (fs.existsSync(processedImagePath) && processedImagePath !== imagePath) {
      fs.unlinkSync(processedImagePath)
      console.log("Temporary processed image deleted")
    }

    // Extract amount and vendor from the OCR text
    console.log("Extracting receipt data from OCR text")
    const extractedData = extractReceiptData(text)
    console.log("Extracted data:", extractedData)

    // Terminate the worker
    await worker.terminate()
    console.log("Tesseract worker terminated")

    return extractedData
  } catch (error) {
    console.error("Error in processReceiptImage:", error)
    return { amount: null, vendor: null }
  }
}

/**
 * Preprocess the image to improve OCR accuracy
 * @param {string} imagePath - Path to the original image
 * @returns {Promise<string>} - Path to the processed image
 */
async function preprocessImage(imagePath) {
  try {
    const outputPath = path.join(path.dirname(imagePath), `processed-${path.basename(imagePath)}`)

    // Apply multiple preprocessing steps to improve OCR
    await sharp(imagePath)
      .greyscale() // Convert to grayscale
      .normalize() // Normalize the image
      .sharpen({ sigma: 1.5 }) // Increase sharpening for better text clarity
      .threshold(140) // Adjust threshold for better text extraction
      .toFile(outputPath)

    return outputPath
  } catch (error) {
    console.error("Error preprocessing image:", error)
    return imagePath // Return original path if processing fails
  }
}

/**
 * Extract amount and vendor information from OCR text
 * @param {string} text - OCR extracted text
 * @returns {{amount: number, vendor: string}} - Extracted amount and vendor
 */
function extractReceiptData(text) {
  // Default return values
  const result = {
    amount: null,
    vendor: null,
  }

  if (!text) return result

  // Convert text to lowercase for easier matching
  const lowerText = text.toLowerCase()
  console.log("Extracting from text:", lowerText)

  // Extract amount - try multiple patterns to increase chances of finding the total
  const amountPatterns = [
    // Add Net Amount pattern first (highest priority)
    /net\s*amount\s*:?\s*(\d+[.,]\d{2})/i,
    /net\s*amount\s*:?\s*[€$£]?\s*(\d+[.,]\d{2})/i,

    // Common total patterns
    /total[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /amount[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /sum[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /to\s*pay[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,
    /grand\s*total[\s:]*[€$£]?\s*(\d+[.,]\d{2})/i,

    // Look for the largest amount on the receipt (often the total)
    /(\d+[.,]\d{2})/gi,
  ]

  // Try each pattern until we find a match
  for (const pattern of amountPatterns) {
    // Special handling for the last pattern - find all matches and take the largest
    if (pattern.toString().includes("ig")) {
      const matches = [...lowerText.matchAll(pattern)]
      if (matches && matches.length > 0) {
        // Find the largest amount
        let largestAmount = 0
        let largestAmountStr = ""

        for (const match of matches) {
          const extractedAmount = match[1].replace(",", ".")
          const amount = Number.parseFloat(extractedAmount)
          if (amount > largestAmount) {
            largestAmount = amount
            largestAmountStr = extractedAmount
          }
        }

        if (largestAmount > 0) {
          result.amount = largestAmount
          console.log(`Found largest amount ${result.amount} from multiple matches`)
          break
        }
      }
    } else {
      const match = lowerText.match(pattern)
      if (match && match[1]) {
        // Convert the matched amount to a number
        const extractedAmount = match[1].replace(",", ".")
        result.amount = Number.parseFloat(extractedAmount)
        console.log(`Found amount ${result.amount} using pattern: ${pattern}`)
        break
      }
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
        console.log(`Found vendor "${result.vendor}" using pattern: ${pattern}`)
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
        console.log(`Using first valid line as vendor: "${result.vendor}"`)
        break
      }
    }
  }

  return result
}
