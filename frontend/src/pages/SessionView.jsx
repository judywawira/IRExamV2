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
    if (!confirm('End this exam session?')) return

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
    return <div className="loading">Loading session...</div>
  }

  if (!session || !exam || cases.length === 0) {
    return <div className="error">Session data not available</div>
  }

  const currentCase = cases[currentCaseIndex]
  const currentImage = currentCase?.images[currentImageIndex]

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{
        background: '#1a1a1a',
        color: 'white',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <h2 style={{ margin: 0 }}>{session.name}</h2>
          <small style={{ color: '#999' }}>
            {user.email} | {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </small>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <span className={`badge badge-${
              status === 'active' ? 'success' :
              status === 'paused' ? 'warning' :
              status === 'completed' ? 'secondary' : 'info'
            }`}>
              {status.toUpperCase()}
            </span>
          </div>

          <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
            {formatTime(timeRemaining)}
          </div>

          {isExaminer && (
            <div style={{ display: 'flex', gap: '10px' }}>
              {status === 'scheduled' && (
                <button onClick={handleStart} className="btn btn-success btn-sm">
                  Start
                </button>
              )}

              {status === 'active' && (
                <button onClick={handlePause} className="btn btn-warning btn-sm">
                  Pause
                </button>
              )}

              {status === 'paused' && (
                <button onClick={handleResume} className="btn btn-success btn-sm">
                  Resume
                </button>
              )}

              {status !== 'completed' && (
                <button onClick={handleEnd} className="btn btn-danger btn-sm">
                  End
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
            <div style={{ color: 'white', textAlign: 'center' }}>
              <h2>Waiting for Examiner to Start</h2>
              <p>Session: {session.name}</p>
            </div>
          ) : status === 'paused' ? (
            <div style={{ color: 'white', textAlign: 'center' }}>
              <h2>⏸️ Session Paused</h2>
              <p>Waiting for examiner to resume...</p>
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
                  bottom: '20px',
                  display: 'flex',
                  gap: '10px'
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
            <div style={{ color: 'white' }}>
              <p>No image available</p>
            </div>
          )}
        </div>

        {/* Sidebar - Case Info */}
        <div style={{
          width: '350px',
          background: '#1a1a1a',
          color: 'white',
          padding: '20px',
          overflowY: 'auto'
        }}>
          <h3 style={{ marginTop: 0 }}>Case {currentCaseIndex + 1} of {cases.length}</h3>
          <h4>{currentCase?.title}</h4>

          <div style={{ marginTop: '20px' }}>
            <h5 style={{ color: '#999' }}>Clinical History</h5>
            <p>{currentCase?.clinical_history || 'N/A'}</p>

            <h5 style={{ color: '#999', marginTop: '15px' }}>Findings</h5>
            <p>{currentCase?.findings || 'N/A'}</p>

            <h5 style={{ color: '#999', marginTop: '15px' }}>Diagnosis</h5>
            <p>{currentCase?.diagnosis || 'N/A'}</p>

            {currentCase?.discussion_points && (
              <>
                <h5 style={{ color: '#999', marginTop: '15px' }}>Discussion Points</h5>
                <p>{currentCase.discussion_points}</p>
              </>
            )}
          </div>

          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #333' }}>
            <h5 style={{ color: '#999' }}>Images</h5>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {currentCase?.images.map((img, idx) => (
                <div
                  key={img.id}
                  onClick={() => isExaminer && handleNavigate(currentCaseIndex, idx)}
                  style={{
                    border: idx === currentImageIndex ? '2px solid #007bff' : '2px solid #333',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    cursor: isExaminer ? 'pointer' : 'default',
                    aspectRatio: '1',
                    background: '#000'
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
