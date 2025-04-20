import express from "express"
import User from "../models/User.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Get user profile
router.get("/profile", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const user = await User.findById(req.user.id).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json(user)
  } catch (err) {
    console.error("Get user profile error:", err)
    res.status(500).json({ error: "Failed to fetch user profile" })
  }
})

// Update user profile
router.put("/profile", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const { username, email } = req.body

    // Find user and update
    const user = await User.findById(req.user.id)
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    // Update fields if provided
    if (username) user.username = username
    if (email) user.email = email

    await user.save()

    // Return updated user without password
    const updatedUser = await User.findById(req.user.id).select("-password")
    res.json(updatedUser)
  } catch (err) {
    console.error("Update user profile error:", err)
    res.status(500).json({ error: "Failed to update user profile" })
  }
})

// Get list of users (for collaboration)
router.get("/list", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    // Find all users except the current user
    const users = await User.find({ _id: { $ne: req.user.id } })
      .select("username email")
      .sort("username")

    res.json(users)
  } catch (err) {
    console.error("Get users list error:", err)
    res.status(500).json({ error: "Failed to fetch users list" })
  }
})

// Search users by email or username
router.get("/search", authenticateToken, async (req, res) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Authentication failed. User ID not found." })
    }

    const { query } = req.query
    if (!query) {
      return res.status(400).json({ error: "Search query is required" })
    }

    // Search for users by email or username
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Exclude current user
        {
          $or: [{ email: { $regex: query, $options: "i" } }, { username: { $regex: query, $options: "i" } }],
        },
      ],
    })
      .select("username email")
      .limit(10)

    res.json(users)
  } catch (err) {
    console.error("Search users error:", err)
    res.status(500).json({ error: "Failed to search users" })
  }
})

export default router
