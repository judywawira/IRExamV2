/**
 * Case View/Preview Page
 * Read-only view of a case with all details
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { casesAPI, usersAPI } from '../services/api'

// Helper function to construct image URL
const getImageUrl = (img) => {
  // Use filename to construct the URL served by FastAPI's static files
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  return `${API_URL}/uploads/${img.filename}`
}

function CaseView() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [caseData, setCaseData] = useState(null)
  const [creatorName, setCreatorName] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadCase()
  }, [id])

  const loadCase = async () => {
    try {
      const response = await casesAPI.get(id)
      setCaseData(response.data)

      // Debug: Log image data to console
      console.log('Case data loaded:', response.data)
      if (response.data.images && response.data.images.length > 0) {
        console.log('Images with findings:', response.data.images.map(img => ({
          filename: img.filename,
          original_name: img.original_name,
          description: img.description,
          hasDescription: !!img.description
        })))
      }

      // Fetch creator information
      if (response.data.created_by) {
        try {
          const userResponse = await usersAPI.get(response.data.created_by)
          setCreatorName(userResponse.data.full_name || userResponse.data.email)
        } catch (userError) {
          console.error('Failed to load creator info:', userError)
          setCreatorName('Unknown')
        }
      }
    } catch (error) {
      setError('Failed to load case')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this case? This action cannot be undone.')) return

    try {
      await casesAPI.delete(id)
      navigate('/cases')
    } catch (error) {
      alert('Failed to delete case')
    }
  }

  if (loading) return <div className="loading">Loading...</div>

  if (error || !caseData) {
    return (
      <div className="container">
        <div className="card">
          <p style={{ color: '#d32f2f' }}>{error || 'Case not found'}</p>
          <Link to="/cases" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Back to Cases
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container" style={{ maxWidth: '1000px' }}>
      {/* Header with Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 style={{ margin: 0 }}>Case Preview</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <Link to={`/cases/${id}/edit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
            Edit Case
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            Delete Case
          </button>
          <Link to="/cases" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
            Back to List
          </Link>
        </div>
      </div>

      {/* Case Details */}
      <div className="card">
        {/* Title */}
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ margin: '0 0 8px 0', color: '#1976d2' }}>{caseData.title}</h2>
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '14px', color: '#666' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '600', color: '#424242' }}>Created by:</span>
              <span>{creatorName || 'Loading...'}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: '600', color: '#424242' }}>Created on:</span>
              <span>{new Date(caseData.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            {caseData.updated_at && caseData.updated_at !== caseData.created_at && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontWeight: '600', color: '#424242' }}>Last updated:</span>
                <span>{new Date(caseData.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}</span>
              </div>
            )}
          </div>
        </div>

        {/* Clinical History */}
        {caseData.clinical_history && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#424242' }}>Clinical History</h3>
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {caseData.clinical_history}
            </div>
          </div>
        )}

        {/* Media (Images/Videos) with Findings */}
        {caseData.images && caseData.images.length > 0 && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#424242' }}>
              Media and Findings ({caseData.images.length})
            </h3>
            <div style={{ display: 'grid', gap: '20px' }}>
              {caseData.images.map((img, index) => (
                <div
                  key={img.id || index}
                  style={{
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    backgroundColor: '#fafafa'
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '0' }}>
                    {/* Media (Image or Video) */}
                    <div style={{ backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {img.mimetype && img.mimetype.startsWith('video/') ? (
                        <video
                          controls
                          src={getImageUrl(img)}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div style="color: #f44336; padding: 20px; text-align: center;">Video failed to load</div>'
                          }}
                        >
                          Your browser does not support video playback.
                        </video>
                      ) : (
                        <img
                          src={getImageUrl(img)}
                          alt={img.original_name || `Image ${index + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '400px',
                            objectFit: 'contain'
                          }}
                          onError={(e) => {
                            e.target.style.display = 'none'
                            e.target.parentElement.innerHTML = '<div style="color: #f44336; padding: 20px; text-align: center;">Image failed to load</div>'
                          }}
                        />
                      )}
                    </div>

                    {/* Findings */}
                    <div style={{ padding: '20px' }}>
                      <div style={{ fontSize: '12px', color: '#999', marginBottom: '10px' }}>
                        {img.mimetype && img.mimetype.startsWith('video/') ? 'Video' : 'Image'} {index + 1}: {img.original_name}
                      </div>
                      <h4 style={{ fontSize: '16px', marginBottom: '10px', color: '#424242' }}>
                        Findings on this {img.mimetype && img.mimetype.startsWith('video/') ? 'video' : 'image'}
                      </h4>
                      <div style={{
                        padding: '12px',
                        backgroundColor: '#fff',
                        borderRadius: '4px',
                        border: '1px solid #e0e0e0',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {img.description ? (
                          <div>{img.description}</div>
                        ) : (
                          <div>
                            <em style={{ color: '#999' }}>No findings documented</em>
                            <div style={{ marginTop: '8px', fontSize: '11px', color: '#ff9800', fontStyle: 'normal' }}>
                              Debug: description field = {JSON.stringify(img.description)}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Debug info - can be removed later */}
                      <details style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
                        <summary style={{ cursor: 'pointer' }}>Debug Info</summary>
                        <pre style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f5f5f5', borderRadius: '4px', overflow: 'auto' }}>
                          {JSON.stringify({
                            id: img.id,
                            filename: img.filename,
                            description: img.description,
                            hasDescription: !!img.description,
                            allKeys: Object.keys(img)
                          }, null, 2)}
                        </pre>
                      </details>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* General Findings (legacy field) */}
        {caseData.findings && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#424242' }}>General Findings</h3>
            <div style={{
              padding: '15px',
              backgroundColor: '#f5f5f5',
              borderRadius: '6px',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {caseData.findings}
            </div>
          </div>
        )}

        {/* Discussion Points */}
        {caseData.discussion_points && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#424242' }}>Discussion Points</h3>
            <div style={{
              padding: '15px',
              backgroundColor: '#fff3e0',
              borderRadius: '6px',
              borderLeft: '4px solid #ff9800',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap'
            }}>
              {caseData.discussion_points}
            </div>
          </div>
        )}

        {/* Diagnosis */}
        {caseData.diagnosis && (
          <div style={{ marginBottom: '30px' }}>
            <h3 style={{ fontSize: '18px', marginBottom: '10px', color: '#424242' }}>Diagnosis</h3>
            <div style={{
              padding: '15px',
              backgroundColor: '#e8f5e9',
              borderRadius: '6px',
              borderLeft: '4px solid #4caf50',
              lineHeight: '1.6',
              whiteSpace: 'pre-wrap',
              fontWeight: '500'
            }}>
              {caseData.diagnosis}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!caseData.clinical_history && !caseData.findings && !caseData.diagnosis && !caseData.discussion_points && (!caseData.images || caseData.images.length === 0) && (
          <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
            <p>This case has no additional details.</p>
          </div>
        )}
      </div>

      {/* Bottom Actions */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '20px', justifyContent: 'flex-end' }}>
        <Link to={`/cases/${id}/edit`} className="btn btn-primary" style={{ textDecoration: 'none' }}>
          Edit Case
        </Link>
        <Link to="/cases" className="btn btn-secondary" style={{ textDecoration: 'none' }}>
          Back to List
        </Link>
      </div>
    </div>
  )
}

export default CaseView
