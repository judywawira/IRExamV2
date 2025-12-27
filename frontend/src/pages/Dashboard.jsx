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

      {/* Stats Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {isExaminer() && (
          <>
            <Link to="/cases" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{
                textAlign: 'center',
                padding: '30px 20px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <h3 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#007bff' }}>
                    {stats.cases}
                  </h3>
                  <p style={{ color: '#666', fontSize: '16px', margin: '0 0 15px 0' }}>Cases</p>
                </div>
                <div className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block' }}>
                  Manage Cases
                </div>
              </div>
            </Link>

            <Link to="/exams" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className="card" style={{
                textAlign: 'center',
                padding: '30px 20px',
                cursor: 'pointer',
                transition: 'transform 0.2s, box-shadow 0.2s',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                <div>
                  <h3 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#28a745' }}>
                    {stats.exams}
                  </h3>
                  <p style={{ color: '#666', fontSize: '16px', margin: '0 0 15px 0' }}>Exams</p>
                </div>
                <div className="btn btn-success" style={{ marginTop: '15px', display: 'inline-block' }}>
                  Manage Exams
                </div>
              </div>
            </Link>
          </>
        )}

        <Link to="/sessions" style={{ textDecoration: 'none', color: 'inherit' }}>
          <div className="card" style={{
            textAlign: 'center',
            padding: '30px 20px',
            cursor: 'pointer',
            transition: 'transform 0.2s, box-shadow 0.2s',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)'
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)'
            e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <div>
              <h3 style={{ fontSize: '48px', margin: '0 0 10px 0', color: '#17a2b8' }}>
                {stats.sessions}
              </h3>
              <p style={{ color: '#666', fontSize: '16px', margin: '0 0 15px 0' }}>Sessions</p>
            </div>
            <div className="btn btn-primary" style={{ marginTop: '15px', display: 'inline-block' }}>
              View Sessions
            </div>
          </div>
        </Link>

        {isAdmin() && (
          <Link to="/users" style={{ textDecoration: 'none', color: 'inherit' }}>
            <div className="card" style={{
              textAlign: 'center',
              padding: '30px 20px',
              cursor: 'pointer',
              transition: 'transform 0.2s, box-shadow 0.2s',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <div>
                <h3 style={{ fontSize: '48px', margin: '0 0 10px 0' }}>👥</h3>
                <p style={{ color: '#666', fontSize: '16px', margin: '0 0 15px 0' }}>
                  User Management
                </p>
              </div>
              <div className="btn btn-secondary" style={{ marginTop: '15px', display: 'inline-block' }}>
                Manage Users
              </div>
            </div>
          </Link>
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
