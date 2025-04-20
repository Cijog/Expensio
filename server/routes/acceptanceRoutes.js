import express from "express"
import Trip from "../models/Trip.js"
import User from "../models/User.js"
import { authenticateToken } from "../middleware/auth.js"
import mongoose from "mongoose"

const router = express.Router()

// Get all collaboration requests for the current user
router.get("/requests", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Find all trips where the current user is a collaborator with pending status
    const pendingCollaborations = await Trip.find({
      "collaborators.user": new mongoose.Types.ObjectId(req.user.id),
      "collaborators.status": "pending",
    }).populate("userId", "username email")

    res.status(200).json(pendingCollaborations)
  } catch (err) {
    console.error("Get collaboration requests error:", err)
    res.status(500).json({ error: "Failed to fetch collaboration requests" })
  }
})

// Send a collaboration request
router.post("/:tripId/invite", authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params
    const { email, budgetContribution } = req.body

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate ObjectId with more detailed error
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      console.error(`Invalid ObjectId format received: ${tripId}`)
      return res.status(400).json({ error: "Invalid trip ID format. The ID must be a valid MongoDB ObjectId." })
    }

    // Find the trip
    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner
    if (trip.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can send collaboration invites" })
    }

    // Find the user by email
    const collaborator = await User.findOne({ email })
    if (!collaborator) {
      return res.status(404).json({ error: "User not found with this email" })
    }

    // Check if the user is trying to invite themselves
    if (collaborator._id.toString() === req.user.id) {
      return res.status(400).json({ error: "You cannot collaborate with yourself" })
    }

    // Check if the user is already a collaborator
    const existingCollaborator = trip.collaborators.find(
      (collab) => collab.user && collab.user.toString() === collaborator._id.toString(),
    )

    if (existingCollaborator) {
      return res.status(400).json({
        error: `User is already a collaborator with status: ${existingCollaborator.status}`,
      })
    }

    // Add the collaboration request
    trip.collaborators.push({
      user: collaborator._id,
      budgetContribution: Number(budgetContribution) || 0,
      status: "pending",
    })

    await trip.save()
    res.status(200).json({
      message: "Collaboration invitation sent",
      collaborator: {
        user: {
          _id: collaborator._id,
          email: collaborator.email,
          username: collaborator.username,
        },
        budgetContribution: Number(budgetContribution) || 0,
        status: "pending",
      },
    })
  } catch (err) {
    console.error("Collaboration invitation error:", err)
    res.status(500).json({ error: "Failed to send collaboration invitation" })
  }
})

// Accept or decline a collaboration request
router.patch("/:tripId/respond", authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params
    const { status } = req.body

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    if (status !== "accepted" && status !== "declined") {
      return res.status(400).json({ error: "Invalid status. Must be 'accepted' or 'declined'" })
    }

    // Find the trip
    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Find the collaboration request for the current user
    const collaboratorIndex = trip.collaborators.findIndex(
      (collab) => collab.user && collab.user.toString() === req.user.id,
    )

    if (collaboratorIndex === -1) {
      return res.status(404).json({ error: "No collaboration request found for this user" })
    }

    // Update the status
    trip.collaborators[collaboratorIndex].status = status
    await trip.save()

    res.status(200).json({
      message: `Collaboration request ${status}`,
      tripId: trip._id,
      status,
    })
  } catch (err) {
    console.error("Collaboration response error:", err)
    res.status(500).json({ error: "Failed to respond to collaboration request" })
  }
})

// Remove a collaborator (can be done by trip owner)
router.delete("/:tripId/collaborator/:userId", authenticateToken, async (req, res) => {
  try {
    const { tripId, userId } = req.params

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Find the trip
    const trip = await Trip.findById(tripId)
    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner
    if (trip.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "Only the trip owner can remove collaborators" })
    }

    // Find the collaborator
    const collaboratorIndex = trip.collaborators.findIndex((collab) => collab.user && collab.user.toString() === userId)

    if (collaboratorIndex === -1) {
      return res.status(404).json({ error: "Collaborator not found" })
    }

    // Remove the collaborator
    trip.collaborators.splice(collaboratorIndex, 1)
    await trip.save()

    res.status(200).json({ message: "Collaborator removed successfully" })
  } catch (err) {
    console.error("Remove collaborator error:", err)
    res.status(500).json({ error: "Failed to remove collaborator" })
  }
})

// Get all collaborators for a trip
router.get("/:tripId/collaborators", authenticateToken, async (req, res) => {
  try {
    const { tripId } = req.params

    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Validate ObjectId with more detailed error
    if (!mongoose.Types.ObjectId.isValid(tripId)) {
      console.error(`Invalid ObjectId format received: ${tripId}`)
      return res.status(400).json({ error: "Invalid trip ID format. The ID must be a valid MongoDB ObjectId." })
    }

    // Find the trip
    const trip = await Trip.findById(tripId).populate("collaborators.user", "username email")

    if (!trip) {
      return res.status(404).json({ error: "Trip not found" })
    }

    // Verify the current user is the trip owner or a collaborator
    const isOwner = trip.userId.toString() === req.user.id
    const isCollaborator = trip.collaborators.some(
      (collab) => collab.user && collab.user._id.toString() === req.user.id && collab.status === "accepted",
    )

    if (!isOwner && !isCollaborator) {
      return res.status(403).json({ error: "You don't have permission to view this trip's collaborators" })
    }

    res.status(200).json(trip.collaborators)
  } catch (err) {
    console.error("Get collaborators error:", err)
    res.status(500).json({ error: "Failed to fetch collaborators" })
  }
})

export default router
