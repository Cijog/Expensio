"use client"

import { useEffect, useState } from "react"
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from "react-router-dom"
import Layout from "./components/Layout"
import Home from "./pages/Home"
import Expenses from "./pages/Expenses"
import Login from "./pages/Login"
import Signup from "./pages/SignUp"
import Trips from "./pages/Trips"
import Receipts from "./pages/Receipts"
import Settings from "./pages/Settings"
import CollaborationRequestsPage from "./pages/CollaborationRequests"
import axios from "axios"

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState(null)

  useEffect(() => {
    // Set up axios interceptor for all requests
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem("token")
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    // Check token validity on mount
    const checkAuth = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          // Verify token and get user info
          const response = await axios.get("http://localhost:5000/auth/verify")
          setUser(response.data.user)
          setIsAuthenticated(true)
        } catch (err) {
          console.error("Auth verification failed:", err)
          localStorage.removeItem("token")
          setIsAuthenticated(false)
        } finally {
          setIsLoading(false)
        }
      } else {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  const logout = () => {
    localStorage.removeItem("token")
    setIsAuthenticated(false)
    setUser(null)
  }

  // Protected Routes Component
  const ProtectedRoutes = () => {
    if (isLoading) {
      return <div className="flex items-center justify-center h-screen bg-dark-bg text-white">Loading...</div>
    }

    return isAuthenticated ? (
      <Layout user={user} onLogout={logout}>
        <Outlet />
      </Layout>
    ) : (
      <Navigate to="/login" replace />
    )
  }

  if (isLoading) {
    return <div className="flex items-center justify-center h-screen bg-dark-bg text-white">Loading...</div>
  }

  return (
    <Router>
      <Routes>
        <Route element={<ProtectedRoutes />}>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/expenses" element={<Expenses user={user} />} />
          <Route path="/trips" element={<Trips user={user} />} />
          <Route path="/collaboration-requests" element={<CollaborationRequestsPage user={user} />} />
          <Route path="/receipts" element={<Receipts user={user} />} />
          <Route path="/settings" element={<Settings user={user}  />} />
          {/* Add other protected routes here */}
        </Route>
        <Route
          path="/login"
          element={
            isAuthenticated ? <Navigate to="/" replace /> : <Login setAuth={setIsAuthenticated} setUser={setUser} />
          }
        />
        <Route path="/signup" element={isAuthenticated ? <Navigate to="/" replace /> : <Signup />} />
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </Router>
  )
}

export default App
