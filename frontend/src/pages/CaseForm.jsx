/**
 * Case Form Page (Create/Edit)
 * Placeholder implementation - can be expanded with image upload
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { casesAPI } from '../services/api'

function CaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    clinical_history: '',
    findings: '',
    diagnosis: '',
    discussion_points: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isEdit) {
      loadCase()
    }
  }, [id])

  const loadCase = async () => {
    try {
      const response = await casesAPI.get(id)
      setFormData({
        title: response.data.title,
        clinical_history: response.data.clinical_history || '',
        findings: response.data.findings || '',
        diagnosis: response.data.diagnosis || '',
        discussion_points: response.data.discussion_points || ''
      })
    } catch (error) {
      setError('Failed to load case')
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (isEdit) {
        await casesAPI.update(id, formData)
      } else {
        await casesAPI.create(formData)
      }
      navigate('/cases')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save case')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1>{isEdit ? 'Edit Case' : 'Create Case'}</h1>

      {error && <div className="error">{error}</div>}

      <div className="card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical History</label>
            <textarea
              name="clinical_history"
              className="form-textarea"
              value={formData.clinical_history}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Findings</label>
            <textarea
              name="findings"
              className="form-textarea"
              value={formData.findings}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Diagnosis</label>
            <textarea
              name="diagnosis"
              className="form-textarea"
              value={formData.diagnosis}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Discussion Points</label>
            <textarea
              name="discussion_points"
              className="form-textarea"
              value={formData.discussion_points}
              onChange={handleChange}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : 'Save'}
            </button>
            <button type="button" onClick={() => navigate('/cases')} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>

      <p style={{ marginTop: '20px', color: '#666' }}>
        Note: Image upload functionality can be added after saving the case
      </p>
    </div>
  )
}

export default CaseForm
