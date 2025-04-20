import express from "express"
import Trip from "../models/Trip.js"
import Expense from "../models/Expense.js"
import User from "../models/User.js"
import { authenticateToken } from "../middleware/auth.js"
import mongoose from "mongoose"

const router = express.Router()

// Improve the helper function to safely validate MongoDB ObjectIds
function isValidObjectId(id) {
  if (!id) {
    console.error("Received null or undefined ObjectId")
    return false
  }

  if (typeof id !== "string") {
    try {
      id = String(id)
    } catch (err) {
      console.error(`Error converting ObjectId to string: ${err.message}`)
      return false
    }
  }

  try {
    return mongoose.Types.ObjectId.isValid(id) && /^[0-9a-fA-F]{24}$/.test(id)
  } catch (err) {
    console.error(`Error validating ObjectId: ${err.message}`)
    return false
  }
}

// Get all trips for the authenticated user (including collaborations)
router.get("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate user ID
    if (!isValidObjectId(req.user.id)) {
      console.error(`Invalid user ID format: ${req.user.id}`)
      return res.status(400).json({ error: "Invalid user ID format" })
    }

    console.log("Fetching trips for user:", req.user.id)

    // Find trips where user is the owner
    const ownedTrips = await Trip.find({ userId: req.user.id })

    // Find trips where user is a collaborator with accepted status
    const collaborativeTrips = await Trip.find({
      "collaborators.user": new mongoose.Types.ObjectId(req.user.id),
      "collaborators.status": "accepted",
    }).populate("userId", "username email")

    // Combine and sort by start date
    const allTrips = [...ownedTrips, ...collaborativeTrips].sort(
      (a, b) => new Date(b.startDate) - new Date(a.startDate),
    )

    console.log(
      `Found ${allTrips.length} trips (${ownedTrips.length} owned, ${collaborativeTrips.length} collaborative)`,
    )

    // Validate trip IDs before sending response
    const validatedTrips = allTrips
      .map((trip) => {
        // Convert Mongoose document to plain object
        const plainTrip = trip.toObject ? trip.toObject() : trip

        // Ensure _id is a string
        if (plainTrip._id) {
          plainTrip._id = plainTrip._id.toString()
        }

        return plainTrip
      })
      .filter((trip) => trip._id && isValidObjectId(trip._id))

    res.json(validatedTrips)
  } catch (err) {
    console.error("Get trips error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get active trips (trips with end date in the future)
router.get("/active", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const now = new Date()

    // Find active trips where user is the owner
    const ownedActiveTrips = await Trip.find({
      userId: req.user.id,
      endDate: { $gte: now },
    })

    // Find active trips where user is a collaborator with accepted status
    const collaborativeActiveTrips = await Trip.find({
      "collaborators.user": new mongoose.Types.ObjectId(req.user.id),
      "collaborators.status": "accepted",
      endDate: { $gte: now },
    }).populate("userId", "username email")

    // Combine and sort by start date
    const allActiveTrips = [...ownedActiveTrips, ...collaborativeActiveTrips].sort(
      (a, b) => new Date(a.startDate) - new Date(b.startDate),
    )

    res.json(allActiveTrips)
  } catch (err) {
    console.error("Get active trips error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Create a new trip
router.post("/", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const { destination, purpose, startDate, endDate, budget, notes, collaborators } = req.body

    // Validate required fields
    if (!destination || !purpose || !startDate || !endDate) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Validate dates
    const start = new Date(startDate)
    const end = new Date(endDate)

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" })
    }

    if (end < start) {
      return res.status(400).json({ error: "End date cannot be before start date" })
    }

    // Validate budget
    const budgetValue = Number.parseFloat(budget)
    if (isNaN(budgetValue) || budgetValue < 0) {
      return res.status(400).json({ error: "Invalid budget amount" })
    }

    const trip = new Trip({
      destination,
      purpose,
      startDate,
      endDate,
      budget: budgetValue,
      notes,
      userId: req.user.id,
      collaborators: [], // Initialize empty collaborators array
    })

    await trip.save()
    res.status(201).json(trip)
  } catch (err) {
    console.error("Create trip error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Get trip by ID
router.get("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate ObjectId with more detailed error
    if (!req.params.id || !isValidObjectId(req.params.id)) {
      console.error(`Invalid ObjectId format received: ${req.params.id}`)
      return res.status(400).json({ error: "Invalid trip ID format. The ID must be a valid MongoDB ObjectId." })
    }

    const trip = await Trip.findById(req.params.id)
      .populate("userId", "username email")
      .populate("collaborators.user", "username email")

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Check if user is the owner or a collaborator with accepted status
    const isOwner = trip.userId._id.toString() === req.user.id
    const isCollaborator = trip.collaborators.some(
      (collab) => collab.user && collab.user._id.toString() === req.user.id && collab.status === "accepted",
    )

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "You don't have permission to view this trip" })
    }

    res.json(trip)
  } catch (err) {
    console.error("Get trip error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Update trip by ID (only owner can update)
router.put("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid trip ID format" })
    }

    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner
    if (trip.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can update trip details" })
    }

    const { destination, purpose, startDate, endDate, budget, notes } = req.body

    // Validate dates if provided
    if (startDate && endDate) {
      const start = new Date(startDate)
      const end = new Date(endDate)

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid date format" })
      }

      if (end < start) {
        return res.status(400).json({ error: "End date cannot be before start date" })
      }
    }

    // Validate budget if provided
    if (budget !== undefined) {
      const budgetValue = Number.parseFloat(budget)
      if (isNaN(budgetValue) || budgetValue < 0) {
        return res.status(400).json({ error: "Invalid budget amount" })
      }
      trip.budget = budgetValue
    }

    if (destination) trip.destination = destination
    if (purpose) trip.purpose = purpose
    if (startDate) trip.startDate = startDate
    if (endDate) trip.endDate = endDate
    if (notes !== undefined) trip.notes = notes

    await trip.save()
    res.json(trip)
  } catch (err) {
    console.error("Update trip error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Delete trip by ID (only owner can delete)
router.delete("/:id", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid trip ID format" })
    }

    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner
    if (trip.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can delete this trip" })
    }

    // Delete all expenses associated with this trip
    await Expense.deleteMany({ tripId: req.params.id })

    // Delete the trip
    await Trip.findByIdAndDelete(req.params.id)
    res.json({ message: "Trip deleted successfully" })
  } catch (err) {
    console.error("Delete trip error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get expenses for a specific trip
router.get("/:id/expenses", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Log the received ID for debugging
    console.log(`Received trip ID for expenses: ${req.params.id}`)

    // Validate ObjectId with more detailed error
    if (!req.params.id) {
      console.error("Missing trip ID parameter")
      return res.status(400).json({ error: "Missing trip ID parameter" })
    }

    if (!isValidObjectId(req.params.id)) {
      console.error(`Invalid ObjectId format received: ${req.params.id}`)
      return res.status(400).json({
        error: "Invalid trip ID format. The ID must be a valid MongoDB ObjectId.",
        details: `Received: ${req.params.id}, Expected format: 24 character hex string`,
      })
    }

    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Check if user is the owner or a collaborator with accepted status
    const isOwner = trip.userId.toString() === req.user.id
    const isCollaborator = trip.collaborators.some(
      (collab) => collab.user && collab.user.toString() === req.user.id && collab.status === "accepted",
    )

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "You don't have permission to view this trip's expenses" })
    }

    const expenses = await Expense.find({ tripId: req.params.id }).sort({ date: -1 })

    // Validate expense data before sending
    const validatedExpenses = expenses.map((expense) => {
      // Convert Mongoose document to plain object
      const plainExpense = expense.toObject ? expense.toObject() : expense

      // Ensure _id is a string
      if (plainExpense._id) {
        plainExpense._id = plainExpense._id.toString()
      }

      return plainExpense
    })

    res.json(validatedExpenses)
  } catch (err) {
    console.error("Get trip expenses error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get all expenses for all trips (grouped by trip ID)
router.get("/all-expenses", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate user ID
    if (!isValidObjectId(req.user.id)) {
      console.error(`Invalid user ID format: ${req.user.id}`)
      return res.status(400).json({ error: "Invalid user ID format" })
    }

    console.log("Fetching all expenses for user:", req.user.id)

    // Find all trips where the user is the owner or a collaborator
    const userTrips = await Trip.find({
      $or: [
        { userId: req.user.id },
        {
          "collaborators.user": new mongoose.Types.ObjectId(req.user.id),
          "collaborators.status": "accepted",
        },
      ],
    })

    // Validate trip IDs before proceeding
    const validTripIds = userTrips.map((trip) => trip._id.toString()).filter((id) => isValidObjectId(id))

    console.log(`Found ${validTripIds.length} valid trip IDs for expenses`)

    // Find all expenses for these trips
    const expenses = await Expense.find({ tripId: { $in: validTripIds } })

    console.log(`Found ${expenses.length} expenses across all trips`)

    // Group expenses by trip ID
    const expensesByTrip = {}
    for (const expense of expenses) {
      const tripId = expense.tripId.toString()
      if (isValidObjectId(tripId)) {
        if (!expensesByTrip[tripId]) {
          expensesByTrip[tripId] = []
        }
        expensesByTrip[tripId].push(expense)
      } else {
        console.warn(`Skipping expense with invalid tripId: ${tripId}`)
      }
    }

    res.json(expensesByTrip)
  } catch (err) {
    console.error("Get all trip expenses error:", err)
    res.status(500).json({ error: err.message })
  }
})

// NEW ROUTES FOR COLLABORATION FEATURES

// Handle collaborator payment
router.post("/acceptance/:id/pay-contribution", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    console.log(`Processing payment for trip: ${req.params.id} by user: ${req.user.id}`)

    // Validate ObjectId
    if (!isValidObjectId(req.params.id)) {
      return res.status(400).json({ error: "Invalid trip ID format" })
    }

    const trip = await Trip.findById(req.params.id)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Find the collaborator entry for the current user
    const collaboratorIndex = trip.collaborators.findIndex(
      (collab) => collab.user.toString() === req.user.id && collab.status === "accepted",
    )

    if (collaboratorIndex === -1) {
      return res.status(403).json({ error: "You are not an accepted collaborator on this trip" })
    }

    console.log(
      `Found collaborator at index ${collaboratorIndex} with contribution: ${trip.collaborators[collaboratorIndex].budgetContribution}`,
    )

    // Update the payment status
    trip.collaborators[collaboratorIndex].hasPaid = true
    trip.collaborators[collaboratorIndex].paymentDate = new Date()

    // Create an expense record for this payment
    const expense = new Expense({
      amount: trip.collaborators[collaboratorIndex].budgetContribution,
      category: "Collaboration Payment",
      description: `Contribution payment from ${req.user.username || "collaborator"}`,
      date: new Date(),
      userId: req.user.id,
      tripId: req.params.id,
      isCollaborationExpense: true,
      isPaid: true,
      paymentDate: new Date(),
    })

    console.log("Created expense record for payment:", expense)

    await expense.save()
    await trip.save()

    res.json({
      message: "Payment recorded successfully",
      collaborator: trip.collaborators[collaboratorIndex],
    })
  } catch (err) {
    console.error("Collaboration payment error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Add a route for collaborators to add expenses for the trip owner
router.post("/expenses/collaboration", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const { tripId, amount, description, category, date, forUserId } = req.body

    console.log("Received collaboration expense data:", {
      tripId,
      amount,
      description,
      category,
      date,
      forUserId,
      userId: req.user.id,
    })

    // Validate required fields
    if (!tripId || !amount || !description) {
      return res.status(400).json({ error: "Missing required fields" })
    }

    // Validate ObjectId
    if (!isValidObjectId(tripId)) {
      return res.status(400).json({ error: "Invalid trip ID format" })
    }

    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Check if user is a collaborator with accepted status
    const isCollaborator = trip.collaborators.some(
      (collab) => collab.user.toString() === req.user.id && collab.status === "accepted",
    )

    if (!isCollaborator) {
      return res.status(403).json({ error: "You are not an accepted collaborator on this trip" })
    }

    // Get user email for reference
    const user = await User.findById(req.user.id)

    // Create the expense record
    const expense = new Expense({
      amount: Number(amount),
      category: category || "Collaboration Expense",
      description,
      date: date || new Date(),
      userId: req.user.id,
      tripId,
      forUserId: trip.userId, // The trip owner needs to pay this expense
      isCollaborationExpense: true,
      isPaid: false,
    })

    console.log("Created collaboration expense:", expense)

    await expense.save()

    res.status(201).json({
      message: "Expense added successfully",
      expense: {
        ...expense.toObject(),
        userEmail: user?.email || "Unknown",
      },
    })
  } catch (err) {
    console.error("Add collaboration expense error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Get pending collaboration expenses for a trip owner
router.get("/expenses/pending-collaboration/:tripId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    console.log(`Fetching pending collaboration expenses for trip: ${req.params.tripId}`)

    // Validate ObjectId
    if (!isValidObjectId(req.params.tripId)) {
      return res.status(400).json({ error: "Invalid trip ID format" })
    }

    const trip = await Trip.findById(req.params.tripId)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner
    if (trip.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can view pending collaboration expenses" })
    }

    // Find all pending collaboration expenses for this trip
    const pendingExpenses = await Expense.find({
      tripId: req.params.tripId,
      forUserId: req.user.id,
      isCollaborationExpense: true,
      isPaid: false,
    }).populate("userId", "email username")

    console.log(`Found ${pendingExpenses.length} pending collaboration expenses`)

    // Format the response with user information
    const formattedExpenses = pendingExpenses.map((expense) => {
      const expenseObj = expense.toObject()
      expenseObj.userEmail = expense.userId?.email || "Unknown"
      expenseObj.username = expense.userId?.username || "Unknown"
      return expenseObj
    })

    res.json(formattedExpenses)
  } catch (err) {
    console.error("Get pending collaboration expenses error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Pay a collaboration expense
router.post("/expenses/pay-collaboration/:expenseId", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    console.log(`Processing payment for expense: ${req.params.expenseId}`)

    // Validate ObjectId
    if (!isValidObjectId(req.params.expenseId)) {
      return res.status(400).json({ error: "Invalid expense ID format" })
    }

    const expense = await Expense.findById(req.params.expenseId)
    if (!expense) {
      return res.status(404).json({ error: "Expense not found" })
    }

    // Verify the current user is the one who needs to pay this expense
    if (expense.forUserId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You are not authorized to pay this expense" })
    }

    // Update the expense as paid
    expense.isPaid = true
    expense.paymentDate = new Date()
    await expense.save()

    console.log("Expense marked as paid:", expense)

    res.json({
      message: "Expense marked as paid successfully",
      expense,
    })
  } catch (err) {
    console.error("Pay collaboration expense error:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router
