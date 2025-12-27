/**
 * Exams List Page - Placeholder
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

  if (loading) return <div className="loading">Loading...</div>

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1>Exams</h1>
        <Link to="/exams/new" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Create Exam
        </Link>
      </div>

      <div className="card">
        {exams.length === 0 ? (
          <p>No exams found</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Duration (min)</th>
                <th>Cases</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {exams.map(exam => (
                <tr key={exam.id}>
                  <td>{exam.title}</td>
                  <td>{exam.duration_minutes}</td>
                  <td>{exam.case_ids.length}</td>
                  <td>
                    <Link to={`/exams/${exam.id}/edit`} className="btn btn-sm btn-secondary">
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default ExamsList
