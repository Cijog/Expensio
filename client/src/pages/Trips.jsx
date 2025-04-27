"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import {
  PlusCircle,
  Trash,
  Calendar,
  DollarSign,
  MapPin,
  AlertTriangle,
  Edit3,
  Users,
  UserPlus,
  X,
  Loader2,
  RefreshCw,
  Info,
  AlertCircle,
  Plane,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"

function Trips({ user }) {
  const [trips, setTrips] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [showTripDetails, setShowTripDetails] = useState(false)
  const [tripExpenses, setTripExpenses] = useState([])
  const [loadingExpenses, setLoadingExpenses] = useState(false)
  const [allExpenses, setAllExpenses] = useState({})
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCollaboratorsModal, setShowCollaboratorsModal] = useState(false)
  const [editTripData, setEditTripData] = useState({
    destination: "",
    purpose: "",
    startDate: "",
    endDate: "",
    budget: "",
    _id: null,
  })
  const [collaborators, setCollaborators] = useState([])
  const [newCollaborator, setNewCollaborator] = useState({ email: "", budgetContribution: "" })
  const [collaboratorActionStatus, setCollaboratorActionStatus] = useState({
    loading: false,
    error: null,
    success: null,
  })
  const [pendingCollaborationExpenses, setPendingCollaborationExpenses] = useState([])
  const navigate = useNavigate()

  // This useEffect will run once when the component mounts
  useEffect(() => {
    console.log("Trips component mounted - fetching trips immediately")
    fetchTrips()
  }, []) // Empty dependency array ensures this runs only on mount

  const fetchTrips = async (signal) => {
    try {
      setLoading(true)
      setError(null)
      console.log("Fetching trips data...")

      const response = await axios.get("http://localhost:5000/trips", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal,
      })

      console.log("Raw trips data:", response.data)

      // Filter out trips with invalid IDs
      const validTrips = response.data.filter((trip) => {
        // Check if trip exists and has an _id
        if (!trip || !trip._id) {
          console.warn("Found trip with missing _id:", trip)
          return false
        }

        // Validate ID format
        const isValidId = /^[0-9a-fA-F]{24}$/.test(trip._id)
        if (!isValidId) {
          console.warn("Found trip with invalid _id format:", trip._id)
          return false
        }

        const isValidDates =
          trip.startDate &&
          trip.endDate &&
          !isNaN(new Date(trip.startDate).getTime()) &&
          !isNaN(new Date(trip.endDate).getTime())

        const isValidBudget = typeof trip.budget === "number" && !isNaN(trip.budget)

        return isValidId && isValidDates && isValidBudget
      })

      console.log("Filtered valid trips:", validTrips)
      setTrips(validTrips)

      // Fetch all expenses for budget calculations
      await fetchAllExpenses(signal)
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Fetch trips error:", err.response?.data || err.message)
        setError(err.response?.data?.error || "Failed to fetch trips. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  // Separate function to fetch all expenses
  const fetchAllExpenses = async (signal) => {
    try {
      console.log("Fetching all expenses data...")
      const expensesResponse = await axios.get("http://localhost:5000/trips/all-expenses", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal,
      })

      console.log("Raw expenses data:", expensesResponse.data)

      const validExpenses = {}
      Object.entries(expensesResponse.data).forEach(([tripId, expenses]) => {
        // Only include expenses for valid trip IDs
        if (/^[0-9a-fA-F]{24}$/.test(tripId)) {
          validExpenses[tripId] = expenses.filter(
            (expense) => expense && typeof expense.amount === "number" && !isNaN(expense.amount),
          )
        } else {
          console.warn("Found expenses with invalid tripId:", tripId)
        }
      })

      console.log("Filtered valid expenses:", validExpenses)
      setAllExpenses(validExpenses)
    } catch (expErr) {
      console.error("Fetch expenses error:", expErr.response?.data || expErr.message)
      // Continue with the trips even if expenses fail
    }
  }

  // Improve the handleViewTrip function with better error handling
  const handleViewTrip = async (trip) => {
    if (!trip) {
      setError("Invalid trip data: Trip is undefined")
      return
    }

    if (!trip._id) {
      setError("Invalid trip data: Missing trip ID")
      return
    }

    // Validate the trip ID format before making the API call
    if (!/^[0-9a-fA-F]{24}$/.test(trip._id)) {
      console.error("Invalid ObjectId format:", trip._id)
      setError(`Invalid trip ID format: ${trip._id}. The ID must be a valid MongoDB ObjectId.`)
      return
    }

    setSelectedTrip(trip)
    setShowTripDetails(true)
    setLoadingExpenses(true)
    setError(null) // Clear any previous errors

    try {
      console.log("Fetching expenses for trip ID:", trip._id)
      const response = await axios.get(`http://localhost:5000/trips/${trip._id}/expenses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })

      console.log("Trip expenses response:", response.data)

      const validExpenses = response.data.filter(
        (expense) => expense && typeof expense.amount === "number" && !isNaN(expense.amount),
      )
      setTripExpenses(validExpenses)
    } catch (err) {
      console.error("Fetch trip expenses error:", err.response?.data || err.message)
      if (err.response?.status === 400 && err.response?.data?.error?.includes("Invalid trip ID format")) {
        setError(`Invalid trip ID format: ${trip._id}. Please refresh the page to reload trip data.`)
      } else {
        setError(err.response?.data?.error || "Failed to fetch trip expenses.")
      }
    } finally {
      setLoadingExpenses(false)
    }
  }

  // Improve the handleDeleteTrip function with better validation
  const handleDeleteTrip = async (tripId) => {
    if (!tripId || !/^[0-9a-fA-F]{24}$/.test(tripId)) {
      setError(`Invalid trip ID format: ${tripId}. Cannot delete this trip.`)
      return
    }

    if (window.confirm("Are you sure you want to delete this trip?")) {
      try {
        console.log("Deleting trip ID:", tripId)
        await axios.delete(`http://localhost:5000/trips/${tripId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })
        setTrips(trips.filter((trip) => trip._id !== tripId))
      } catch (err) {
        console.error("Delete trip error:", err.response?.data || err.message)
        setError(err.response?.data?.error || "Failed to delete trip. Please try again.")
      }
    }
  }

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm("Are you sure you want to delete this expense?")) {
      try {
        await axios.delete(`http://localhost:5000/expenses/${expenseId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })

        setTripExpenses(tripExpenses.filter((expense) => expense._id !== expenseId))

        const updatedAllExpenses = { ...allExpenses }
        for (const tripId in updatedAllExpenses) {
          updatedAllExpenses[tripId] = updatedAllExpenses[tripId].filter((expense) => expense._id !== expenseId)
        }
        setAllExpenses(updatedAllExpenses)
      } catch (err) {
        console.error("Delete expense error:", err.response?.data || err.message)
        setError(err.response?.data?.error || "Failed to delete expense. Please try again.")
      }
    }
  }

  // Improve the handleEditTrip function with validation
  const handleEditTrip = (trip) => {
    if (!trip || !trip._id || !/^[0-9a-fA-F]{24}$/.test(trip._id)) {
      setError(`Invalid trip ID format. Cannot edit this trip.`)
      return
    }

    setEditTripData({
      destination: trip.destination || "",
      purpose: trip.purpose || "",
      startDate: trip.startDate ? trip.startDate.split("T")[0] : "",
      endDate: trip.endDate ? trip.endDate.split("T")[0] : "",
      budget: trip.budget || 0,
      _id: trip._id,
    })
    setShowEditModal(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()

    try {
      const response = await axios.put(`http://localhost:5000/trips/${editTripData._id}`, editTripData, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setTrips((prevTrips) => prevTrips.map((trip) => (trip._id === response.data._id ? response.data : trip)))
      setShowEditModal(false)
    } catch (err) {
      console.error("Edit trip error:", err.response?.data || err.message)
      setError(err.response?.data?.error || "Failed to edit trip. Please try again.")
    }
  }

  // Improve the handleViewCollaborators function with better validation
  const handleViewCollaborators = async (trip) => {
    if (!trip) {
      setError("Invalid trip data: Trip is undefined")
      return
    }

    if (!trip._id) {
      setError("Invalid trip data: Missing trip ID")
      return
    }

    if (!/^[0-9a-fA-F]{24}$/.test(trip._id)) {
      console.error("Invalid ObjectId format for collaborators:", trip._id)
      setError(`Invalid trip ID format: ${trip._id}. The ID must be a valid MongoDB ObjectId.`)
      return
    }

    setSelectedTrip(trip)
    setShowCollaboratorsModal(true)
    setCollaboratorActionStatus({ loading: true, error: null, success: null })

    try {
      console.log("Fetching collaborators for trip ID:", trip._id)
      const response = await axios.get(`http://localhost:5000/acceptance/${trip._id}/collaborators`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setCollaborators(response.data)

      // If user is the trip owner, also fetch pending collaboration expenses
      if (isOwner(trip)) {
        try {
          console.log("Fetching pending collaboration expenses for trip ID:", trip._id)
          const pendingExpensesResponse = await axios.get(
            `http://localhost:5000/expenses/pending-collaboration/${trip._id}`,
            {
              headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
            },
          )
          console.log("Pending collaboration expenses:", pendingExpensesResponse.data)
          setPendingCollaborationExpenses(pendingExpensesResponse.data || [])
        } catch (expErr) {
          console.error("Fetch pending expenses error:", expErr)
        }
      }

      setCollaboratorActionStatus({ loading: false, error: null, success: null })
    } catch (err) {
      console.error("Fetch collaborators error:", err.response?.data || err.message)
      setCollaboratorActionStatus({
        loading: false,
        error: err.response?.data?.error || "Failed to fetch collaborators",
        success: null,
      })
    }
  }

  const handleAddCollaborator = async () => {
    if (!newCollaborator.email) {
      setCollaboratorActionStatus({
        loading: false,
        error: "Email is required",
        success: null,
      })
      return
    }

    try {
      setCollaboratorActionStatus({ loading: true, error: null, success: null })

      const response = await axios.post(
        `http://localhost:5000/acceptance/${selectedTrip._id}/invite`,
        newCollaborator,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )

      setCollaborators([...collaborators, response.data.collaborator])
      setNewCollaborator({ email: "", budgetContribution: "" })

      setCollaboratorActionStatus({
        loading: false,
        error: null,
        success: "Collaboration invitation sent successfully",
      })

      setTimeout(() => {
        setCollaboratorActionStatus((prev) => ({ ...prev, success: null }))
      }, 3000)
    } catch (err) {
      console.error("Add collaborator error:", err.response?.data || err.message)
      setCollaboratorActionStatus({
        loading: false,
        error: err.response?.data?.error || "Failed to send collaboration invitation",
        success: null,
      })
    }
  }

  const handleRemoveCollaborator = async (userId) => {
    if (window.confirm("Are you sure you want to remove this collaborator?")) {
      try {
        setCollaboratorActionStatus({ loading: true, error: null, success: null })

        await axios.delete(`http://localhost:5000/acceptance/${selectedTrip._id}/collaborator/${userId}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        })

        setCollaborators(collaborators.filter((collab) => collab.user._id !== userId))

        setCollaboratorActionStatus({
          loading: false,
          error: null,
          success: "Collaborator removed successfully",
        })

        setTimeout(() => {
          setCollaboratorActionStatus((prev) => ({ ...prev, success: null }))
        }, 3000)
      } catch (err) {
        console.error("Remove collaborator error:", err.response?.data || err.message)
        setCollaboratorActionStatus({
          loading: false,
          error: err.response?.data?.error || "Failed to remove collaborator",
          success: null,
        })
      }
    }
  }

  // Handle payment for a collaborator expense
  const handlePayCollaboratorExpense = async (expenseId) => {
    try {
      setCollaboratorActionStatus({ loading: true, error: null, success: null })
      console.log("Processing payment for expense ID:", expenseId)

      await axios.post(
        `http://localhost:5000/expenses/pay-collaboration/${expenseId}`,
        {},
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        },
      )

      // Update the list of pending expenses
      setPendingCollaborationExpenses(pendingCollaborationExpenses.filter((expense) => expense._id !== expenseId))

      setCollaboratorActionStatus({
        loading: false,
        error: null,
        success: "Payment processed successfully",
      })

      // Refresh expenses data to update budget calculations
      fetchAllExpenses()

      setTimeout(() => {
        setCollaboratorActionStatus((prev) => ({ ...prev, success: null }))
      }, 3000)
    } catch (err) {
      console.error("Pay collaborator expense error:", err)
      setCollaboratorActionStatus({
        loading: false,
        error: err.response?.data?.error || "Failed to process payment",
        success: null,
      })
    }
  }

  // Fixed calculateTripProgress function to properly handle expenses
  const calculateTripProgress = (trip) => {
    if (!trip || !trip._id) {
      console.warn("Invalid trip passed to calculateTripProgress:", trip)
      return { totalSpent: 0, percentage: 0, remaining: 0 }
    }

    // Make sure we're using the trip ID as a string for lookup
    const tripId = String(trip._id)
    const expenses = allExpenses[tripId] || []

    console.log(`Calculating progress for trip ${tripId}:`, {
      allExpensesKeys: Object.keys(allExpenses),
      hasExpenses: expenses.length > 0,
      budget: trip.budget,
      expenses: expenses,
    })

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => {
      const amount = expense && typeof expense.amount === "number" ? expense.amount : 0
      return sum + amount
    }, 0)

    // Calculate percentage and remaining budget
    const budget = typeof trip.budget === "number" ? trip.budget : 0
    const percentage = budget > 0 ? (totalExpenses / budget) * 100 : 0
    const remaining = Math.max(budget - totalExpenses, 0)

    return {
      totalSpent: totalExpenses,
      percentage: Math.min(percentage, 100),
      remaining: remaining,
    }
  }

  const formatDateRange = (startDate, endDate) => {
    const start = new Date(startDate)
    const end = new Date(endDate)
    return `${start.toLocaleDateString()} - ${end.toLocaleDateString()}`
  }

  const getTripStatus = (trip) => {
    const now = new Date()
    const startDate = new Date(trip.startDate)
    const endDate = new Date(trip.endDate)

    if (now < startDate) return { status: "Upcoming", color: "bg-yellow-500" }
    if (now > endDate) return { status: "Completed", color: "bg-green-500" }
    return { status: "In Progress", color: "bg-blue-500" }
  }

  const isOwner = (trip) => {
    if (!trip || !user) return false
    const tripUserId = typeof trip.userId === "object" ? trip.userId._id : trip.userId
    const currentUserId = user.id || user._id
    return String(tripUserId) === String(currentUserId)
  }

  const refreshData = () => {
    fetchTrips()
  }

  // Fixed handleRefreshPage to use fetchTrips instead of reloading the page
  const handleRefreshPage = () => {
    setLoading(true)
    setError(null)
    fetchTrips()
  }

  // Add a function to check if a string is a valid MongoDB ObjectId
  const isValidMongoId = (id) => {
    return id && /^[0-9a-fA-F]{24}$/.test(id)
  }

  // Add a refresh function that clears errors and reloads data
  const handleClearErrorAndRefresh = () => {
    setError(null)
    fetchTrips()
  }

  if (loading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64">
        <Loader2 className="h-12 w-12 text-purple-500 animate-spin mb-4" />
        <p className="text-white text-lg">Loading your trips...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-900/50 border border-red-700 text-red-300 p-4 rounded-lg mb-4 flex items-center">
          <AlertCircle className="h-6 w-6 mr-3 flex-shrink-0" />
          <div>
            <p className="font-medium">{error}</p>
            <p className="mt-1 text-sm">
              Please try refreshing the page or check your connection. If the problem persists, contact support.
            </p>
          </div>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={handleRefreshPage}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 transition-colors flex items-center"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </button>
        </div>
      </div>
    )
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
          Your Trips
        </motion.h1>
        <div className="flex space-x-3">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={refreshData}
            className="bg-purple-600 text-white p-2 rounded-full hover:bg-purple-700 transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/collaboration-requests")}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center shadow-lg"
            title="Collaboration Requests"
          >
            <Users className="h-5 w-5 mr-2" /> Collaboration Requests
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/")}
            className="bg-gradient-to-r from-red-600 to-red-800 text-white px-4 py-2 rounded-lg hover:from-red-700 hover:to-red-900 transition-colors flex items-center shadow-lg"
          >
            <PlusCircle className="h-5 w-5 mr-2" /> New Trip
          </motion.button>
        </div>
      </div>

      {console.log("Rendering trips with allExpenses keys:", Object.keys(allExpenses))}
      {trips.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="bg-gray-800 p-8 rounded-lg border border-gray-700 text-center"
        >
          <div className="flex flex-col items-center justify-center">
            <Plane className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl text-white font-medium mb-2">No trips found</h3>
            <p className="text-gray-400 mb-6">Create your first trip to start tracking your travel expenses</p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="bg-gradient-to-r from-red-600 to-red-800 text-white px-6 py-3 rounded-lg hover:from-red-700 hover:to-red-900 transition-colors flex items-center shadow-lg"
            >
              <PlusCircle className="h-5 w-5 mr-2" /> Create Your First Trip
            </motion.button>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {trips.map((trip) => {
            console.log("Rendering trip:", trip._id, "Has expenses key:", Object.prototype.hasOwnProperty.call(allExpenses, trip._id));
            const { status, color } = getTripStatus(trip);
            const { totalSpent, percentage, remaining } = calculateTripProgress(trip);
            const tripOwner = isOwner(trip);

            return (
              <motion.div
                key={trip._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                whileHover={{ y: -5, boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.3)" }}
                className="bg-gray-800 p-6 rounded-lg border border-gray-700 transition-all duration-300 shadow-md"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl text-white font-medium">{trip.destination}</h2>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs px-2 py-1 rounded-full ${color} text-white font-medium`}>{status}</span>
                  {!tripOwner && (
                    <span className="text-xs px-2 py-1 rounded-full bg-purple-600 text-white font-semibold">
                      Collaborative
                    </span>
                  )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center text-gray-300">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{trip.purpose}</span>
                  </div>
                  <div className="flex items-center text-gray-300">
                    <DollarSign className="h-4 w-4 mr-2 text-gray-400" />
                    <span>
                      Budget: <span className="text-white font-medium">€{trip.budget.toFixed(2)}</span>
                    </span>
                  </div>
                  {trip.collaborators && trip.collaborators.length > 0 && (
                    <div className="flex items-center text-gray-300">
                      <Users className="h-4 w-4 mr-2 text-purple-400" />
                      <span>{trip.collaborators.length} collaborator(s)</span>
                    </div>
                  )}
                </div>

                {/* <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-gray-400 text-sm">Budget Usage:</p>
                    <p className="text-white text-sm font-medium">{percentage.toFixed(1)}%</p>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2.5">
                    <div
                      className={`h-2.5 rounded-full ${
                        percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-yellow-500" : "bg-green-500"
                      }`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-400">
                      Spent: <span className="text-white">€{totalSpent.toFixed(2)}</span>
                    </span>
                    <span className="text-gray-400">
                      Left: <span className="text-white">€{remaining.toFixed(2)}</span>
                    </span>
                  </div>
                </div> */}

                {percentage > 90 && (
                  <div className="flex items-center text-red-500 text-sm mb-4 bg-red-900/20 p-2 rounded-md">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>Budget limit reached!</span>
                  </div>
                )}

                <div className="flex justify-between mt-4">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleViewTrip(trip)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                  >
                    <Info className="h-4 w-4 mr-2" /> Details
                  </motion.button>
                  <div className="flex space-x-2">
                    {tripOwner && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleViewCollaborators(trip)}
                        className="text-purple-400 hover:text-purple-300 p-2 bg-purple-900/30 rounded-full"
                        title="Manage Collaborators"
                      >
                        <Users className="h-5 w-5" />
                      </motion.button>
                    )}
                    {tripOwner && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleEditTrip(trip)}
                        className="text-yellow-400 hover:text-yellow-300 p-2 bg-yellow-900/30 rounded-full"
                        title="Edit Trip"
                      >
                        <Edit3 className="h-5 w-5" />
                      </motion.button>
                    )}
                    {tripOwner && (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => handleDeleteTrip(trip._id)}
                        className="text-red-400 hover:text-red-300 p-2 bg-red-900/30 rounded-full"
                        title="Delete Trip"
                      >
                        <Trash className="h-5 w-5" />
                      </motion.button>
                    )}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Edit Trip Modal */}
      <AnimatePresence>
        {showEditModal && editTripData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg max-w-lg w-full p-6 border border-gray-700 shadow-xl"
            >
              <h2 className="text-xl text-white font-bold mb-4">Edit Trip</h2>
              <form onSubmit={handleEditSubmit}>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-medium">Destination</label>
                  <input
                    type="text"
                    value={editTripData.destination}
                    onChange={(e) => setEditTripData({ ...editTripData, destination: e.target.value })}
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-medium">Purpose</label>
                  <input
                    type="text"
                    value={editTripData.purpose}
                    onChange={(e) => setEditTripData({ ...editTripData, purpose: e.target.value })}
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-medium">Start Date</label>
                  <input
                    type="date"
                    value={editTripData.startDate}
                    onChange={(e) => setEditTripData({ ...editTripData, startDate: e.target.value })}
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-medium">End Date</label>
                  <input
                    type="date"
                    value={editTripData.endDate}
                    onChange={(e) => setEditTripData({ ...editTripData, endDate: e.target.value })}
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    required
                  />
                </div>
                <div className="mb-4">
                  <label className="block text-gray-300 mb-2 font-medium">Budget (€)</label>
                  <input
                    type="number"
                    value={editTripData.budget}
                    onChange={(e) => setEditTripData({ ...editTripData, budget: Number(e.target.value) })}
                    className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
                    required
                    step="0.01"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collaborators Modal */}
      <AnimatePresence>
        {showCollaboratorsModal && selectedTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg max-w-lg w-full p-6 border border-gray-700 shadow-xl"
            >
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white font-bold">Manage Collaborators</h2>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setShowCollaboratorsModal(false)}
                  className="text-gray-400 hover:text-white p-1"
                >
                  <X className="h-6 w-6" />
                </motion.button>
              </div>

              {collaboratorActionStatus.error && (
                <div className="bg-red-900/50 border border-red-700 text-red-300 p-3 rounded-md mb-4 flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
                  <p>{collaboratorActionStatus.error}</p>
                </div>
              )}

              {collaboratorActionStatus.success && (
                <div className="bg-green-900/50 border border-green-700 text-green-300 p-3 rounded-md mb-4 flex items-center">
                  <div className="mr-3 flex-shrink-0">✓</div>
                  <p>{collaboratorActionStatus.success}</p>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg text-white font-medium mb-3">Add New Collaborator</h3>
                <div className="flex items-end space-x-2">
                  <div className="flex-1">
                    <label className="block text-gray-300 mb-1 text-sm">Email</label>
                    <input
                      type="email"
                      value={newCollaborator.email}
                      onChange={(e) => setNewCollaborator({ ...newCollaborator, email: e.target.value })}
                      className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                      placeholder="user@example.com"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-gray-300 mb-1 text-sm">Budget (€)</label>
                    <input
                      type="number"
                      value={newCollaborator.budgetContribution}
                      onChange={(e) => setNewCollaborator({ ...newCollaborator, budgetContribution: e.target.value })}
                      className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-purple-500 focus:ring-2 focus:ring-purple-500 focus:outline-none transition-colors"
                      placeholder="0.00"
                      step="0.01"
                    />
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddCollaborator}
                    disabled={collaboratorActionStatus.loading}
                    className="bg-purple-600 text-white p-3 rounded-lg hover:bg-purple-700 transition-colors h-12 w-12 flex items-center justify-center"
                  >
                    {collaboratorActionStatus.loading ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <UserPlus className="h-5 w-5" />
                    )}
                  </motion.button>
                </div>
              </div>

              <div>
                <h3 className="text-lg text-white font-medium mb-3">Current Collaborators</h3>
                {collaboratorActionStatus.loading && collaborators.length === 0 ? (
                  <div className="flex items-center justify-center p-6">
                    <Loader2 className="h-8 w-8 text-purple-500 animate-spin" />
                  </div>
                ) : collaborators.length === 0 ? (
                  <div className="bg-gray-900 p-4 rounded-lg text-center">
                    <p className="text-gray-400">No collaborators yet</p>
                    <p className="text-gray-500 text-sm mt-1">Invite someone to collaborate on this trip</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {collaborators.map((collaborator) => (
                      <motion.div
                        key={collaborator.user?._id || collaborator.user}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700"
                      >
                        <div>
                          <p className="text-white font-medium">{collaborator.user?.email || "Unknown"}</p>
                          <div className="flex space-x-4 text-sm text-gray-400 mt-1">
                            <span>€{(collaborator.budgetContribution || 0).toFixed(2)}</span>
                            <span
                              className={`${
                                collaborator.status === "accepted"
                                  ? "text-green-400 font-semibold"
                                  : collaborator.status === "declined"
                                    ? "text-red-400 font-semibold"
                                    : "text-yellow-400 font-semibold"
                              }`}
                            >
                              {collaborator.status.charAt(0).toUpperCase() + collaborator.status.slice(1)}
                            </span>
                            {collaborator.hasPaid && (
                              <span className="text-green-400 font-semibold ml-2">Paid</span>
                            )}
                          </div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => handleRemoveCollaborator(collaborator.user?._id || collaborator.user)}
                          className="text-red-400 hover:text-red-300 p-2"
                        >
                          <Trash className="h-5 w-5" />
                        </motion.button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Expenses from Collaborators */}
              {isOwner(selectedTrip) && pendingCollaborationExpenses.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg text-white font-medium mb-3">Pending Expenses from Collaborators</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                    {pendingCollaborationExpenses.map((expense) => (
                      <motion.div
                        key={expense._id}
                        initial={{ opacity: 0, y: 10  }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex justify-between items-center bg-gray-900 p-3 rounded-lg border border-gray-700"
                      >
                        <div>
                          <p className="text-white font-medium">{expense.description}</p>
                          <div className="flex space-x-4 text-sm text-gray-400 mt-1">
                            <span>€{expense.amount.toFixed(2)}</span>
                            <span>From: {expense.userEmail || "Collaborator"}</span>
                            <span>{new Date(expense.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => handlePayCollaboratorExpense(expense._id)}
                          className="bg-green-600 text-white px-3 py-1 rounded-md hover:bg-green-700 transition-colors flex items-center"
                        >
                          <DollarSign className="h-4 w-4 mr-1" /> Pay
                        </button>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end mt-6">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowCollaboratorsModal(false)}
                  className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Close
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Trip Details Modal */}
      <AnimatePresence>
        {showTripDetails && selectedTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto border border-gray-700 shadow-xl"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl text-white font-bold">Trip Details</h2>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setShowTripDetails(false)}
                    className="text-gray-400 hover:text-white p-1"
                  >
                    <X className="h-6 w-6" />
                  </motion.button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg text-white font-medium mb-4">{selectedTrip.destination}</h3>

                    <div className="space-y-3">
                      <div>
                        <p className="text-gray-400 text-sm">Purpose:</p>
                        <p className="text-white">{selectedTrip.purpose}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Date Range:</p>
                        <p className="text-white">{formatDateRange(selectedTrip.startDate, selectedTrip.endDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400 text-sm">Budget:</p>
                        <p className="text-white font-medium">€{selectedTrip.budget.toFixed(2)}</p>
                      </div>
                      {selectedTrip.notes && (
                        <div>
                          <p className="text-gray-400 text-sm">Notes:</p>
                          <p className="text-white">{selectedTrip.notes}</p>
                        </div>
                      )}

                      {selectedTrip.collaborators && selectedTrip.collaborators.length > 0 && (
                        <div>
                          <p className="text-gray-400 text-sm">Collaborators:</p>
                          <div className="space-y-1 mt-1">
                            {selectedTrip.collaborators
                              .filter((c) => c.status === "accepted")
                              .map((collaborator) => (
                                <div key={collaborator.user?._id || collaborator.user} className="text-sm">
                                  <p className="text-white">
                                    {collaborator.user?.email || collaborator.user}
                                    <span className="text-gray-400 ml-2">
                                      (€{(collaborator.budgetContribution || 0).toFixed(2)})
                                    </span>
                                    {collaborator.hasPaid && <span className="text-green-400 ml-2">(Paid)</span>}
                                  </p>
                                </div>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                    <h3 className="text-lg text-white font-medium mb-4">Budget Tracking</h3>

                    {loadingExpenses ? (
                      <div className="flex items-center justify-center p-6">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                      </div>
                    ) : (
                      (() => {
                        // Calculate trip progress directly here to ensure it's using the latest data
                        const tripId = selectedTrip._id.toString()
                        const expenses = tripExpenses || []
                        const totalSpent = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0)
                        const budget = typeof selectedTrip.budget === "number" ? selectedTrip.budget : 0
                        const percentage = budget > 0 ? (totalSpent / budget) * 100 : 0
                        const remaining = Math.max(budget - totalSpent, 0)

                        console.log("Trip details budget calculation:", {
                          tripId,
                          expenses: expenses.length,
                          totalSpent,
                          budget,
                          percentage,
                          remaining,
                        })

                        return (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="bg-gray-800 p-3 rounded-lg">
                                <p className="text-gray-400 text-sm">Total Spent:</p>
                                <p className="text-white text-xl font-medium">€{totalSpent.toFixed(2)}</p>
                              </div>
                              <div className="bg-gray-800 p-3 rounded-lg">
                                <p className="text-gray-400 text-sm">Remaining:</p>
                                <p className="text-white text-xl font-medium">€{remaining.toFixed(2)}</p>
                              </div>
                            </div>
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <p className="text-gray-400 text-sm">Budget Usage:</p>
                                <p className="text-white text-sm font-medium">{percentage.toFixed(1)}%</p>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-3">
                                <div
                                  className={`h-3 rounded-full ${
                                    percentage > 90 ? "bg-red-500" : percentage > 70 ? "bg-yellow-500" : "bg-green-500"
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                ></div>
                              </div>
                            </div>

                            {percentage > 90 && (
                              <div className="bg-red-900/30 p-3 rounded-lg border border-red-800 text-red-300 flex items-start">
                                <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium">Budget Alert</p>
                                  <p className="text-sm mt-1">
                                    You've exceeded your budget limit. Consider adjusting your spending or increasing
                                    your budget.
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })()
                    )}
                  </div>
                </div>

                <div className="bg-gray-900 p-4 rounded-lg border border-gray-700">
                  <h3 className="text-lg text-white font-medium mb-4">Trip Expenses</h3>

                  {loadingExpenses ? (
                    <div className="flex items-center justify-center p-6">
                      <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                    </div>
                  ) : tripExpenses.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-gray-300 mb-2">No expenses recorded for this trip yet.</p>
                      <button
                        onClick={() => {
                          setShowTripDetails(false)
                          navigate("/")
                        }}
                        className="text-blue-400 hover:text-blue-300 flex items-center mx-auto"
                      >
                        <PlusCircle className="h-4 w-4 mr-2" /> Add your first expense
                      </button>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="text-left text-gray-400 border-b border-gray-700">
                            <th className="pb-2 pr-4">Category</th>
                            <th className="pb-2 pr-4">Description</th>
                            <th className="pb-2 pr-4">Date</th>
                            <th className="pb-2 pr-4 text-right">Amount</th>
                            <th className="pb-2 pr-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tripExpenses.map((expense) => (
                            <tr key={expense._id} className="border-b border-gray-700 hover:bg-gray-800">
                              <td className="py-3 pr-4">{expense.category}</td>
                              <td className="py-3 pr-4">{expense.description || "N/A"}</td>
                              <td className="py-3 pr-4">{new Date(expense.date).toLocaleDateString()}</td>
                              <td className="py-3 pr-4 text-right font-medium">€{expense.amount.toFixed(2)}</td>
                              <td className="py-3 pr-4 text-right">
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={() => handleDeleteExpense(expense._id)}
                                  className="text-red-400 hover:text-red-300 p-1"
                                >
                                  <Trash className="h-4 w-4" />
                                </motion.button>
                              </td>
                            </tr>
                          ))}
                          <tr className="font-medium text-white bg-gray-800">
                            <td colSpan="3" className="py-3 text-right">
                              Total:
                            </td>
                            <td className="py-3 text-right">
                              €{tripExpenses.reduce((sum, expense) => sum + (expense.amount || 0), 0).toFixed(2)}
                            </td>
                            <td></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-6">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setShowTripDetails(false)}
                    className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center"
                  >
                    <X className="h-4 w-4 mr-2" /> Close
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Trips
