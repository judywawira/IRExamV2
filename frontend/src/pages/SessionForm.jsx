/**
 * Session Form Page - Placeholder
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function SessionForm() {
  const navigate = useNavigate()

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1>Create Session</h1>
      <div className="card">
        <p>Session creation form - To be implemented</p>
        <button onClick={() => navigate('/sessions')} className="btn btn-secondary">
          Back
        </button>
      </div>
    </div>
  )
}

export default SessionForm
