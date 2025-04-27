"use client"

import CollaborationRequests from "../components/CollaborationRequests"

export default function CollaborationRequestsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-white mb-6">Collaboration Requests</h1>
      <CollaborationRequests />
    </div>
  )
}
