/**
 * Cases List Page
 * Enhanced with search and preview functionality
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
    if (!confirm('Delete this case?')) return

    try {
      await casesAPI.delete(id)
      loadCases()
    } catch (error) {
      alert('Failed to delete case')
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Cases</h1>
        <Link to="/cases/new" className="btn btn-primary">Create Case</Link>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="form-group" style={{ margin: 0 }}>
          <input
            type="text"
            placeholder="Search cases by title, clinical history, diagnosis, or findings..."
            className="form-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '12px 16px',
              fontSize: '15px',
              border: '2px solid #e0e0e0',
              borderRadius: '8px',
              width: '100%'
            }}
          />
        </div>
        {searchTerm && (
          <div style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
            Found {filteredCases.length} case{filteredCases.length !== 1 ? 's' : ''}
            {filteredCases.length < cases.length && ` (filtered from ${cases.length} total)`}
          </div>
        )}
      </div>

      {filteredCases.length === 0 ? (
        <div className="card">
          <p>
            {searchTerm
              ? `No cases found matching "${searchTerm}"`
              : 'No cases found. Create your first case!'}
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="btn btn-secondary"
              style={{ marginTop: '10px' }}
            >
              Clear Search
            </button>
          )}
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Images</th>
                <th>Created</th>
                <th style={{ minWidth: '200px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCases.map(c => (
                <tr key={c.id}>
                  <td>
                    <div style={{ fontWeight: '500' }}>{c.title}</div>
                    {c.clinical_history && (
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
                        {c.clinical_history.substring(0, 60)}
                        {c.clinical_history.length > 60 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>{c.images?.length || 0}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <Link
                        to={`/cases/${c.id}`}
                        className="btn btn-sm btn-primary"
                        style={{ fontSize: '13px' }}
                      >
                        View
                      </Link>
                      <Link
                        to={`/cases/${c.id}/edit`}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: '13px' }}
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="btn btn-sm btn-danger"
                        style={{ fontSize: '13px' }}
                      >
                        Delete
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
