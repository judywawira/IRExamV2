/**
 * Sessions List Page
 * Modern table design for session management
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
      scheduled: 'badge-info',
      active: 'badge-success',
      paused: 'badge-warning',
      completed: 'badge-neutral'
    }
    return badges[status] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading sessions...</div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div>
          <h1 className="page-title">Exam Sessions</h1>
          <p className="page-subtitle">
            View and manage exam sessions for students
          </p>
        </div>
        {isExaminer() && (
          <Link to="/sessions/new" className="btn btn-primary">
            + Create Session
          </Link>
        )}
      </div>

      {/* Sessions Table */}
      {sessions.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>🎯</div>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
              No sessions found. {isExaminer() ? 'Create your first session to get started!' : 'No sessions available.'}
            </p>
            {isExaminer() && (
              <Link to="/sessions/new" className="btn btn-primary">
                + Create First Session
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Session Name</th>
                <th>Status</th>
                <th>Students</th>
                <th>Exam</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => (
                <tr key={session.id}>
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {session.name}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadge(session.status)}`}>
                      {session.status}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {session.student_ids.length} student{session.student_ids.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-secondary)'
                    }}>
                      {session.exam_id ? 'Exam assigned' : 'No exam'}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {new Date(session.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <Link
                        to={`/sessions/${session.id}`}
                        className={`btn btn-sm ${session.status === 'active' ? 'btn-primary' : 'btn-secondary'}`}
                        title={session.status === 'active' ? 'Join session' : 'View session'}
                      >
                        {session.status === 'active' ? '▶ Join' : '👁 View'}
                      </Link>
                    </div>
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
