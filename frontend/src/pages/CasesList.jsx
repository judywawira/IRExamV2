/**
 * Cases List Page
 * Placeholder implementation - can be expanded
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { casesAPI } from '../services/api'

function CasesList() {
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadCases()
  }, [])

  const loadCases = async () => {
    try {
      const response = await casesAPI.list()
      setCases(response.data)
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

      {cases.length === 0 ? (
        <div className="card">
          <p>No cases found. Create your first case!</p>
        </div>
      ) : (
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Images</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {cases.map(c => (
                <tr key={c.id}>
                  <td>{c.title}</td>
                  <td>{c.images.length}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link to={`/cases/${c.id}/edit`} className="btn btn-sm btn-secondary">
                      Edit
                    </Link>
                    {' '}
                    <button onClick={() => handleDelete(c.id)} className="btn btn-sm btn-danger">
                      Delete
                    </button>
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
