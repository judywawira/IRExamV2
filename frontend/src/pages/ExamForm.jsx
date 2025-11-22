/**
 * Exam Form Page - Placeholder
 */
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

function ExamForm() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    duration_minutes: 60
  })

  return (
    <div className="container" style={{ maxWidth: '600px' }}>
      <h1>Create Exam</h1>
      <div className="card">
        <p>Exam creation form - To be implemented</p>
        <button onClick={() => navigate('/exams')} className="btn btn-secondary">
          Back
        </button>
      </div>
    </div>
  )
}

export default ExamForm
