/**
 * Exams List Page
 * Modern table design for exam management
 */
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { examsAPI } from '../services/api'

function ExamsList() {
  const [exams, setExams] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadExams()
  }, [])

  const loadExams = async () => {
    try {
      const response = await examsAPI.list()
      setExams(response.data)
    } catch (error) {
      console.error('Failed to load exams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this exam? This action cannot be undone.')) return

    try {
      await examsAPI.delete(id)
      loadExams()
    } catch (error) {
      alert('Failed to delete exam')
    }
  }

  if (loading) {
    return (
      <div className="container">
        <div className="loading">Loading exams...</div>
      </div>
    )
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div>
          <h1 className="page-title">Exam Management</h1>
          <p className="page-subtitle">
            Create and manage exams with multiple cases
          </p>
        </div>
        <Link to="/exams/new" className="btn btn-primary">
          + Create Exam
        </Link>
      </div>

      {/* Exams Table */}
      {exams.length === 0 ? (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📝</div>
            <p style={{ marginBottom: 'var(--spacing-lg)' }}>
              No exams found. Create your first exam to get started!
            </p>
            <Link to="/exams/new" className="btn btn-primary">
              + Create First Exam
            </Link>
          </div>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Exam Title</th>
                <th>Duration</th>
                <th>Cases</th>
                <th>Created Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {exam.title}
                    </div>
                    {exam.description && (
                      <div style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-secondary)',
                        marginTop: '4px',
                        lineHeight: '1.4'
                      }}>
                        {exam.description.substring(0, 60)}
                        {exam.description.length > 60 ? '...' : ''}
                      </div>
                    )}
                  </td>
                  <td>
                    <span className="badge badge-info">
                      {exam.duration_minutes ? `${exam.duration_minutes} min` : 'No limit'}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-neutral">
                      {exam.case_ids.length} case{exam.case_ids.length !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td>
                    <div style={{ fontSize: 'var(--font-size-sm)' }}>
                      {new Date(exam.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </td>
                  <td>
                    <div className="table-actions" style={{ justifyContent: 'flex-end' }}>
                      <Link
                        to={`/exams/${exam.id}/edit`}
                        className="btn btn-sm btn-secondary"
                        title="Edit exam"
                      >
                        ✏️ Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(exam.id)}
                        className="btn btn-sm btn-danger"
                        title="Delete exam"
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

export default ExamsList
