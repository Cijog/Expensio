import express from "express"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import User from "../models/User.js"
import { authenticateToken } from "../middleware/auth.js"

const router = express.Router()

// Signup route
router.post("/signup", async (req, res) => {
  try {
    const { username, password, email, phone } = req.body

    // Check if username or email already exists
    const existingUser = await User.findOne({ username })
    const existingEmail = await User.findOne({ email })

    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" })
    }
    if (existingEmail) {
      return res.status(400).json({ error: "Email already exists" })
    }

    // Hash password and create user
    const hashedPassword = await bcrypt.hash(password, 10)
    const user = new User({
      username,
      password: hashedPassword,
      email,
      phone,
    })
    await user.save()

    res.status(201).json({ message: "User created successfully" })
  } catch (err) {
    console.error("Signup error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Login route
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body

    // Find user by username
    const user = await User.findOne({ username })
    if (!user) {
      return res.status(401).json({ error: "Invalid username or password" })
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid username or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ id: user._id, username: user.username }, global.JWT_SECRET, { expiresIn: "24h" })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (err) {
    console.error("Login error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Verify token and get user info
router.get("/verify", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password")
    if (!user) {
      return res.status(404).json({ error: "User not found" })
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        phone: user.phone,
      },
    })
  } catch (err) {
    console.error("Token verification error:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router