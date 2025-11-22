/**
 * Dashboard Page
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getUser, isExaminer, isAdmin } from '../utils/auth'
import { sessionsAPI, casesAPI, examsAPI } from '../services/api'

function Dashboard() {
  const user = getUser()
  const [stats, setStats] = useState({
    sessions: 0,
    cases: 0,
    exams: 0
  })
  const [upcomingSessions, setUpcomingSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      const [sessionsRes, casesRes, examsRes] = await Promise.all([
        sessionsAPI.list(),
        isExaminer() ? casesAPI.list() : Promise.resolve({ data: [] }),
        isExaminer() ? examsAPI.list() : Promise.resolve({ data: [] })
      ])

      setStats({
        sessions: sessionsRes.data.length,
        cases: casesRes.data.length,
        exams: examsRes.data.length
      })

      // Get upcoming sessions (scheduled or active)
      const upcoming = sessionsRes.data
        .filter(s => s.status === 'scheduled' || s.status === 'active')
        .slice(0, 5)
      setUpcomingSessions(upcoming)

    } catch (error) {
      console.error('Failed to load dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="loading">Loading dashboard...</div>
  }

  return (
    <div className="container">
      <h1>Welcome, {user.first_name}!</h1>
      <p style={{ color: '#666', marginBottom: '30px' }}>
        Role: <strong>{user.role}</strong>
      </p>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        {isExaminer() && (
          <>
            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '36px', margin: '0' }}>{stats.cases}</h3>
              <p style={{ color: '#666' }}>Cases</p>
              <Link to="/cases" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Manage Cases
              </Link>
            </div>

            <div className="card" style={{ textAlign: 'center' }}>
              <h3 style={{ fontSize: '36px', margin: '0' }}>{stats.exams}</h3>
              <p style={{ color: '#666' }}>Exams</p>
              <Link to="/exams" className="btn btn-primary" style={{ marginTop: '10px' }}>
                Manage Exams
              </Link>
            </div>
          </>
        )}

        <div className="card" style={{ textAlign: 'center' }}>
          <h3 style={{ fontSize: '36px', margin: '0' }}>{stats.sessions}</h3>
          <p style={{ color: '#666' }}>Sessions</p>
          <Link to="/sessions" className="btn btn-primary" style={{ marginTop: '10px' }}>
            View Sessions
          </Link>
        </div>

        {isAdmin() && (
          <div className="card" style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '36px', margin: '0' }}>👥</h3>
            <p style={{ color: '#666' }}>User Management</p>
            <Link to="/users" className="btn btn-primary" style={{ marginTop: '10px' }}>
              Manage Users
            </Link>
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
      <div className="card">
        <h2 className="card-header">Upcoming Sessions</h2>

        {upcomingSessions.length === 0 ? (
          <p style={{ color: '#666' }}>No upcoming sessions</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {upcomingSessions.map(session => (
                <tr key={session.id}>
                  <td>{session.name}</td>
                  <td>
                    <span className={`badge badge-${
                      session.status === 'active' ? 'success' : 'warning'
                    }`}>
                      {session.status}
                    </span>
                  </td>
                  <td>
                    <Link to={`/sessions/${session.id}`} className="btn btn-primary btn-sm">
                      {session.status === 'active' ? 'Join' : 'View'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default Dashboard
