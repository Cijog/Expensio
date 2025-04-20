"use client"

import { useState, useEffect } from "react"
import axios from "axios"
import { Check, X, AlertCircle, DollarSign, PlusCircle } from "lucide-react"

function CollaborationRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [responseStatus, setResponseStatus] = useState({})
  const [showAddExpenseForm, setShowAddExpenseForm] = useState(false)
  const [selectedTrip, setSelectedTrip] = useState(null)
  const [expenseData, setExpenseData] = useState({
    amount: "",
    description: "",
    category: "Collaboration Expense",
    date: new Date().toISOString().split("T")[0],
  })

  useEffect(() => {
    fetchRequests()
  }, [])

  const fetchRequests = async () => {
    try {
      setLoading(true)
      console.log("Fetching collaboration requests...")
      const response = await axios.get("http://localhost:5000/acceptance/requests", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      console.log("Collaboration requests:", response.data)
      setRequests(response.data)
    } catch (err) {
      console.error("Fetch collaboration requests error:", err)
      setError(err.response?.data?.error || "Failed to fetch collaboration requests")
    } finally {
      setLoading(false)
    }
  }

  const handleResponse = async (tripId, status) => {
    try {
      setResponseStatus((prev) => ({ ...prev, [tripId]: "loading" }))

      await axios.patch(
        `http://localhost:5000/acceptance/${tripId}/respond`,
        { status },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )

      setResponseStatus((prev) => ({ ...prev, [tripId]: "success" }))

      // Remove the request from the list after a short delay
      setTimeout(() => {
        setRequests(requests.filter((request) => request._id !== tripId))
        setResponseStatus((prev) => {
          const newStatus = { ...prev }
          delete newStatus[tripId]
          return newStatus
        })
      }, 1500)
    } catch (err) {
      console.error("Collaboration response error:", err)
      setResponseStatus((prev) => ({ ...prev, [tripId]: "error" }))
      setError(err.response?.data?.error || "Failed to respond to collaboration request")
    }
  }

  const handlePayContribution = async (trip) => {
    try {
      setResponseStatus((prev) => ({ ...prev, [trip._id]: "loading" }))
      console.log("Processing payment for trip:", trip._id)

      // Find the user's contribution amount
      const userContribution =
        trip.collaborators.find((collab) => collab.user.toString() === localStorage.getItem("userId"))
          ?.budgetContribution || 0

      console.log("User contribution amount:", userContribution)

      await axios.post(
        `http://localhost:5000/acceptance/${trip._id}/pay-contribution`,
        { amount: userContribution },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )

      setResponseStatus((prev) => ({ ...prev, [trip._id]: "success" }))

      // Refresh the requests after payment
      setTimeout(() => {
        fetchRequests()
      }, 1500)
    } catch (err) {
      console.error("Payment error:", err)
      setResponseStatus((prev) => ({ ...prev, [trip._id]: "error" }))
      setError(err.response?.data?.error || "Failed to process payment")
    }
  }

  const handleAddExpense = (trip) => {
    setSelectedTrip(trip)
    setShowAddExpenseForm(true)
  }

  const handleExpenseInputChange = (e) => {
    const { name, value } = e.target
    setExpenseData((prev) => ({ ...prev, [name]: value }))
  }

  const submitExpense = async (e) => {
    e.preventDefault()

    try {
      setResponseStatus((prev) => ({ ...prev, [selectedTrip._id]: "loading" }))
      console.log("Submitting expense for trip:", selectedTrip._id)
      console.log("Expense data:", expenseData)

      await axios.post(`http://localhost:5000/expenses/collaboration`, expenseData)

      await axios.post(
        `http://localhost:5000/expenses/collaboration`,
        {
          ...expenseData,
          tripId: selectedTrip._id,
          forUserId: selectedTrip.userId._id,
        },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
      )

      setResponseStatus((prev) => ({ ...prev, [selectedTrip._id]: "success" }))
      setShowAddExpenseForm(false)
      setExpenseData({
        amount: "",
        description: "",
        category: "Collaboration Expense",
        date: new Date().toISOString().split("T")[0],
      })

      // Show success message
      setTimeout(() => {
        setResponseStatus((prev) => {
          const newStatus = { ...prev }
          delete newStatus[selectedTrip._id]
          return newStatus
        })
      }, 1500)
    } catch (err) {
      console.error("Add expense error:", err)
      setResponseStatus((prev) => ({ ...prev, [selectedTrip._id]: "error" }))
      setError(err.response?.data?.error || "Failed to add expense")
    }
  }

  if (loading) return <div className="p-4 text-white">Loading collaboration requests...</div>

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900 text-white p-3 rounded-md mb-4 flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {error}
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return <div className="p-4 text-gray-400">No pending collaboration requests</div>
  }

  return (
    <div className="p-4">
      <h2 className="text-lg text-white mb-4">Pending Collaboration Requests</h2>

      {showAddExpenseForm && selectedTrip && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 mb-4">
          <h3 className="text-white font-medium mb-3">Add Expense for {selectedTrip.userId.username} to Pay</h3>
          <form onSubmit={submitExpense} className="space-y-3">
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Amount (€)</label>
              <input
                type="number"
                name="amount"
                value={expenseData.amount}
                onChange={handleExpenseInputChange}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
                required
                step="0.01"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Description</label>
              <input
                type="text"
                name="description"
                value={expenseData.description}
                onChange={handleExpenseInputChange}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
                required
                placeholder="What is this expense for?"
              />
            </div>
            <div>
              <label className="block text-gray-300 mb-1 text-sm">Date</label>
              <input
                type="date"
                name="date"
                value={expenseData.date}
                onChange={handleExpenseInputChange}
                className="w-full p-2 rounded-lg bg-gray-700 text-white border border-gray-600"
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                Submit Expense
              </button>
              <button
                type="button"
                onClick={() => setShowAddExpenseForm(false)}
                className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {requests.map((request) => {
          // Find the user's contribution
          const userContribution =
            request.collaborators.find((collab) => collab.user.toString() === localStorage.getItem("userId"))
              ?.budgetContribution || 0

          // Check if the user has already paid
          const hasPaid =
            request.collaborators.find((collab) => collab.user.toString() === localStorage.getItem("userId"))
              ?.hasPaid || false

          return (
            <div key={request._id} className="bg-gray-800 p-4 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-white font-medium">{request.destination}</h3>
                  <p className="text-gray-400 text-sm">{request.purpose}</p>
                </div>
                <div className="text-sm text-gray-400">
                  {new Date(request.startDate).toLocaleDateString()} - {new Date(request.endDate).toLocaleDateString()}
                </div>
              </div>

              <div className="mb-3">
                <p className="text-gray-300 text-sm">
                  <span className="text-gray-500">From:</span> {request.userId.username} ({request.userId.email})
                </p>

                {request.collaborators.map((collab) => {
                  if (collab.user.toString() === localStorage.getItem("userId")) {
                    return (
                      <p key={collab.user} className="text-gray-300 text-sm">
                        <span className="text-gray-500">Your contribution:</span> €
                        {collab.budgetContribution.toFixed(2)}
                        {collab.hasPaid && <span className="ml-2 text-green-400">(Paid)</span>}
                      </p>
                    )
                  }
                  return null
                })}

                <p className="text-gray-300 text-sm">
                  <span className="text-gray-500">Total budget:</span> €{request.budget.toFixed(2)}
                </p>
              </div>

              {responseStatus[request._id] === "loading" ? (
                <div className="flex justify-center text-blue-400">Processing...</div>
              ) : responseStatus[request._id] === "success" ? (
                <div className="flex justify-center text-green-400">Action completed successfully</div>
              ) : responseStatus[request._id] === "error" ? (
                <div className="flex justify-center text-red-400">Failed to complete action</div>
              ) : (
                <div className="flex flex-col space-y-3">
                  {/* Accept/Decline buttons */}
                  <div className="flex justify-between">
                    <button
                      onClick={() => handleResponse(request._id, "accepted")}
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" /> Accept
                    </button>
                    <button
                      onClick={() => handleResponse(request._id, "declined")}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" /> Decline
                    </button>
                  </div>

                  {/* Pay contribution button - only show if accepted and not paid */}
                  {request.collaborators.some(
                    (collab) =>
                      collab.user.toString() === localStorage.getItem("userId") &&
                      collab.status === "accepted" &&
                      !collab.hasPaid &&
                      collab.budgetContribution > 0,
                  ) && (
                    <button
                      onClick={() => handlePayContribution(request)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                    >
                      <DollarSign className="h-4 w-4 mr-2" /> Pay Your Contribution (€{userContribution.toFixed(2)})
                    </button>
                  )}

                  {/* Add expense button - only show if accepted */}
                  {request.collaborators.some(
                    (collab) =>
                      collab.user.toString() === localStorage.getItem("userId") && collab.status === "accepted",
                  ) && (
                    <button
                      onClick={() => handleAddExpense(request)}
                      className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" /> Add Expense for Trip Owner to Pay
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default CollaborationRequests
