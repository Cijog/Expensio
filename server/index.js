import express from "express"
import mongoose from "mongoose"
import cors from "cors"
import dotenv from "dotenv"
import path from "path"
import { fileURLToPath } from "url"
import authRoutes from "./routes/authRoutes.js"
import expenseRoutes from "./routes/expenseRoutes.js"
import receiptRoutes from "./routes/receiptRoutes.js"
import tripRoutes from "./routes/tripRoutes.js"
import userRoutes from "./routes/userRoutes.js"
import acceptanceRoutes from "./routes/acceptanceRoutes.js"
import { authenticateToken } from "./middleware/auth.js"

// Load environment variables
dotenv.config()

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
app.use(express.json())
app.use(cors())

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "uploads")))

// Define routes
app.use("/auth", authRoutes)
app.use("/expenses", authenticateToken, expenseRoutes)
app.use("/receipts", authenticateToken, receiptRoutes)
app.use("/trips", tripRoutes)
app.use("/users", userRoutes)
app.use("/acceptance", acceptanceRoutes)

// Connect to MongoDB and start server
const PORT = process.env.PORT || 5000
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/expensio"
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret"

// Make JWT_SECRET available globally
global.JWT_SECRET = JWT_SECRET

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("Connected to MongoDB")
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`))
  })
  .catch((err) => console.error("MongoDB connection error:", err))
