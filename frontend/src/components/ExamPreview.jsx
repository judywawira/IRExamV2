/**
 * Exam Preview Modal
 * Shows how the exam will flow with all cases and images
 */
import { useState, useEffect } from 'react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function ExamPreview({ examData, onClose }) {
  const [currentCaseIndex, setCurrentCaseIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  if (!examData || !examData.cases || examData.cases.length === 0) {
    return null
  }

  const currentCase = examData.cases[currentCaseIndex]
  const totalCases = examData.cases.length
  const totalImages = currentCase.images?.length || 0

  const handlePrevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    } else if (currentCaseIndex > 0) {
      // Go to previous case, last image
      const prevCase = examData.cases[currentCaseIndex - 1]
      setCurrentCaseIndex(currentCaseIndex - 1)
      setCurrentImageIndex((prevCase.images?.length || 1) - 1)
    }
  }

  const handleNextImage = () => {
    if (currentImageIndex < totalImages - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    } else if (currentCaseIndex < totalCases - 1) {
      // Go to next case, first image
      setCurrentCaseIndex(currentCaseIndex + 1)
      setCurrentImageIndex(0)
    }
  }

  const handlePrevCase = () => {
    if (currentCaseIndex > 0) {
      setCurrentCaseIndex(currentCaseIndex - 1)
      setCurrentImageIndex(0)
    }
  }

  const handleNextCase = () => {
    if (currentCaseIndex < totalCases - 1) {
      setCurrentCaseIndex(currentCaseIndex + 1)
      setCurrentImageIndex(0)
    }
  }

  const currentImage = currentCase.images?.[currentImageIndex]
  const imageUrl = currentImage ? `${API_URL}/uploads/${currentImage.filename}` : null
  const isVideo = currentImage?.filename?.match(/\.(mp4|webm|ogg)$/i)

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        padding: 'var(--spacing-lg)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)'
      }}>
        <div>
          <div style={{
            display: 'inline-block',
            backgroundColor: 'var(--color-warning)',
            color: '#000',
            padding: '4px 12px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'var(--font-weight-bold)',
            marginRight: 'var(--spacing-md)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            📋 Preview Mode
          </div>
          <span style={{ color: '#fff', fontSize: '20px', fontWeight: 'var(--font-weight-bold)' }}>
            {examData.title}
          </span>
        </div>
        <button
          onClick={onClose}
          className="btn btn-secondary btn-sm"
          style={{ minWidth: '100px' }}
        >
          ✕ Close Preview
        </button>
      </div>

      {/* Main Content */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Left Sidebar - Case Info */}
        <div style={{
          width: '400px',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: 'var(--spacing-lg)',
          overflowY: 'auto',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)'
        }}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <div style={{ color: '#999', fontSize: '12px', marginBottom: '4px' }}>
              Case {currentCaseIndex + 1} of {totalCases}
            </div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: '20px' }}>
              {currentCase.title}
            </h2>
          </div>

          {examData.description && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Exam Instructions
              </div>
              <div style={{ color: '#ddd', fontSize: '14px', lineHeight: '1.6' }}>
                {examData.description}
              </div>
            </div>
          )}

          {examData.duration_minutes && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Duration
              </div>
              <div style={{ color: '#ddd', fontSize: '14px' }}>
                {examData.duration_minutes} minutes ({Math.floor(examData.duration_minutes / 60)}h {examData.duration_minutes % 60}m)
              </div>
            </div>
          )}

          {currentCase.clinical_history && (
            <div style={{ marginBottom: 'var(--spacing-lg)' }}>
              <div style={{ color: '#999', fontSize: '12px', marginBottom: '8px', textTransform: 'uppercase' }}>
                Clinical History
              </div>
              <div style={{ color: '#ddd', fontSize: '14px', lineHeight: '1.6' }}>
                {currentCase.clinical_history}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'var(--spacing-xl)' }}>
            <div style={{ color: '#999', fontSize: '12px', marginBottom: '12px', textTransform: 'uppercase' }}>
              Case Navigation
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={handlePrevCase}
                disabled={currentCaseIndex === 0}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
              >
                ← Previous Case
              </button>
              <button
                onClick={handleNextCase}
                disabled={currentCaseIndex === totalCases - 1}
                className="btn btn-secondary btn-sm"
                style={{ flex: 1 }}
              >
                Next Case →
              </button>
            </div>
          </div>
        </div>

        {/* Center - Image Display */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 'var(--spacing-lg)',
          position: 'relative'
        }}>
          {imageUrl ? (
            <div style={{
              maxWidth: '100%',
              maxHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {isVideo ? (
                <video
                  src={imageUrl}
                  controls
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 200px)',
                    objectFit: 'contain'
                  }}
                />
              ) : (
                <img
                  src={imageUrl}
                  alt={currentCase.title}
                  style={{
                    maxWidth: '100%',
                    maxHeight: 'calc(100vh - 200px)',
                    objectFit: 'contain'
                  }}
                />
              )}
            </div>
          ) : (
            <div style={{ color: '#666', fontSize: '16px' }}>
              No images available for this case
            </div>
          )}

          {/* Image Navigation */}
          {totalImages > 0 && (
            <div style={{
              position: 'absolute',
              bottom: 'var(--spacing-lg)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-md)',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              padding: 'var(--spacing-md)',
              borderRadius: '8px'
            }}>
              <button
                onClick={handlePrevImage}
                disabled={currentCaseIndex === 0 && currentImageIndex === 0}
                className="btn btn-secondary btn-sm"
              >
                ← Previous
              </button>
              <span style={{ color: '#fff', fontSize: '14px', minWidth: '120px', textAlign: 'center' }}>
                Image {currentImageIndex + 1} of {totalImages}
              </span>
              <button
                onClick={handleNextImage}
                disabled={currentCaseIndex === totalCases - 1 && currentImageIndex === totalImages - 1}
                className="btn btn-secondary btn-sm"
              >
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar - Image Thumbnails */}
        {totalImages > 0 && (
          <div style={{
            width: '200px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            padding: 'var(--spacing-md)',
            overflowY: 'auto',
            borderLeft: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <div style={{ color: '#999', fontSize: '12px', marginBottom: 'var(--spacing-md)', textTransform: 'uppercase' }}>
              Images ({totalImages})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {currentCase.images?.map((image, idx) => {
                const thumbUrl = `${API_URL}/uploads/${image.filename}`
                const isThumbVideo = image.filename?.match(/\.(mp4|webm|ogg)$/i)
                const isSelected = idx === currentImageIndex

                return (
                  <div
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    style={{
                      cursor: 'pointer',
                      border: isSelected ? '3px solid var(--color-primary)' : '2px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '6px',
                      overflow: 'hidden',
                      position: 'relative',
                      aspectRatio: '16/9',
                      backgroundColor: '#000'
                    }}
                  >
                    {isThumbVideo ? (
                      <video
                        src={thumbUrl}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    ) : (
                      <img
                        src={thumbUrl}
                        alt={`Image ${idx + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover'
                        }}
                      />
                    )}
                    <div style={{
                      position: 'absolute',
                      top: '4px',
                      right: '4px',
                      backgroundColor: 'rgba(0, 0, 0, 0.7)',
                      color: '#fff',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontSize: '11px'
                    }}>
                      {idx + 1}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div style={{
        padding: 'var(--spacing-md)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        textAlign: 'center',
        color: '#999',
        fontSize: '12px'
      }}>
        💡 This is a preview only. No answers can be submitted in preview mode. Use navigation controls to explore the exam flow.
      </div>
    </div>
  )
}

export default ExamPreview
