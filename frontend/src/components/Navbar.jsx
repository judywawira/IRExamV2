/**
 * Navigation Bar Component
 */
import { Link } from 'react-router-dom'
import { getUser, logout, isAdmin, isExaminer } from '../utils/auth'

function Navbar() {
  const user = getUser()

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/" style={{ color: 'white', textDecoration: 'none' }}>
          IRExam
        </Link>
      </div>

      <ul className="navbar-menu">
        <li>
          <Link to="/" className="navbar-link">Dashboard</Link>
        </li>

        {isExaminer() && (
          <>
            <li>
              <Link to="/cases" className="navbar-link">Cases</Link>
            </li>
            <li>
              <Link to="/exams" className="navbar-link">Exams</Link>
            </li>
          </>
        )}

        <li>
          <Link to="/sessions" className="navbar-link">Sessions</Link>
        </li>

        {isAdmin() && (
          <li>
            <Link to="/users" className="navbar-link">Users</Link>
          </li>
        )}

        <li>
          <span className="navbar-link" style={{ cursor: 'default' }}>
            {user?.email} ({user?.role})
          </span>
        </li>

        <li>
          <button
            onClick={logout}
            className="navbar-link"
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            Logout
          </button>
        </li>
      </ul>
    </nav>
  )
}

export default Navbar
