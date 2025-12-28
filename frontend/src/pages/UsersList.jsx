/**
 * Users List Page (Admin only)
 * Modern user management interface
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
    if (!confirm('Are you sure you want to archive this user? This action cannot be undone.')) return

    try {
      await usersAPI.delete(id)
      loadUsers()
    } catch (error) {
      alert('Failed to archive user')
    }
  }

  const getInitials = (user) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase()
    }
    return user.email[0].toUpperCase()
  }

  const getRoleBadge = (role) => {
    const badges = {
      admin: 'badge-primary',
      examiner: 'badge-info',
      student: 'badge-neutral'
    }
    return badges[role] || 'badge-neutral'
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading users...</div>
      </div>
    )
  }

  const approvedUsers = users.filter(u => u.is_approved)
  const pendingUsers = users.filter(u => !u.is_approved)

  return (
    <div className="container">
      {/* Page Header */}
      <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <h1 className="page-title">User Management</h1>
        <p className="page-subtitle">
          Manage system users and access permissions
        </p>
      </div>

      {/* Statistics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: 'var(--spacing-lg)',
        marginBottom: 'var(--spacing-2xl)'
      }}>
        <div className="stat-card">
          <div className="stat-card-value">{approvedUsers.length}</div>
          <div className="stat-card-label">Active Users</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value" style={{ color: 'var(--color-warning)' }}>
            {pendingUsers.length}
          </div>
          <div className="stat-card-label">Pending Approval</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-value">{users.filter(u => u.role === 'admin').length}</div>
          <div className="stat-card-label">Administrators</div>
        </div>
      </div>

      {/* Users Table */}
      {users.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>👥</div>
            <p>No users found in the system.</p>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                      <div style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semibold)',
                        flexShrink: 0
                      }}>
                        {getInitials(user)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                          {user.first_name} {user.last_name}
                        </div>
                        {user.full_name && user.full_name !== `${user.first_name} ${user.last_name}` && (
                          <div style={{
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-secondary)'
                          }}>
                            {user.full_name}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                      {user.email}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getRoleBadge(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>
                    {user.is_approved ? (
                      <span className="badge badge-success">Approved</span>
                    ) : (
                      <span className="badge badge-warning">Pending</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      {!user.is_approved && (
                        <button
                          onClick={() => handleApprove(user.id)}
                          className="btn btn-sm btn-success"
                          title="Approve user"
                        >
                          ✓ Approve
                        </button>
                      )}
                      <button
                        onClick={() => handleArchive(user.id)}
                        className="btn btn-sm btn-danger"
                        title="Archive user"
                      >
                        🗑️ Archive
                      </button>
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

export default UsersList
