"use client"

import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    email: "",
    phone: "",
  })
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      await axios.post("http://localhost:5000/auth/signup", formData, {
        headers: { "Content-Type": "application/json" },
      })
      navigate("/login")
    } catch (err) {
      console.error("Signup error:", err)
      setError(err.response?.data?.error || "Signup failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-screen bg-dark-bg">
      <div className="bg-content-bg p-6 rounded-lg w-full max-w-md">
        <h1 className="text-2xl text-white mb-6">Sign Up</h1>
        {error && <p className="text-red-500 mb-2">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white mb-1">Username</label>
            <input
              type="text"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-white mb-1">Password</label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
              disabled={isLoading}
              minLength="6"
            />
          </div>
          <div>
            <label className="block text-white mb-1">Email</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              required
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-white mb-1">Phone</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              className="w-full p-2 rounded-lg bg-sidebar-bg text-white border border-gray-600"
              disabled={isLoading}
            />
          </div>
          <button
            type="submit"
            className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors w-full"
            disabled={isLoading}
          >
            {isLoading ? "Signing up..." : "Sign Up"}
          </button>
        </form>
        <p className="text-white mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-purple-accent hover:text-purple-700">
            Login
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Signup