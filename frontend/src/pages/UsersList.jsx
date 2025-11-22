/**
 * Users List Page (Admin only)
 */
import { useEffect, useState } from 'react'
import { usersAPI } from '../services/api'

function UsersList() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    try {
      const response = await usersAPI.list()
      setUsers(response.data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id) => {
    try {
      await usersAPI.update(id, { is_approved: true })
      loadUsers()
    } catch (error) {
      alert('Failed to approve user')
    }
  }

  const handleArchive = async (id) => {
    if (!confirm('Archive this user?')) return

    try {
      await usersAPI.delete(id)
      loadUsers()
    } catch (error) {
      alert('Failed to archive user')
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <h1>User Management</h1>

      <div className="card">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Approved</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id}>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td><span className="badge badge-info">{user.role}</span></td>
                <td>
                  {user.is_approved ? (
                    <span className="badge badge-success">Yes</span>
                  ) : (
                    <span className="badge badge-warning">Pending</span>
                  )}
                </td>
                <td>
                  {!user.is_approved && (
                    <button
                      onClick={() => handleApprove(user.id)}
                      className="btn btn-sm btn-success"
                    >
                      Approve
                    </button>
                  )}
                  {' '}
                  <button
                    onClick={() => handleArchive(user.id)}
                    className="btn btn-sm btn-danger"
                  >
                    Archive
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default UsersList
