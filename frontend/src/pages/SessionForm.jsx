/**
 * Session Form Page (Create/Edit)
 * Polished UI with exam and student selection
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { sessionsAPI, examsAPI, usersAPI } from '../services/api'

function SessionForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    name: '',
    exam_id: '',
    scheduled_start: ''
  })
  const [selectedStudentIds, setSelectedStudentIds] = useState([])
  const [availableExams, setAvailableExams] = useState([])
  const [availableStudents, setAvailableStudents] = useState([])
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
    if (isEdit) {
      loadSession()
    }
  }, [id])

  const loadData = async () => {
    try {
      const [examsResponse, usersResponse] = await Promise.all([
        examsAPI.list(),
        usersAPI.list({ role: 'student' })
      ])
      setAvailableExams(examsResponse.data)
      setAvailableStudents(usersResponse.data)
    } catch (error) {
      setError('Failed to load exams and students')
      console.error(error)
    } finally {
      setLoadingData(false)
    }
  }

  const loadSession = async () => {
    try {
      const response = await sessionsAPI.get(id)
      setFormData({
        name: response.data.name,
        exam_id: response.data.exam_id,
        scheduled_start: response.data.scheduled_start ?
          new Date(response.data.scheduled_start).toISOString().slice(0, 16) : ''
      })
      setSelectedStudentIds(response.data.student_ids || [])
    } catch (error) {
      setError('Failed to load session')
      console.error(error)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleStudentToggle = (studentId) => {
    if (selectedStudentIds.includes(studentId)) {
      setSelectedStudentIds(selectedStudentIds.filter(id => id !== studentId))
    } else {
      setSelectedStudentIds([...selectedStudentIds, studentId])
    }
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Session name is required')
      return false
    }
    if (!formData.exam_id) {
      setError('Please select an exam')
      return false
    }
    return true
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
        name: formData.name,
        exam_id: formData.exam_id,
        student_ids: selectedStudentIds,
        scheduled_start: formData.scheduled_start ? new Date(formData.scheduled_start).toISOString() : null
      }

      if (isEdit) {
        await sessionsAPI.update(id, payload)
      } else {
        await sessionsAPI.create(payload)
      }

      navigate('/sessions')
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save session')
    } finally {
      setLoading(false)
    }
  }

  if (loadingData) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="container" style={{ maxWidth: '800px' }}>
      <h1>{isEdit ? 'Edit Session' : 'Create Session'}</h1>

      {error && (
        <div className="error" style={{ marginBottom: '20px', padding: '15px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* Session Name */}
          <div className="form-group">
            <label className="form-label">
              Session Name <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              name="name"
              className="form-input"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="e.g., Radiology Exam - Group A - Morning Session"
              style={{ fontSize: '15px' }}
            />
          </div>

          {/* Exam Selection */}
          <div className="form-group">
            <label className="form-label">
              Select Exam <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            {availableExams.length === 0 ? (
              <div style={{
                padding: '20px',
                backgroundColor: '#fff3e0',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#e65100'
              }}>
                <p style={{ margin: 0 }}>No exams available. Please create an exam first.</p>
              </div>
            ) : (
              <select
                name="exam_id"
                className="form-input"
                value={formData.exam_id}
                onChange={handleChange}
                required
                style={{ fontSize: '15px' }}
              >
                <option value="">-- Select an exam --</option>
                {availableExams.map(exam => (
                  <option key={exam.id} value={exam.id}>
                    {exam.title} ({exam.duration_minutes ? `${exam.duration_minutes} min` : 'No limit'}, {exam.case_ids?.length || 0} cases)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Scheduled Start Time */}
          <div className="form-group">
            <label className="form-label">Scheduled Start Time (Optional)</label>
            <input
              type="datetime-local"
              name="scheduled_start"
              className="form-input"
              value={formData.scheduled_start}
              onChange={handleChange}
              style={{ fontSize: '15px' }}
            />
            <div style={{ fontSize: '13px', color: '#666', marginTop: '5px' }}>
              Leave empty for immediate start
            </div>
          </div>

          {/* Student Selection */}
          <div className="form-group">
            <label className="form-label">Select Students (Optional)</label>
            <div style={{
              fontSize: '13px',
              color: '#666',
              marginBottom: '10px'
            }}>
              {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
            </div>

            {availableStudents.length === 0 ? (
              <div style={{
                padding: '15px',
                backgroundColor: '#f5f5f5',
                borderRadius: '6px',
                textAlign: 'center',
                color: '#666',
                fontSize: '14px'
              }}>
                No students available
              </div>
            ) : (
              <div style={{
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                maxHeight: '300px',
                overflowY: 'auto'
              }}>
                {availableStudents.map((student) => (
                  <label
                    key={student.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px 15px',
                      borderBottom: '1px solid #f0f0f0',
                      cursor: 'pointer',
                      backgroundColor: selectedStudentIds.includes(student.id) ? '#e3f2fd' : '#fff',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (!selectedStudentIds.includes(student.id)) {
                        e.currentTarget.style.backgroundColor = '#f5f5f5'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!selectedStudentIds.includes(student.id)) {
                        e.currentTarget.style.backgroundColor = '#fff'
                      }
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(student.id)}
                      onChange={() => handleStudentToggle(student.id)}
                      style={{
                        marginRight: '12px',
                        width: '18px',
                        height: '18px',
                        cursor: 'pointer'
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: '500', color: '#212121' }}>
                        {student.full_name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                        {student.email}
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
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={loading || availableExams.length === 0}
            >
              {loading ? 'Saving...' : 'Save Session'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/sessions')}
              className="btn btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SessionForm
