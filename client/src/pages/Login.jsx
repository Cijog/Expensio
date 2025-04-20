"use client"

import { useState } from "react"
import axios from "axios"
import { useNavigate, Link } from "react-router-dom"

function Login({ setAuth, setUser }) {
  const [formData, setFormData] = useState({ username: "", password: "" })
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
      const response = await axios.post("http://localhost:5000/auth/login", formData)
      localStorage.setItem("token", response.data.token)
      setUser(response.data.user)
      setAuth(true)
      navigate("/")
    } catch (err) {
      console.error("Login error:", err)
      setError(err.response?.data?.error || "Login failed. Please check your credentials.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 flex items-center justify-center min-h-screen bg-dark-bg">
      <div className="bg-content-bg p-6 rounded-lg w-full max-w-md">
        <h1 className="text-2xl text-white mb-6">Login</h1>
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
            />
          </div>
          <button
            type="submit"
            className="bg-purple-accent text-white p-2 rounded-lg hover:bg-purple-700 transition-colors w-full"
            disabled={isLoading}
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>
        <p className="text-white mt-4">
          No account?{" "}
          <Link to="/signup" className="text-purple-accent hover:text-purple-700">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
