/**
 * Sessions List Page
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { sessionsAPI } from '../services/api'
import { isExaminer } from '../utils/auth'

function SessionsList() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    try {
      const response = await sessionsAPI.list()
      setSessions(response.data)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: 'warning',
      active: 'success',
      paused: 'info',
      completed: 'secondary'
    }
    return badges[status] || 'secondary'
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Sessions</h1>
        {isExaminer() && (
          <Link to="/sessions/new" className="btn btn-primary">Create Session</Link>
        )}
      </div>

      {sessions.length === 0 ? (
        <div className="card">
          <p>No sessions found</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Students</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>{session.name}</td>
                  <td>
                    <span className={`badge badge-${getStatusBadge(session.status)}`}>
                      {session.status}
                    </span>
                  </td>
                  <td>{session.student_ids.length}</td>
                  <td>
                    <Link to={`/sessions/${session.id}`} className="btn btn-sm btn-primary">
                      {session.status === 'active' ? 'Join' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default SessionsList
