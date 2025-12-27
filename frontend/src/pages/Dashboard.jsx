/**
 * Dashboard Page
 * Modern dashboard with statistics cards and upcoming sessions
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
    return (
      <div className="container">
        <div className="loading">Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h1 className="page-title">Welcome, {user.full_name || user.email}!</h1>
        <p className="page-subtitle">
          Your dashboard overview and quick access to platform features
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: 'var(--spacing-xl)',
        marginBottom: 'var(--spacing-2xl)'
      }}>
        {isExaminer() && (
          <>
            <Link to="/cases" style={{ textDecoration: 'none' }}>
              <div className="stat-card">
                <div style={{ fontSize: '32px', marginBottom: 'var(--spacing-md)' }}>📁</div>
                <div className="stat-card-value">{stats.cases}</div>
                <div className="stat-card-label">Total Cases</div>
              </div>
            </Link>

            <Link to="/exams" style={{ textDecoration: 'none' }}>
              <div className="stat-card">
                <div style={{ fontSize: '32px', marginBottom: 'var(--spacing-md)' }}>📝</div>
                <div className="stat-card-value">{stats.exams}</div>
                <div className="stat-card-label">Total Exams</div>
              </div>
            </Link>
          </>
        )}

        <Link to="/sessions" style={{ textDecoration: 'none' }}>
          <div className="stat-card">
            <div style={{ fontSize: '32px', marginBottom: 'var(--spacing-md)' }}>🎯</div>
            <div className="stat-card-value">{stats.sessions}</div>
            <div className="stat-card-label">Total Sessions</div>
          </div>
        </Link>

        {isAdmin() && (
          <Link to="/users" style={{ textDecoration: 'none' }}>
            <div className="stat-card">
              <div style={{ fontSize: '32px', marginBottom: 'var(--spacing-md)' }}>👥</div>
              <div className="stat-card-value">•</div>
              <div className="stat-card-label">User Management</div>
            </div>
          </Link>
        )}
      </div>

      {/* Quick Actions */}
      {isExaminer() && (
        <div className="card">
          <h3 className="section-title" style={{ marginBottom: 'var(--spacing-lg)' }}>Quick Actions</h3>
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-md)',
            flexWrap: 'wrap'
          }}>
            <Link to="/cases/new" className="btn btn-primary">
              + Create Case
            </Link>
            <Link to="/exams/new" className="btn btn-primary">
              + Create Exam
            </Link>
            {isAdmin() && (
              <Link to="/sessions/new" className="btn btn-primary">
                + Create Session
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Upcoming Sessions */}
      <div className="card">
        <h3 className="section-title">Upcoming Sessions</h3>

        {upcomingSessions.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📅</div>
            <p>No upcoming sessions scheduled</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Session Name</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {upcomingSessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                        {session.name}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${
                        session.status === 'active' ? 'badge-success' :
                        session.status === 'scheduled' ? 'badge-info' :
                        'badge-neutral'
                      }`}>
                        {session.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                        <Link to={`/sessions/${session.id}`} className="btn btn-primary btn-sm">
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
    </div>
  )
}

export default Dashboard
