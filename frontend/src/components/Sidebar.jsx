/**
 * Sidebar Navigation Component
 * Modern sidebar with organized sections and user profile
 */
import { Link, useLocation } from 'react-router-dom'
import { getUser, logout, isAdmin, isExaminer } from '../utils/auth'
import './Sidebar.css'

function Sidebar() {
  const user = getUser()
  const location = useLocation()

  const isActive = (path) => {
    return location.pathname === path || location.pathname.startsWith(path + '/')
  }

  // Get initials for avatar
  const getInitials = () => {
    if (!user) return '?'
    if (user.full_name) {
      return user.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }
    return user.email[0].toUpperCase()
  }

  const getRoleName = () => {
    if (!user) return ''
    const roleMap = {
      'admin': 'Administrator',
      'examiner': 'Examiner',
      'student': 'Student'
    }
    return roleMap[user.role] || user.role
  }

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-icon">📋</div>
        <div className="brand-text">
          <div className="brand-name">IRExam</div>
          <div className="brand-subtitle">Platform</div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {/* Dashboard */}
        <Link
          to="/"
          className={`nav-item ${isActive('/') && location.pathname === '/' ? 'active' : ''}`}
        >
          <span className="nav-icon">🏠</span>
          <span className="nav-label">Dashboard</span>
        </Link>

        {/* Case Management Section */}
        {isExaminer() && (
          <>
            <div className="nav-section-title">CASE MANAGEMENT</div>
            <Link
              to="/cases"
              className={`nav-item ${isActive('/cases') ? 'active' : ''}`}
            >
              <span className="nav-icon">📁</span>
              <span className="nav-label">Manage Cases</span>
            </Link>
          </>
        )}

        {/* Exam Management Section */}
        {isExaminer() && (
          <>
            <div className="nav-section-title">EXAM MANAGEMENT</div>
            <Link
              to="/exams"
              className={`nav-item ${isActive('/exams') ? 'active' : ''}`}
            >
              <span className="nav-icon">📝</span>
              <span className="nav-label">Manage Exams</span>
            </Link>
          </>
        )}

        {/* Sessions */}
        <Link
          to="/sessions"
          className={`nav-item ${isActive('/sessions') ? 'active' : ''}`}
        >
          <span className="nav-icon">🎯</span>
          <span className="nav-label">Sessions</span>
        </Link>

        {/* Admin Section */}
        {isAdmin() && (
          <>
            <div className="nav-section-title">ADMINISTRATION</div>
            <Link
              to="/users"
              className={`nav-item ${isActive('/users') ? 'active' : ''}`}
            >
              <span className="nav-icon">👥</span>
              <span className="nav-label">User Management</span>
            </Link>
          </>
        )}
      </nav>

      {/* User Profile */}
      <div className="sidebar-footer">
        <div className="user-profile">
          <div className="user-avatar">{getInitials()}</div>
          <div className="user-info">
            <div className="user-name">{user?.full_name || user?.email}</div>
            <div className="user-role">{getRoleName()}</div>
          </div>
        </div>
        <button onClick={logout} className="logout-btn" title="Logout">
          <span>🚪</span>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
