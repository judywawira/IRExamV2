/**
 * Case View/Preview Page
 * Read-only view of a case with all details
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { casesAPI, usersAPI } from '../services/api'

// Helper function to construct image URL
const getImageUrl = (img) => {
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

  if (loading) {
    return (
      <div className="container-narrow">
        <div className="loading">Loading case...</div>
      </div>
    )
  }

  if (error || !caseData) {
    return (
      <div className="container-narrow">
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>⚠️</div>
            <p style={{ color: 'var(--color-error)', marginBottom: 'var(--spacing-lg)' }}>
              {error || 'Case not found'}
            </p>
            <Link to="/cases" className="btn btn-secondary">
              ← Back to Cases
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container-narrow">
      {/* Page Header */}
      <div className="flex justify-between items-center" style={{ marginBottom: 'var(--spacing-2xl)' }}>
        <div>
          <h1 className="page-title">{caseData.title}</h1>
          <div style={{
            display: 'flex',
            gap: 'var(--spacing-lg)',
            flexWrap: 'wrap',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)',
            marginTop: 'var(--spacing-sm)'
          }}>
            <div className="flex items-center gap-sm">
              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Created by:</span>
              <span>{creatorName || 'Loading...'}</span>
            </div>
            <div className="flex items-center gap-sm">
              <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Created on:</span>
              <span>{new Date(caseData.created_at).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}</span>
            </div>
            {caseData.updated_at && caseData.updated_at !== caseData.created_at && (
              <div className="flex items-center gap-sm">
                <span style={{ fontWeight: 'var(--font-weight-medium)' }}>Updated:</span>
                <span>{new Date(caseData.updated_at).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-md">
          <Link to={`/cases/${id}/edit`} className="btn btn-primary">
            ✏️ Edit
          </Link>
          <button onClick={handleDelete} className="btn btn-danger">
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Clinical History */}
      {caseData.clinical_history && (
        <div className="card">
          <h3 className="section-title">Clinical History</h3>
          <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-bg-secondary)',
            borderRadius: 'var(--radius-md)',
            lineHeight: 'var(--line-height-relaxed)',
            whiteSpace: 'pre-wrap',
            color: 'var(--color-text-primary)'
          }}>
            {caseData.clinical_history}
          </div>
        </div>
      )}

      {/* Media (Images/Videos) with Findings */}
      {caseData.images && caseData.images.length > 0 && (
        <div className="card">
          <h3 className="section-title">
            Media and Findings
            <span className="badge badge-neutral" style={{ marginLeft: 'var(--spacing-md)' }}>
              {caseData.images.length} file{caseData.images.length !== 1 ? 's' : ''}
            </span>
          </h3>
          <div style={{ display: 'grid', gap: 'var(--spacing-xl)' }}>
            {caseData.images.map((img, index) => (
              <div
                key={img.id || index}
                style={{
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-lg)',
                  overflow: 'hidden',
                  backgroundColor: 'var(--color-bg-primary)'
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '450px 1fr',
                  gap: '0'
                }}>
                  {/* Media (Image or Video) */}
                  <div style={{
                    backgroundColor: '#000',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 'var(--spacing-lg)'
                  }}>
                    {img.mimetype && img.mimetype.startsWith('video/') ? (
                      <video
                        controls
                        src={getImageUrl(img)}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '450px',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = '<div style="color: var(--color-error); padding: var(--spacing-xl); text-align: center;">Video failed to load</div>'
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
                          maxHeight: '450px',
                          objectFit: 'contain'
                        }}
                        onError={(e) => {
                          e.target.style.display = 'none'
                          e.target.parentElement.innerHTML = '<div style="color: var(--color-error); padding: var(--spacing-xl); text-align: center;">Image failed to load</div>'
                        }}
                      />
                    )}
                  </div>

                  {/* Findings */}
                  <div style={{ padding: 'var(--spacing-xl)' }}>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-tertiary)',
                      marginBottom: 'var(--spacing-md)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      {img.mimetype && img.mimetype.startsWith('video/') ? '🎬 Video' : '🖼 Image'} {index + 1}: {img.original_name}
                    </div>
                    <h4 style={{
                      fontSize: 'var(--font-size-lg)',
                      fontWeight: 'var(--font-weight-semibold)',
                      marginBottom: 'var(--spacing-md)',
                      color: 'var(--color-text-primary)'
                    }}>
                      Findings
                    </h4>
                    <div style={{
                      padding: 'var(--spacing-lg)',
                      backgroundColor: 'var(--color-bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-border-light)',
                      lineHeight: 'var(--line-height-relaxed)',
                      whiteSpace: 'pre-wrap',
                      minHeight: '80px'
                    }}>
                      {img.description ? (
                        <div style={{ color: 'var(--color-text-primary)' }}>{img.description}</div>
                      ) : (
                        <em style={{ color: 'var(--color-text-tertiary)' }}>No findings documented for this media file</em>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discussion */}
      {caseData.discussion && (
        <div className="card">
          <h3 className="section-title">Discussion</h3>
          <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-warning-bg)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--color-warning)',
            lineHeight: 'var(--line-height-relaxed)',
            whiteSpace: 'pre-wrap',
            color: 'var(--color-text-primary)'
          }}>
            {caseData.discussion}
          </div>
        </div>
      )}

      {/* Diagnosis */}
      {caseData.diagnosis && (
        <div className="card">
          <h3 className="section-title">Diagnosis</h3>
          <div style={{
            padding: 'var(--spacing-lg)',
            backgroundColor: 'var(--color-success-bg)',
            borderRadius: 'var(--radius-md)',
            borderLeft: '4px solid var(--color-success)',
            lineHeight: 'var(--line-height-relaxed)',
            whiteSpace: 'pre-wrap',
            fontWeight: 'var(--font-weight-medium)',
            color: 'var(--color-text-primary)'
          }}>
            {caseData.diagnosis}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!caseData.clinical_history && !caseData.diagnosis && !caseData.discussion && (!caseData.images || caseData.images.length === 0) && (
        <div className="card">
          <div style={{
            textAlign: 'center',
            padding: 'var(--spacing-3xl)',
            color: 'var(--color-text-secondary)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: 'var(--spacing-md)' }}>📋</div>
            <p>This case has no additional details.</p>
          </div>
        </div>
      )}

      {/* Bottom Actions */}
      <div className="flex gap-md" style={{
        marginTop: 'var(--spacing-xl)',
        justifyContent: 'flex-end'
      }}>
        <Link to="/cases" className="btn btn-secondary">
          ← Back to Cases
        </Link>
        <Link to={`/cases/${id}/edit`} className="btn btn-primary">
          ✏️ Edit Case
        </Link>
      </div>
    </div>
  )
}

export default CaseView
