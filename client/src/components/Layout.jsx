"use client"

import { useState, useEffect } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "./Sidebar"
import CollaborationRequests from "./CollaborationRequests"
import axios from "axios"
import "../index.css"

function Layout({ user, onLogout }) {
  const [isSidebarMinimized, setIsSidebarMinimized] = useState(false)
  const [pendingRequests, setPendingRequests] = useState([])
  const [loadingRequests, setLoadingRequests] = useState(false)

  useEffect(() => {
    if (user) {
      fetchPendingRequests()
    }
  }, [user])

  const fetchPendingRequests = async () => {
    try {
      setLoadingRequests(true)
      const response = await axios.get("http://localhost:5000/acceptance/requests", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      setPendingRequests(response.data)
    } catch (err) {
      console.error("Error fetching collaboration requests:", err)
    } finally {
      setLoadingRequests(false)
    }
  }

  const toggleSidebar = () => {
    setIsSidebarMinimized(!isSidebarMinimized)
  }

  return (
    <div className="flex min-h-screen bg-dark-bg text-white transition-all duration-300">
      {/* Hamburger Menu */}
      <button
        className={`hamburger-menu absolute top-5 left-5 w-7 h-5 bg-transparent border-none cursor-pointer z-50 ${
          isSidebarMinimized ? "active" : ""
        }`}
        onClick={toggleSidebar}
      >
        <span className="block w-full h-0.5 bg-purple-accent mb-1 transition-all duration-300"></span>
        <span className="block w-full h-0.5 bg-purple-accent mb-1 transition-all duration-300"></span>
        <span className="block w-full h-0.5 bg-purple-accent transition-all duration-300"></span>
      </button>

      {/* Sidebar */}
      <Sidebar isMinimized={isSidebarMinimized} toggleSidebar={toggleSidebar} user={user} onLogout={onLogout} />

      {/* Main Content */}
      <main
        className={`flex-1 p-6 bg-content-bg transition-all duration-300 ${isSidebarMinimized ? "ml-16" : "ml-64"}`}
      >
        {/* Collaboration Requests Banner */}
        {pendingRequests.length > 0 && (
          <div className="mb-6 bg-purple-900 p-4 rounded-lg">
            <h3 className="text-lg font-medium mb-2">Pending Trip Collaboration Requests</h3>
            <CollaborationRequests />
          </div>
        )}

        <div className="w-full h-full">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
