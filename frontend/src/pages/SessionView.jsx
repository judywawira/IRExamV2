/**
 * Session View Page
 * Real-time synchronized exam session view
 * Handles both Examiner and Student perspectives
 */
import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { sessionsAPI, casesAPI, examsAPI } from '../services/api'
import { socketService } from '../services/socket'
import { getToken, getUser, isExaminer as checkIsExaminer } from '../utils/auth'

function SessionView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const user = getUser()
  const isExaminer = checkIsExaminer()

  // Session data
  const [session, setSession] = useState(null)
  const [exam, setExam] = useState(null)
  const [cases, setCases] = useState([])
  const [loading, setLoading] = useState(true)

  // Real-time state
  const [status, setStatus] = useState('scheduled')
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState(null)
  const [connected, setConnected] = useState(false)

  const timerRef = useRef(null)

  useEffect(() => {
    loadSession()

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      socketService.removeAllListeners('session_snapshot')
      socketService.removeAllListeners('state_change')
      socketService.removeAllListeners('nav_update')
      socketService.removeAllListeners('timer_sync')
    }
  }, [id])

  const loadSession = async () => {
    try {
      // Load session
      const sessionRes = await sessionsAPI.get(id)
      setSession(sessionRes.data)

      // Load exam
      const examRes = await examsAPI.get(sessionRes.data.exam_id)
      setExam(examRes.data)

      // Load all cases
      const casesData = await Promise.all(
        examRes.data.case_ids.map(caseId => casesAPI.get(caseId))
      )
      setCases(casesData.map(res => res.data))

      // Connect to WebSocket
      connectToSocket()

    } catch (error) {
      console.error('Failed to load session:', error)
      alert('Failed to load session')
      navigate('/sessions')
    } finally {
      setLoading(false)
    }
  }

  const connectToSocket = () => {
    const token = getToken()
    socketService.connect(token)

    // Join session room
    socketService.joinSession(id, (response) => {
      if (response.error) {
        console.error('Failed to join session:', response.error)
        alert('Failed to join session: ' + response.error)
        return
      }

      setConnected(true)

      // Request initial sync
      socketService.requestSync(id)
    })

    // Listen for session snapshot
    socketService.on('session_snapshot', handleSnapshot)

    // Listen for state changes
    socketService.on('state_change', handleStateChange)

    // Listen for navigation updates
    socketService.on('nav_update', handleNavUpdate)

    // Listen for timer sync
    socketService.on('timer_sync', handleTimerSync)
  }

  const handleSnapshot = (snapshot) => {
    console.log('📸 Received snapshot:', snapshot)
    setStatus(snapshot.status)
    setCurrentCaseIndex(snapshot.current_case_index)
    setCurrentImageIndex(snapshot.current_image_index)

    if (snapshot.duration_minutes && snapshot.time_elapsed !== undefined) {
      const remaining = (snapshot.duration_minutes * 60) - snapshot.time_elapsed
      setTimeRemaining(Math.max(0, remaining))
    }
  }

  const handleStateChange = (data) => {
    console.log('🔄 State change:', data)
    if (data.key === 'status') {
      setStatus(data.value)

      if (data.value === 'completed') {
        alert('Exam has ended')
        navigate('/sessions')
      }
    }
  }

  const handleNavUpdate = (data) => {
    console.log('🖼️ Navigation update:', data)
    setCurrentCaseIndex(data.case_index)
    setCurrentImageIndex(data.image_index)
  }

  const handleTimerSync = (data) => {
    setTimeRemaining(data.seconds_remaining)
  }

  // Examiner controls
  const handleStart = () => {
    socketService.startExam(id, (response) => {
      if (response.error) {
        alert('Failed to start exam: ' + response.error)
      }
    })
  }

  const handlePause = () => {
    socketService.pauseExam(id, (response) => {
      if (response.error) {
        alert('Failed to pause exam: ' + response.error)
      }
    })
  }

  const handleResume = () => {
    socketService.resumeExam(id, (response) => {
      if (response.error) {
        alert('Failed to resume exam: ' + response.error)
      }
    })
  }

  const handleEnd = () => {
    if (!confirm('Are you sure you want to end this exam session?')) return

    socketService.endExam(id, (response) => {
      if (response.error) {
        alert('Failed to end exam: ' + response.error)
      } else {
        navigate('/sessions')
      }
    })
  }

  const handleNavigate = (caseIdx, imageIdx) => {
    socketService.navigateToImage(id, caseIdx, imageIdx, (response) => {
      if (response.error) {
        console.error('Navigation failed:', response.error)
      }
    })
  }

  const handleNextImage = () => {
    const currentCase = cases[currentCaseIndex]
    if (!currentCase) return

    if (currentImageIndex < currentCase.images.length - 1) {
      // Next image in same case
      handleNavigate(currentCaseIndex, currentImageIndex + 1)
    } else if (currentCaseIndex < cases.length - 1) {
      // First image of next case
      handleNavigate(currentCaseIndex + 1, 0)
    }
  }

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      // Previous image in same case
      handleNavigate(currentCaseIndex, currentImageIndex - 1)
    } else if (currentCaseIndex > 0) {
      // Last image of previous case
      const prevCase = cases[currentCaseIndex - 1]
      handleNavigate(currentCaseIndex - 1, prevCase.images.length - 1)
    }
  }

  // Format time
  const formatTime = (seconds) => {
    if (seconds === null) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff'
      }}>
        <div className="loading">Loading session...</div>
      </div>
    )
  }

  if (!session || !exam || cases.length === 0) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff'
      }}>
        <div className="alert alert-error">Session data not available</div>
      </div>
    )
  }

  const currentCase = cases[currentCaseIndex]
  const currentImage = currentCase?.images[currentImageIndex]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{
        background: 'var(--sidebar-bg)',
        color: 'white',
        padding: 'var(--spacing-lg) var(--spacing-2xl)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div>
          <h2 style={{
            margin: 0,
            fontSize: 'var(--font-size-xl)',
            fontWeight: 'var(--font-weight-semibold)'
          }}>
            {session.name}
          </h2>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--sidebar-text)',
            marginTop: 'var(--spacing-xs)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-md)'
          }}>
            <span>{user.email}</span>
            <span>•</span>
            <span style={{ color: connected ? 'var(--color-success)' : 'var(--color-error)' }}>
              {connected ? '🟢 Connected' : '🔴 Disconnected'}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xl)' }}>
          <span className={`badge ${
            status === 'active' ? 'badge-success' :
            status === 'paused' ? 'badge-warning' :
            status === 'completed' ? 'badge-neutral' : 'badge-info'
          }`} style={{ fontSize: 'var(--font-size-sm)' }}>
            {status.toUpperCase()}
          </span>

          <div style={{
            fontSize: '28px',
            fontWeight: 'var(--font-weight-bold)',
            fontFamily: 'monospace',
            color: timeRemaining < 300 ? 'var(--color-error)' : '#fff'
          }}>
            {formatTime(timeRemaining)}
          </div>

          {isExaminer && (
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              {status === 'scheduled' && (
                <button onClick={handleStart} className="btn btn-success btn-sm">
                  ▶ Start
                </button>
              )}

              {status === 'active' && (
                <button onClick={handlePause} className="btn btn-sm" style={{
                  backgroundColor: 'var(--color-warning)',
                  color: 'white'
                }}>
                  ⏸ Pause
                </button>
              )}

              {status === 'paused' && (
                <button onClick={handleResume} className="btn btn-success btn-sm">
                  ▶ Resume
                </button>
              )}

              {status !== 'completed' && (
                <button onClick={handleEnd} className="btn btn-danger btn-sm">
                  ⏹ End
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Image Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          position: 'relative'
        }}>
          {status === 'scheduled' ? (
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-lg)' }}>⏱️</div>
              <h2 style={{ color: '#fff', marginBottom: 'var(--spacing-md)' }}>
                Waiting for Examiner to Start
              </h2>
              <p style={{ color: 'var(--sidebar-text)' }}>Session: {session.name}</p>
            </div>
          ) : status === 'paused' ? (
            <div style={{ color: '#fff', textAlign: 'center' }}>
              <div style={{ fontSize: '64px', marginBottom: 'var(--spacing-lg)' }}>⏸️</div>
              <h2 style={{ color: '#fff', marginBottom: 'var(--spacing-md)' }}>
                Session Paused
              </h2>
              <p style={{ color: 'var(--sidebar-text)' }}>Waiting for examiner to resume...</p>
            </div>
          ) : currentImage ? (
            <>
              <img
                src={`/uploads/${currentImage.filename}`}
                alt={currentCase.title}
                style={{
                  maxWidth: '90%',
                  maxHeight: '80vh',
                  objectFit: 'contain'
                }}
              />

              {isExaminer && (
                <div style={{
                  position: 'absolute',
                  bottom: 'var(--spacing-2xl)',
                  display: 'flex',
                  gap: 'var(--spacing-md)'
                }}>
                  <button
                    onClick={handlePrevImage}
                    className="btn btn-secondary"
                    disabled={currentCaseIndex === 0 && currentImageIndex === 0}
                  >
                    ← Previous
                  </button>
                  <button
                    onClick={handleNextImage}
                    className="btn btn-secondary"
                    disabled={
                      currentCaseIndex === cases.length - 1 &&
                      currentImageIndex === currentCase.images.length - 1
                    }
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div style={{ color: '#fff' }}>
              <p>No image available</p>
            </div>
          )}
        </div>

        {/* Sidebar - Case Info */}
        <div style={{
          width: '380px',
          background: 'var(--sidebar-bg)',
          color: '#fff',
          padding: 'var(--spacing-xl)',
          overflowY: 'auto',
          borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--sidebar-text)',
            marginBottom: 'var(--spacing-sm)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Case {currentCaseIndex + 1} of {cases.length}
          </div>
          <h3 style={{
            margin: 0,
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-xl)'
          }}>
            {currentCase?.title}
          </h3>

          <div>
            <h4 style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sidebar-text)',
              marginBottom: 'var(--spacing-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Clinical History
            </h4>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              marginBottom: 'var(--spacing-xl)',
              color: '#fff'
            }}>
              {currentCase?.clinical_history || 'N/A'}
            </p>

            <h4 style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sidebar-text)',
              marginBottom: 'var(--spacing-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Findings
            </h4>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              marginBottom: 'var(--spacing-xl)',
              color: '#fff'
            }}>
              {currentCase?.findings || 'N/A'}
            </p>

            <h4 style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sidebar-text)',
              marginBottom: 'var(--spacing-sm)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Diagnosis
            </h4>
            <p style={{
              fontSize: 'var(--font-size-sm)',
              lineHeight: 'var(--line-height-relaxed)',
              marginBottom: 'var(--spacing-xl)',
              color: '#fff'
            }}>
              {currentCase?.diagnosis || 'N/A'}
            </p>

            {currentCase?.discussion_points && (
              <>
                <h4 style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--sidebar-text)',
                  marginBottom: 'var(--spacing-sm)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Discussion Points
                </h4>
                <p style={{
                  fontSize: 'var(--font-size-sm)',
                  lineHeight: 'var(--line-height-relaxed)',
                  marginBottom: 'var(--spacing-xl)',
                  color: '#fff'
                }}>
                  {currentCase.discussion_points}
                </p>
              </>
            )}
          </div>

          <div style={{
            marginTop: 'var(--spacing-2xl)',
            paddingTop: 'var(--spacing-xl)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <h4 style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--sidebar-text)',
              marginBottom: 'var(--spacing-md)',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              Images ({currentCase?.images.length || 0})
            </h4>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--spacing-sm)'
            }}>
              {currentCase?.images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => isExaminer && handleNavigate(currentCaseIndex, idx)}
                  style={{
                    border: idx === currentImageIndex ? '2px solid var(--color-primary)' : '2px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: 'var(--radius-md)',
                    overflow: 'hidden',
                    cursor: isExaminer ? 'pointer' : 'default',
                    aspectRatio: '1',
                    background: '#000',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <img
                    src={`/uploads/${img.filename}`}
                    alt={`Image ${idx + 1}`}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SessionView
