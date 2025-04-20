"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from "react-router-dom"
import {
  Receipt,
  Plane,
  CreditCard,
  RefreshCw,
  BarChart3,
  Loader2,
  AlertCircle,
  Trash,
  UserPlus,
  Users,
} from "lucide-react"
import { Bar } from "react-chartjs-2"
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js"
import { motion } from "framer-motion"

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend)

function Home({ user }) {
  const [activeTrips, setActiveTrips] = useState([])
  const [monthlyExpenses, setMonthlyExpenses] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [dataLoading, setDataLoading] = useState(true)
  const [processingImage, setProcessingImage] = useState(false)
  const [error, setError] = useState(null)
  const [dataError, setDataError] = useState(null)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  // Form visibility states
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [showReceiptForm, setShowReceiptForm] = useState(false)
  const [showTripForm, setShowTripForm] = useState(false)

  // Form data states
  const [expenseFormData, setExpenseFormData] = useState({
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
  })
  const [receiptFormData, setReceiptFormData] = useState({
    vendor: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    notes: "",
    receiptImage: null,
    imagePreview: null,
  })
  const [tripFormData, setTripFormData] = useState({
    destination: "",
    purpose: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0], // Default to 1 week from now
    budget: "",
    notes: "",
  })

  // Collaborators state for Trip Form
  const [collaborators, setCollaborators] = useState([])

  useEffect(() => {
    if (!user || !user.id) {
      navigate("/login") // Redirect to login if user is not authenticated
      return
    }

    fetchData()
  }, [user, navigate])

  const fetchData = async () => {
    try {
      setDataLoading(true)
      setDataError(null)

      // Fetch active trips
      const tripsResponse = await axios.get("http://localhost:5000/trips/active", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setActiveTrips(tripsResponse.data)

      // Fetch expenses for all trips
      const expensesResponse = await axios.get("http://localhost:5000/expenses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })

      // Group expenses by month
      const expensesByMonth = {}

      if (expensesResponse.data && Array.isArray(expensesResponse.data)) {
        expensesResponse.data.forEach((expense) => {
          if (expense && expense.date && expense.amount) {
            const date = new Date(expense.date)
            if (!isNaN(date.getTime())) {
              const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}` // Format: YYYY-MM
              expensesByMonth[month] = (expensesByMonth[month] || 0) + expense.amount
            }
          }
        })
      }

      setMonthlyExpenses(expensesByMonth)
    } catch (err) {
      console.error("Error fetching data:", err.response?.data || err.message)
      setDataError("Failed to load data. Please try refreshing the page.")
    } finally {
      setDataLoading(false)
    }
  }

  // Prepare data for the graph
  const graphData = {
    labels: Object.keys(monthlyExpenses)
      .sort() // Sort chronologically
      .map((month) => {
        const [year, monthNum] = month.split("-")
        return `${new Date(0, Number.parseInt(monthNum) - 1).toLocaleString("default", { month: "short" })} ${year}`
      }),
    datasets: [
      {
        label: "Monthly Expenses (€)",
        data: Object.keys(monthlyExpenses)
          .sort()
          .map((key) => monthlyExpenses[key]),
        backgroundColor: "rgba(138, 43, 226, 0.6)", // Vibrant purple
        borderColor: "rgba(138, 43, 226, 1)",
        borderWidth: 1,
        borderRadius: 6,
        hoverBackgroundColor: "rgba(138, 43, 226, 0.8)",
      },
    ],
  }

  const graphOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: {
          color: "white",
          font: {
            size: 12,
            weight: "bold",
          },
        },
      },
      title: {
        display: true,
        text: "Monthly Expenses",
        color: "white",
        font: {
          size: 16,
          weight: "bold",
        },
      },
      tooltip: {
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        titleFont: {
          size: 14,
          weight: "bold",
        },
        bodyFont: {
          size: 13,
        },
        padding: 10,
        cornerRadius: 6,
        displayColors: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: "white",
          callback: (value) => "€" + value,
        },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
      x: {
        ticks: { color: "white" },
        grid: { color: "rgba(255, 255, 255, 0.1)" },
      },
    },
    animation: {
      duration: 2000,
      easing: "easeOutQuart",
    },
  }

  // Reset all forms
  const resetForms = () => {
    setShowExpenseForm(false)
    setShowReceiptForm(false)
    setShowTripForm(false)
    setError(null)
    setSuccess(false)
    setExpenseFormData({
      amount: "",
      category: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
    })
    setReceiptFormData({
      vendor: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      category: "",
      notes: "",
      receiptImage: null,
      imagePreview: null,
    })
    setTripFormData({
      destination: "",
      purpose: "",
      startDate: new Date().toISOString().split("T")[0],
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      budget: "",
      notes: "",
    })
    setCollaborators([]) // Reset collaborators
  }

  // Form input handlers
  const handleExpenseInputChange = (e) => {
    const { name, value } = e.target
    setExpenseFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleReceiptInputChange = (e) => {
    const { name, value } = e.target
    setReceiptFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleTripInputChange = (e) => {
    const { name, value } = e.target
    setTripFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Collaborators handlers
  const addCollaborator = () => {
    setCollaborators([...collaborators, { email: "", budgetContribution: "" }])
  }

  const removeCollaborator = (index) => {
    setCollaborators(collaborators.filter((_, i) => i !== index))
  }

  const handleCollaboratorChange = (index, field, value) => {
    const updatedCollaborators = [...collaborators]
    updatedCollaborators[index][field] = value
    setCollaborators(updatedCollaborators)
  }

  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    setReceiptFormData((prev) => ({
      ...prev,
      receiptImage: file,
      imagePreview: URL.createObjectURL(file),
    }))

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
        setReceiptFormData((prev) => ({
          ...prev,
          amount: response.data.amount || prev.amount,
          vendor: response.data.vendor || prev.vendor,
        }))
        setSuccess(true)
        setTimeout(() => setSuccess(false), 3000)
      } else {
        setError("Could not extract information from the receipt. Please enter details manually.")
      }
    } catch (err) {
      console.error("Image processing error:", err.response?.data || err.message)
      setError("Failed to process receipt image. Please try again.")
    } finally {
      setProcessingImage(false)
    }
  }

  // Form submission handlers
  const handleExpenseSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const payload = { ...expenseFormData }

      if (payload.category.startsWith("trip:")) {
        payload.tripId = payload.category.split("trip:")[1]
        payload.category = "Trip Expense"
      }

      await axios.post("http://localhost:5000/expenses", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setSuccess(true)
      setTimeout(() => {
        resetForms()
        fetchData() // Refresh data after adding expense
      }, 2000)
    } catch (err) {
      console.error("Expense submission error:", err.response?.data || err.message)
      setError(err.response?.data?.error || "Failed to submit expense. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleReceiptSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append("vendor", receiptFormData.vendor || "Unknown Vendor")
      formData.append("amount", receiptFormData.amount || 0)
      formData.append("date", receiptFormData.date || new Date().toISOString())
      formData.append("category", receiptFormData.category)
      formData.append("notes", receiptFormData.notes || "")

      if (receiptFormData.receiptImage) {
        formData.append("receiptImage", receiptFormData.receiptImage)
      }

      await axios.post("http://localhost:5000/receipts", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })

      setSuccess(true)
      setTimeout(() => {
        resetForms()
        navigate("/receipts")
      }, 2000)
    } catch (err) {
      console.error("Receipt submission error:", err.response?.data || err.message)
      setError(err.response?.data?.error || "Failed to submit receipt. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTripSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const payload = {
        ...tripFormData,
        startDate: tripFormData.startDate || new Date().toISOString(),
        endDate: tripFormData.endDate || new Date().toISOString(),
        budget: Number.parseFloat(tripFormData.budget) || 0,
      }

      const response = await axios.post("http://localhost:5000/trips", payload, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })

      // Send collaboration invites
      for (const collaborator of collaborators) {
        if (collaborator.email) {
          try {
            await axios.post(
              `http://localhost:5000/acceptance/${response.data._id}/invite`,
              {
                email: collaborator.email,
                budgetContribution: collaborator.budgetContribution || 0,
              },
              {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
              },
            )
          } catch (collabErr) {
            console.error("Failed to invite collaborator:", collabErr)
            // Continue with other collaborators even if one fails
          }
        }
      }

      setSuccess(true)
      setTimeout(() => {
        resetForms()
        navigate("/trips")
      }, 2000)
    } catch (err) {
      console.error("Trip submission error:", err.response?.data || err.message)
      setError(err.response?.data?.error || "Failed to submit trip. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = () => {
    fetchData()
  }

  const handleViewTrip = (tripId) => {
    navigate("/trips")
  }

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-2xl font-bold text-white"
        >
          Welcome, {user?.username || "User"}
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={refreshData}
          className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
          title="Refresh data"
        >
          {dataLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <RefreshCw className="h-5 w-5" />}
        </motion.button>
      </div>

      {/* Monthly Expenses Graph */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
      >
        <div className="flex items-center mb-4">
          <BarChart3 className="h-6 w-6 mr-2 text-purple-400" />
          <h2 className="text-xl text-white font-bold">Monthly Expenses</h2>
        </div>

        {dataLoading ? (
          <div className="flex flex-col items-center justify-center h-64">
            <Loader2 className="h-10 w-10 text-purple-500 animate-spin mb-4" />
            <p className="text-gray-300">Loading your expense data...</p>
          </div>
        ) : dataError ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <AlertCircle className="h-10 w-10 text-red-500 mb-4" />
            <p className="text-red-400 mb-2">{dataError}</p>
            <button
              onClick={refreshData}
              className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : Object.keys(monthlyExpenses).length > 0 ? (
          <div className="h-64">
            <Bar data={graphData} options={graphOptions} />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <p className="text-gray-300 mb-4">No expense data available yet.</p>
            <p className="text-gray-400 mb-4">Start by adding expenses or creating a trip.</p>
            <div className="flex space-x-4">
              <button
                onClick={() => {
                  resetForms()
                  setShowExpenseForm(true)
                }}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
              >
                Add Expense
              </button>
              <button
                onClick={() => {
                  resetForms()
                  setShowTripForm(true)
                }}
                className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
              >
                Create Trip
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Quick Access Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="mb-6"
      >
        <h2 className="text-xl text-white font-bold mb-4">Quick Access</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(138, 43, 226, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-br from-purple-600 to-purple-800 text-white p-6 rounded-lg flex flex-col items-center justify-center hover:from-purple-700 hover:to-purple-900 transition-all duration-300 shadow-lg"
            onClick={() => {
              resetForms()
              setShowExpenseForm(true)
            }}
          >
            <CreditCard className="h-10 w-10 mb-3" />
            <span className="text-lg font-medium">Add Expense</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-lg flex flex-col items-center justify-center hover:from-blue-700 hover:to-blue-900 transition-all duration-300 shadow-lg"
            onClick={() => {
              resetForms()
              setShowReceiptForm(true)
            }}
          >
            <Receipt className="h-10 w-10 mb-3" />
            <span className="text-lg font-medium">Create Receipt</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, boxShadow: "0 10px 25px -5px rgba(239, 68, 68, 0.4)" }}
            whileTap={{ scale: 0.97 }}
            className="bg-gradient-to-br from-red-600 to-red-800 text-white p-6 rounded-lg flex flex-col items-center justify-center hover:from-red-700 hover:to-red-900 transition-all duration-300 shadow-lg"
            onClick={() => {
              resetForms()
              setShowTripForm(true)
            }}
          >
            <Plane className="h-10 w-10 mb-3" />
            <span className="text-lg font-medium">Create Trip</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Expense Form */}
      {showExpenseForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
        >
          <h2 className="text-xl text-white font-bold mb-4">Add New Expense</h2>
          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md mb-4 flex items-center">
              <div className="mr-3 flex-shrink-0">✓</div>
              <p>Expense added successfully!</p>
            </div>
          )}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleExpenseSubmit} className="space-y-4">
            <div>
              <label className="block text-white mb-1 font-medium">Amount (€)</label>
              <input
                type="number"
                name="amount"
                value={expenseFormData.amount}
                onChange={handleExpenseInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Category</label>
              <select
                name="category"
                value={expenseFormData.category}
                onChange={handleExpenseInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other</option>
                {activeTrips.length > 0 && (
                  <>
                    <option disabled>── Linked Trips ──</option>
                    {activeTrips.map((trip) => (
                      <option key={trip._id} value={`trip:${trip._id}`}>
                        Trip to {trip.destination}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Description</label>
              <input
                type="text"
                name="description"
                value={expenseFormData.description}
                onChange={handleExpenseInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                disabled={isLoading}
                placeholder="What was this expense for?"
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={expenseFormData.date}
                onChange={handleExpenseInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                disabled={isLoading}
              />
            </div>
            <div className="flex space-x-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-purple-600 text-white py-3 px-6 rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center min-w-32"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                {isLoading ? "Submitting..." : "Submit Expense"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                onClick={resetForms}
                disabled={isLoading}
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Receipt Form */}
      {showReceiptForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
        >
          <h2 className="text-xl text-white font-bold mb-4">Create New Receipt</h2>
          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md mb-4 flex items-center">
              <div className="mr-3 flex-shrink-0">✓</div>
              <p>Receipt processed successfully!</p>
            </div>
          )}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleReceiptSubmit} className="space-y-4">
            <div>
              <label className="block text-white mb-1 font-medium">Category</label>
              <select
                name="category"
                value={receiptFormData.category}
                onChange={handleReceiptInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
              >
                <option value="">Select a category</option>
                <option value="Food">Food</option>
                <option value="Transportation">Transportation</option>
                <option value="Accommodation">Accommodation</option>
                <option value="Entertainment">Entertainment</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Other">Other</option>
                {activeTrips.length > 0 && (
                  <>
                    <option disabled>── Linked Trips ──</option>
                    {activeTrips.map((trip) => (
                      <option key={trip._id} value={`trip:${trip._id}`}>
                        Trip to {trip.destination} (In Progress)
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Receipt Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                disabled={isLoading || processingImage}
                required
              />
              {processingImage && (
                <div className="flex items-center text-blue-400 mt-2">
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Processing image...
                </div>
              )}
              {receiptFormData.imagePreview && (
                <div className="mt-2">
                  <img
                    src={receiptFormData.imagePreview || "/placeholder.svg"}
                    alt="Receipt preview"
                    className="max-h-40 rounded-lg border border-gray-600"
                  />
                </div>
              )}
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">
                Vendor {receiptFormData.vendor && <span className="text-green-400">(Auto-detected)</span>}
              </label>
              <input
                type="text"
                name="vendor"
                value={receiptFormData.vendor}
                onChange={handleReceiptInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                placeholder="Enter vendor name"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">
                Amount (€) {receiptFormData.amount && <span className="text-green-400">(Auto-detected)</span>}
              </label>
              <input
                type="number"
                name="amount"
                value={receiptFormData.amount}
                onChange={handleReceiptInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                placeholder="Enter amount"
                step="0.01"
                required
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Date</label>
              <input
                type="date"
                name="date"
                value={receiptFormData.date}
                onChange={handleReceiptInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                disabled={isLoading}
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Notes</label>
              <textarea
                name="notes"
                value={receiptFormData.notes}
                onChange={handleReceiptInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                rows="3"
                disabled={isLoading}
                placeholder="Add any additional notes here"
              ></textarea>
            </div>
            <div className="flex space-x-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center min-w-32"
                disabled={isLoading || processingImage}
              >
                {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                {isLoading ? "Submitting..." : "Submit Receipt"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                onClick={resetForms}
                disabled={isLoading || processingImage}
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Trip Form */}
      {showTripForm && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
        >
          <h2 className="text-xl text-white font-bold mb-4">Create New Trip</h2>
          {success && (
            <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md mb-4 flex items-center">
              <div className="mr-3 flex-shrink-0">✓</div>
              <p>Trip added successfully!</p>
            </div>
          )}
          {error && (
            <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              <p>{error}</p>
            </div>
          )}
          <form onSubmit={handleTripSubmit} className="space-y-4">
            <div>
              <label className="block text-white mb-1 font-medium">Destination</label>
              <input
                type="text"
                name="destination"
                value={tripFormData.destination}
                onChange={handleTripInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
                placeholder="e.g., Paris, France"
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Purpose</label>
              <input
                type="text"
                name="purpose"
                value={tripFormData.purpose}
                onChange={handleTripInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
                placeholder="e.g., Client Meeting, Conference"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-white mb-1 font-medium">Start Date</label>
                <input
                  type="date"
                  name="startDate"
                  value={tripFormData.startDate}
                  onChange={handleTripInputChange}
                  className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="block text-white mb-1 font-medium">End Date</label>
                <input
                  type="date"
                  name="endDate"
                  value={tripFormData.endDate}
                  onChange={handleTripInputChange}
                  className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Budget (€)</label>
              <input
                type="number"
                name="budget"
                value={tripFormData.budget}
                onChange={handleTripInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                required
                disabled={isLoading}
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-white mb-1 font-medium">Notes</label>
              <textarea
                name="notes"
                value={tripFormData.notes}
                onChange={handleTripInputChange}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                rows="3"
                disabled={isLoading}
                placeholder="Additional details about the trip..."
              ></textarea>
            </div>
            {/* Collaborators Section */}
            <div>
              <label className="block text-white mb-1 font-medium">Collaborators</label>
              <div className="space-y-2">
                {collaborators.map((collaborator, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input
                      type="text"
                      placeholder="Enter user email"
                      value={collaborator.email}
                      onChange={(e) => handleCollaboratorChange(index, "email", e.target.value)}
                      className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                    />
                    <input
                      type="number"
                      placeholder="Budget Contribution (€)"
                      value={collaborator.budgetContribution}
                      onChange={(e) => handleCollaboratorChange(index, "budgetContribution", e.target.value)}
                      className="w-32 p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500 focus:outline-none transition-colors"
                    />
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      type="button"
                      onClick={() => removeCollaborator(index)}
                      className="text-red-500 hover:text-red-400 p-2"
                    >
                      <Trash className="h-5 w-5" />
                    </motion.button>
                  </div>
                ))}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={addCollaborator}
                  className="bg-gray-700 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors mt-2 flex items-center"
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Collaborator
                </motion.button>
              </div>
            </div>
            <div className="flex space-x-4 pt-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors font-medium flex items-center justify-center min-w-32"
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : null}
                {isLoading ? "Submitting..." : "Create Trip"}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                className="bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition-colors font-medium"
                onClick={resetForms}
                disabled={isLoading}
              >
                Cancel
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* Active Trips Section */}
      {activeTrips.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-gray-800 p-6 rounded-lg mb-6 border border-gray-700 shadow-lg"
        >
          <div className="flex items-center mb-4">
            <Plane className="h-6 w-6 mr-2 text-red-400" />
            <h2 className="text-xl text-white font-bold">Active Trips</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTrips.map((trip) => (
              <motion.div
                key={trip._id}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                className="bg-gray-900 p-4 rounded-lg border border-gray-700 transition-all duration-300"
              >
                <h3 className="text-lg text-white font-medium">{trip.destination}</h3>
                <p className="text-gray-300 text-sm">{trip.purpose}</p>
                <p className="text-gray-400 text-xs mt-2">
                  {new Date(trip.startDate).toLocaleDateString()} - {new Date(trip.endDate).toLocaleDateString()}
                </p>
                <div className="mt-2">
                  <span className="text-blue-400 font-medium">Budget: €{trip.budget.toFixed(2)}</span>
                </div>
                {trip.collaborators && trip.collaborators.length > 0 && (
                  <div className="mt-2 flex items-center">
                    <Users className="h-4 w-4 mr-1 text-purple-400" />
                    <span className="text-purple-400 text-sm">{trip.collaborators.length} collaborator(s)</span>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate("/trips")}
                  className="mt-3 w-full bg-gradient-to-r from-blue-600 to-blue-800 text-white py-2 px-3 rounded-md hover:from-blue-700 hover:to-blue-900 transition-all duration-300 font-medium"
                >
                  View Details
                </motion.button>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default Home
