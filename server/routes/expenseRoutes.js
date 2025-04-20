import express from "express"
import Expense from "../models/Expense.js"

const router = express.Router()

// Get all expenses for the authenticated user
router.get("/", async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.user.id }).sort({ date: -1 })
    res.json(expenses)
  } catch (err) {
    console.error("Get expenses error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get expenses by category
router.get("/category/:category", async (req, res) => {
  try {
    const { category } = req.params
    const expenses = await Expense.find({
      userId: req.user.id,
      category,
    }).sort({ date: -1 })

    res.json(expenses)
  } catch (err) {
    console.error("Get expenses by category error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Get all categories
router.get("/categories", async (req, res) => {
  try {
    const categories = await Expense.distinct("category", { userId: req.user.id })
    res.json(categories)
  } catch (err) {
    console.error("Get categories error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Create a new expense for the authenticated user
router.post("/", async (req, res) => {
  try {
    const { amount, category, description, date, tripId } = req.body

    const expense = new Expense({
      amount,
      category,
      description,
      date: date || new Date(),
      userId: req.user.id,
      tripId,
    })

    await expense.save()
    res.status(201).json(expense)
  } catch (err) {
    console.error("Create expense error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Get expense by ID (ensure it belongs to the user)
router.get("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" })
    }

    res.json(expense)
  } catch (err) {
    console.error("Get expense by ID error:", err)
    res.status(500).json({ error: err.message })
  }
})

// Update expense by ID (ensure it belongs to the user)
router.put("/:id", async (req, res) => {
  try {
    const { amount, category, description, date, tripId } = req.body

    const expense = await Expense.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { amount, category, description, date, tripId },
      { new: true },
    )

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" })
    }

    res.json(expense)
  } catch (err) {
    console.error("Update expense error:", err)
    res.status(400).json({ error: err.message })
  }
})

// Delete expense by ID (ensure it belongs to the user)
router.delete("/:id", async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    })

    if (!expense) {
      return res.status(404).json({ error: "Expense not found" })
    }

    res.json({ message: "Expense deleted successfully" })
  } catch (err) {
    console.error("Delete expense error:", err)
    res.status(500).json({ error: err.message })
  }
})

export default router
