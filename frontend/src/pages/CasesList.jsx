/**
 * Cases List Page
 * Modern table design with search functionality
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { casesAPI } from '../services/api'

function CasesList() {
  const [cases, setCases] = useState([])
  const [filteredCases, setFilteredCases] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    loadCases()
  }, [])

  useEffect(() => {
    // Filter cases based on search term
    if (searchTerm.trim() === '') {
      setFilteredCases(cases)
    } else {
      const term = searchTerm.toLowerCase()
      const filtered = cases.filter(c =>
        c.title.toLowerCase().includes(term) ||
        (c.clinical_history && c.clinical_history.toLowerCase().includes(term)) ||
        (c.diagnosis && c.diagnosis.toLowerCase().includes(term)) ||
        (c.findings && c.findings.toLowerCase().includes(term))
      )
      setFilteredCases(filtered)
    }
  }, [searchTerm, cases])

  const loadCases = async () => {
    try {
      const response = await casesAPI.list()
      setCases(response.data)
      setFilteredCases(response.data)
    } catch (error) {
      console.error('Failed to load cases:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) return

    try {
      await casesAPI.delete(id)
      loadCases()
    } catch (error) {
      alert('Failed to delete case')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading cases...</div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div>
          <h1 className="page-title">Case Management</h1>
          <p className="page-subtitle">
            Browse and manage all medical imaging cases
          </p>
        </div>
        <Link to="/cases/new" className="btn btn-primary">
          + Create Case
        </Link>
      </div>

      {/* Search Bar */}
      <div className="search-input-wrapper">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          placeholder="Search cases by title, clinical history, diagnosis, or findings..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {searchTerm && (
        <div style={{
          marginBottom: 'var(--spacing-lg)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--color-text-secondary)'
        }}>
          Found {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
          {filteredCases.length < cases.length && ` (filtered from ${cases.length} total)`}
        </div>
      )}

      {/* Cases Table */}
      {filteredCases.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📁</div>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
              {searchTerm
                ? `No cases found matching "${searchTerm}"`
                : 'No cases found. Create your first case to get started!'}
            </p>
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="btn btn-secondary"
              >
                Clear Search
              </button>
            ) : (
              <Link to="/cases/new" className="btn btn-primary">
                + Create First Case
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Case Title</th>
                <th>Media Files</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-medium)', marginBottom: '4px' }}>
                      {c.title}
                    </div>
                    {c.clinical_history && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        lineHeight: '1.4'
                      }}>
                        {c.clinical_history.substring(0, 80)}
                        {c.clinical_history.length > 80 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {c.images?.length || 0} file{c.images?.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {new Date(c.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <Link
                        to={`/cases/${c.id}`}
                        className="btn btn-sm btn-secondary"
                        title="View case"
                      >
                        👁 View
                      </Link>
                      <Link
                        to={`/cases/${c.id}/edit`}
                        className="btn btn-sm btn-secondary"
                        title="Edit case"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="btn btn-sm btn-danger"
                        title="Delete case"
                      >
                        🗑️ Delete
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

export default CasesList
