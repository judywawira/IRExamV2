/**
 * Exam Form Page (Create/Edit)
 * Polished UI with case selection
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { examsAPI, casesAPI } from '../services/api'
import ExamPreview from '../components/ExamPreview'

function ExamForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: ''
  })
  const [selectedCaseIds, setSelectedCaseIds] = useState([])
  const [availableCases, setAvailableCases] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingCases, setLoadingCases] = useState(true)
  const [error, setError] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewData, setPreviewData] = useState(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    loadCases()
    if (isEdit) {
      loadExam()
    }
  }, [id])

  const loadCases = async () => {
    try {
      const response = await casesAPI.list()
      setAvailableCases(response.data)
    } catch (error) {
      setError('Failed to load cases')
      console.error(error)
    } finally {
      setLoadingCases(false)
    }
  }

  const loadExam = async () => {
    try {
      const response = await examsAPI.get(id)
      setFormData({
        title: response.data.title,
        description: response.data.description || '',
        duration_minutes: response.data.duration_minutes || ''
      })
      setSelectedCaseIds(response.data.case_ids || [])
    } catch (error) {
      setError('Failed to load exam')
      console.error(error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: name === 'duration_minutes' ? (value === '' ? '' : parseInt(value) || 0) : value
    })
  }

  const handleCaseToggle = (caseId) => {
    if (selectedCaseIds.includes(caseId)) {
      setSelectedCaseIds(selectedCaseIds.filter(id => id !== caseId))
    } else {
      setSelectedCaseIds([...selectedCaseIds, caseId])
    }
  }

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required')
      return false
    }
    // Duration is optional, but if provided must be valid
    if (formData.duration_minutes !== '' && formData.duration_minutes !== null) {
      const duration = Number(formData.duration_minutes)
      if (isNaN(duration) || duration <= 0 || duration > 480) {
        setError('Duration must be between 1 and 480 minutes')
        return false
      }
    }
    if (selectedCaseIds.length === 0) {
      setError('Please select at least one case')
      return false
    }
    return true
  }

  const handlePreview = async () => {
    if (!id) {
      setError('Please save the exam first before previewing')
      return
    }

    setLoadingPreview(true)
    setError('')

    try {
      const response = await examsAPI.preview(id)
      setPreviewData(response.data)
      setShowPreview(true)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load preview')
    } finally {
      setLoadingPreview(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!validateForm()) {
      return
    }

    setLoading(true)

    try {
      const payload = {
        ...formData,
        duration_minutes: formData.duration_minutes === '' ? null : formData.duration_minutes,
        case_ids: selectedCaseIds
      }

      if (isEdit) {
        await examsAPI.update(id, payload)
      } else {
        await examsAPI.create(payload)
      }

      navigate('/exams')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save exam')
    } finally {
      setLoading(false)
    }
  }

  if (loadingCases) {
    return <div className="loading">Loading cases...</div>
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1>{isEdit ? 'Edit Exam' : 'Create Exam'}</h1>

      {error && (
        <div className="error" style={{ marginBottom: '20px', padding: '15px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Title */}
          <div className="form-group">
            <label className="form-label">
              Exam Title <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="e.g., Radiology Final Exam - Term 1"
              style={{ fontSize: '15px' }}
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              name="description"
              className="form-textarea"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Optional: Add instructions or notes about this exam"
              style={{ fontSize: '14px' }}
            />
          </div>

          {/* Duration */}
          <div className="form-group">
            <label className="form-label">
              Duration (minutes)
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <input
                type="number"
                name="duration_minutes"
                className="form-input"
                value={formData.duration_minutes}
                onChange={handleChange}
                min="1"
                max="480"
                placeholder="Leave empty for no time limit"
                style={{ maxWidth: '250px', fontSize: '15px' }}
              />
              {formData.duration_minutes && (
                <span style={{ color: '#666', fontSize: '14px' }}>
                  ({Math.floor(formData.duration_minutes / 60)}h {formData.duration_minutes % 60}m)
                </span>
              )}
            </div>
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              Optional - Leave empty for no time limit. Maximum: 480 minutes (8 hours)
            </div>
          </div>

          {/* Case Selection */}
          <div className="form-group">
            <label className="form-label">
              Select Cases <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <div style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '10px'
            }}>
              {selectedCaseIds.length} case{selectedCaseIds.length !== 1 ? 's' : ''} selected
            </div>

            {availableCases.length === 0 ? (
              <div style={{
                padding: '20px',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#e65100'
              }}>
                <p style={{ margin: 0 }}>No cases available. Please create cases first.</p>
              </div>
            ) : (
              <div style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                maxHeight: '400px',
                overflowY: 'auto'
              }}>
                {availableCases.map((caseItem) => (
                  <label
                    key={caseItem.id}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      padding: '15px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedCaseIds.includes(caseItem.id) ? '#e3f2fd' : '#fff',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedCaseIds.includes(caseItem.id)) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedCaseIds.includes(caseItem.id)) {
                        e.currentTarget.style.backgroundColor = '#fff'
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedCaseIds.includes(caseItem.id)}
                      onChange={() => handleCaseToggle(caseItem.id)}
                      style={{
                        marginRight: '12px',
                        marginTop: '3px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#212121', marginBottom: '4px' }}>
                        {caseItem.title}
                      </div>
                      {caseItem.clinical_history && (
                        <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                          {caseItem.clinical_history.substring(0, 100)}
                          {caseItem.clinical_history.length > 100 ? '...' : ''}
                        </div>
                      )}
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '6px' }}>
                        {caseItem.images?.length || 0} image{caseItem.images?.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Required Fields Notice */}
          <div style={{
            padding: '12px',
            backgroundColor: '#fff3e0',
            borderRadius: '6px',
            fontSize: '13px',
            color: '#e65100',
            marginBottom: '20px'
          }}>
            <strong>Note:</strong> All fields marked with <span style={{ color: '#d32f2f' }}>*</span> are required.
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || availableCases.length === 0}
            >
              {loading ? 'Saving...' : 'Save Exam'}
            </button>
            {isEdit && (
              <button
                type="button"
                onClick={handlePreview}
                className="btn"
                disabled={loadingPreview}
                style={{
                  backgroundColor: 'var(--color-warning)',
                  color: '#000',
                  fontWeight: 'var(--font-weight-semibold)'
                }}
              >
                {loadingPreview ? 'Loading Preview...' : '📋 Preview Exam'}
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/exams')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>

      {/* Exam Preview Modal */}
      {showPreview && previewData && (
        <ExamPreview
          examData={previewData}
          onClose={() => setShowPreview(false)}
        />
      )}
    </div>
  )
}

export default ExamForm
