"use client"

import { useEffect, useState } from "react"
import axios from "axios"
import { Eye, Download, Trash, Upload, RefreshCw } from "lucide-react"

function Receipts({ user }) {
  const [receipts, setReceipts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedReceipt, setSelectedReceipt] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [processingImage, setProcessingImage] = useState(false)
  const [success, setSuccess] = useState(false)

  // New state for receipt upload
  const [newReceipt, setNewReceipt] = useState({
    category: "",
    receiptImage: null,
    imagePreview: null,
    extractedAmount: null,
    date: new Date().toISOString().split("T")[0],
    notes: "",
    vendor: "",
  })

  useEffect(() => {
    fetchReceipts()
  }, [])

  const fetchReceipts = async () => {
    try {
      setLoading(true)
      const response = await axios.get("http://localhost:5000/receipts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setReceipts(response.data)
    } catch (err) {
      console.error("Fetch receipts error:", err)
      setError(err.response?.data?.error || "Failed to fetch receipts. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleViewReceipt = (receipt) => {
    setSelectedReceipt(receipt)
    setShowModal(true)
  }

  const handleDownloadReceipt = async (receipt) => {
    try {
      const response = await axios.get(`http://localhost:5000/receipts/${receipt._id}/download`, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })

      // Create a download link
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement("a")
      link.href = url
      link.setAttribute("download", `receipt-${receipt._id}.jpg`)
      document.body.appendChild(link)
      link.click()
      link.remove()
    } catch (err) {
      console.error("Download receipt error:", err)
      setError("Failed to download receipt. Please try again.")
    }
  }

  const handleDeleteReceipt = async (receiptId) => {
    if (window.confirm("Are you sure you want to delete this receipt?")) {
      try {
        await axios.delete(`http://localhost:5000/receipts/${receiptId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        setReceipts(receipts.filter((receipt) => receipt._id !== receiptId))
      } catch (err) {
        console.error("Delete receipt error:", err)
        setError(err.response?.data?.error || "Failed to delete receipt. Please try again.")
      }
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setNewReceipt((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setNewReceipt((prev) => ({
      ...prev,
      receiptImage: file,
      imagePreview: URL.createObjectURL(file),
    }))

    // Process the image to extract amount
    try {
      setProcessingImage(true)
      setError(null)
      const formData = new FormData()
      formData.append("receiptImage", file)

      const response = await axios.post("http://localhost:5000/receipts/process-image", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      if (response.data.success) {
        setNewReceipt((prev) => ({
          ...prev,
          extractedAmount: response.data.amount,
          vendor: response.data.vendor || prev.vendor,
        }))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError("Could not extract information from the receipt. Please enter details manually.")
      }
    } catch (err) {
      console.error("Image processing error:", err)
      setError("Failed to process receipt image. Please enter details manually.")
    } finally {
      setProcessingImage(false)
    }
  }

  const handleSubmitReceipt = async (e) => {
    e.preventDefault()

    try {
      setLoading(true)
      setError(null)
      const formData = new FormData()
      formData.append("category", newReceipt.category)
      formData.append("amount", newReceipt.extractedAmount || 0)
      formData.append("date", newReceipt.date)
      formData.append("notes", newReceipt.notes)
      formData.append("vendor", newReceipt.vendor || "Unknown Vendor")

      if (newReceipt.receiptImage) {
        formData.append("receiptImage", newReceipt.receiptImage)
      }

      await axios.post("http://localhost:5000/receipts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      // Reset form and refresh receipts
      setNewReceipt({
        category: "",
        receiptImage: null,
        imagePreview: null,
        extractedAmount: null,
        date: new Date().toISOString().split("T")[0],
        notes: "",
        vendor: "",
      })
      setShowUploadModal(false)
      fetchReceipts()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("Submit receipt error:", err)
      setError(err.response?.data?.error || "Failed to submit receipt. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  if (loading && !showUploadModal) return <div className="p-6 text-white">Loading receipts...</div>
  if (error && !showUploadModal && !receipts.length) return <div className="p-6 text-red-500">{error}</div>

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl text-white">Receipts</h1>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-blue-accent text-white p-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
        >
          <Upload className="h-5 w-5 mr-2" /> Upload Receipt
        </button>
      </div>

      {error && <div className="bg-red-900 text-white p-3 rounded-md mb-4">{error}</div>}
      {success && <div className="bg-green-900 text-white p-3 rounded-md mb-4">Operation completed successfully!</div>}

      {receipts.length === 0 ? (
        <div className="bg-content-bg p-6 rounded-lg">
          <p className="text-white">No receipts found. Upload your first receipt using the button above.</p>
        </div>
      ) : (
        <div className="bg-content-bg p-6 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {receipts.map((receipt) => (
              <div key={receipt._id} className="bg-sidebar-bg p-4 rounded-lg border border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-white font-medium">{receipt.vendor}</h3>
                  <span className="text-green-500 font-bold">€{receipt.amount.toFixed(2)}</span>
                </div>
                <div className="text-gray-400 text-sm mb-2">
                  <p>Category: {receipt.category}</p>
                  <p>Date: {new Date(receipt.date).toLocaleDateString()}</p>
                </div>
                {receipt.notes && <p className="text-gray-300 text-sm mb-3">{receipt.notes}</p>}

                {receipt.imageUrl && (
                  <div className="mb-3">
                    <img
                      src={receipt.imageUrl || "/placeholder.svg"}
                      alt={`Receipt from ${receipt.vendor}`}
                      className="w-full h-32 object-cover rounded-md"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                )}

                <div className="flex justify-between">
                  <button
                    onClick={() => handleViewReceipt(receipt)}
                    className="text-blue-400 hover:text-blue-300 flex items-center"
                  >
                    <Eye className="h-4 w-4 mr-1" /> View
                  </button>
                  <button
                    onClick={() => handleDownloadReceipt(receipt)}
                    className="text-purple-400 hover:text-purple-300 flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" /> Download
                  </button>
                  <button
                    onClick={() => handleDeleteReceipt(receipt._id)}
                    className="text-red-400 hover:text-red-300 flex items-center"
                  >
                    <Trash className="h-4 w-4 mr-1" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Receipt Detail Modal */}
      {showModal && selectedReceipt && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-content-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white">Receipt Details</h2>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>

              <div className="mb-4">
                <h3 className="text-lg text-white font-medium">{selectedReceipt.vendor}</h3>
                <p className="text-green-500 font-bold text-xl">€{selectedReceipt.amount.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400">Category:</p>
                  <p className="text-white">{selectedReceipt.category}</p>
                </div>
                <div>
                  <p className="text-gray-400">Date:</p>
                  <p className="text-white">{new Date(selectedReceipt.date).toLocaleDateString()}</p>
                </div>
              </div>

              {selectedReceipt.notes && (
                <div className="mb-4">
                  <p className="text-gray-400">Notes:</p>
                  <p className="text-white">{selectedReceipt.notes}</p>
                </div>
              )}

              {selectedReceipt.imageUrl && (
                <div className="mb-4">
                  <p className="text-gray-400 mb-2">Receipt Image:</p>
                  <img
                    src={selectedReceipt.imageUrl || "/placeholder.svg"}
                    alt={`Receipt from ${selectedReceipt.vendor}`}
                    className="max-w-full rounded-lg"
                    onError={(e) => {
                      e.target.onerror = null
                      e.target.src = "/placeholder.svg"
                    }}
                  />
                </div>
              )}

              <div className="flex justify-end space-x-2 mt-4">
                <button
                  onClick={() => handleDownloadReceipt(selectedReceipt)}
                  className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  Download Receipt
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Receipt Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-content-bg rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white">Upload Receipt</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                  ✕
                </button>
              </div>

              {error && <div className="bg-red-900 text-white p-3 rounded-md mb-4">{error}</div>}
              {success && (
                <div className="bg-green-900 text-white p-3 rounded-md mb-4">Receipt processed successfully!</div>
              )}

              <form onSubmit={handleSubmitReceipt} className="space-y-4">
                <div>
                  <label className="block text-white mb-1">Upload Receipt Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                    required
                  />
                  {processingImage && (
                    <div className="flex items-center text-blue-400 mt-2">
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing image...
                    </div>
                  )}
                </div>

                {newReceipt.imagePreview && (
                  <div className="mt-2">
                    <p className="text-white mb-1">Preview:</p>
                    <img
                      src={newReceipt.imagePreview || "/placeholder.svg"}
                      alt="Receipt preview"
                      className="max-h-60 rounded-lg border border-gray-600"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-white mb-1">Category</label>
                  <select
                    name="category"
                    value={newReceipt.category}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                    required
                  >
                    <option value="">Select a category</option>
                    <option value="Food">Food</option>
                    <option value="Transportation">Transportation</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Office Supplies">Office Supplies</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white mb-1">
                    Vendor {newReceipt.vendor && <span className="text-green-400">(Auto-detected)</span>}
                  </label>
                  <input
                    type="text"
                    name="vendor"
                    value={newReceipt.vendor}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                    placeholder="Enter vendor name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-1">
                    Amount (€) {newReceipt.extractedAmount && <span className="text-green-400">(Auto-detected)</span>}
                  </label>
                  <input
                    type="number"
                    name="extractedAmount"
                    value={newReceipt.extractedAmount || ""}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                    placeholder="Enter amount or let us detect it"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-white mb-1">Date</label>
                  <input
                    type="date"
                    name="date"
                    value={newReceipt.date}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                  />
                </div>

                <div>
                  <label className="block text-white mb-1">Notes (Optional)</label>
                  <textarea
                    name="notes"
                    value={newReceipt.notes}
                    onChange={handleInputChange}
                    className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
                    rows="3"
                  ></textarea>
                </div>

                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    type="submit"
                    className="bg-blue-accent text-white p-2 rounded-lg hover:bg-blue-700 transition-colors"
                    disabled={loading || processingImage}
                  >
                    {loading ? "Uploading..." : "Upload Receipt"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="bg-gray-600 text-white p-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Receipts
