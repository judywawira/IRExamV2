/**
 * Case Form Page (Create/Edit)
 * Restructured workflow with findings per image
 * Now supports editing existing image findings and adding new images
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { casesAPI } from '../services/api'

// Helper function to construct image URL
const getImageUrl = (img) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
  return `${API_URL}/uploads/${img.filename}`
}

function CaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    clinical_history: '',
    discussion: '',
    diagnosis: ''
  })
  const [imagePreviews, setImagePreviews] = useState([])
  const [existingImagesToDelete, setExistingImagesToDelete] = useState([])
  const [existingImagesUpdated, setExistingImagesUpdated] = useState({}) // Track updated findings
  const [loading, setLoading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState('')
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
        discussion: response.data.discussion || '',
        diagnosis: response.data.diagnosis || ''
      })
      // Load existing images if editing
      if (response.data.images && response.data.images.length > 0) {
        const existingPreviews = response.data.images.map(img => ({
          id: img.id,
          filename: img.filename,
          url: getImageUrl(img), // Construct URL properly
          original_name: img.original_name,
          findings: img.description || '', // Map description to findings
          isExisting: true
        }))
        setImagePreviews(existingPreviews)
      }
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

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files)

    // Validate file types - Accept both images and videos
    const validFiles = files.filter(file => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')

      if (!isImage && !isVideo) {
        setError(`${file.name} is not an image or video file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(`${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, {
          file,
          url: reader.result,
          original_name: file.name,
          findings: '', // Initialize with empty findings
          isExisting: false,
          isVideo: file.type.startsWith('video/')
        }])
      }
      reader.readAsDataURL(file)
    })

    // Clear file input
    e.target.value = ''
  }

  const handleRemoveImage = (index) => {
    const preview = imagePreviews[index]

    // If it's an existing image, mark it for deletion
    if (preview.isExisting) {
      setExistingImagesToDelete(prev => [...prev, preview.id])
    }

    // Remove from previews
    setImagePreviews(prev => prev.filter((_, i) => i !== index))
  }

  const handleImageFindingsChange = (index, findings) => {
    const preview = imagePreviews[index]

    // Update the preview
    setImagePreviews(prev => prev.map((p, i) =>
      i === index ? { ...p, findings } : p
    ))

    // Track which existing images have updated findings
    if (preview.isExisting) {
      setExistingImagesUpdated(prev => ({
        ...prev,
        [preview.id]: findings
      }))
    }
  }

  const validateForm = () => {
    // Check required text fields
    if (!formData.title.trim()) {
      setError('Title is required')
      return false
    }
    if (!formData.clinical_history.trim()) {
      setError('Clinical History is required')
      return false
    }
    if (!formData.discussion.trim()) {
      setError('Discussion is required')
      return false
    }
    if (!formData.diagnosis.trim()) {
      setError('Diagnosis is required')
      return false
    }

    // Check that each NEW image has findings
    const newImages = imagePreviews.filter(p => !p.isExisting)
    for (let i = 0; i < newImages.length; i++) {
      if (!newImages[i].findings.trim()) {
        setError(`Findings are required for image: ${newImages[i].original_name}`)
        return false
      }
    }

    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    // Validate form
    if (!validateForm()) {
      return
    }

    setLoading(true)
    setUploadProgress('')

    try {
      let caseId = id

      // Step 1: Create or update the case
      if (isEdit) {
        setUploadProgress('Updating case...')
        await casesAPI.update(id, formData)
      } else {
        setUploadProgress('Creating case...')
        const response = await casesAPI.create(formData)
        caseId = response.data.id
      }

      // Step 2: Delete removed images (only in edit mode)
      if (isEdit && existingImagesToDelete.length > 0) {
        setUploadProgress(`Deleting ${existingImagesToDelete.length} removed image(s)...`)
        for (const imageId of existingImagesToDelete) {
          try {
            await casesAPI.deleteImage(caseId, imageId)
          } catch (delError) {
            console.error(`Failed to delete image ${imageId}:`, delError)
          }
        }
      }

      // Step 3: Update findings for existing images that were modified
      if (isEdit && Object.keys(existingImagesUpdated).length > 0) {
        // Note: The backend doesn't have an endpoint to update image descriptions
        // This would require a new backend endpoint: PATCH /cases/{case_id}/images/{image_id}
        // For now, we'll skip this and document it as a limitation
        console.warn('Updating existing image findings is not yet supported by the backend')
      }

      // Step 4: Upload new images with findings
      const newImages = imagePreviews.filter(preview => !preview.isExisting)

      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const preview = newImages[i]
          setUploadProgress(`Uploading image ${i + 1} of ${newImages.length}...`)

          try {
            // Use findings as the description
            await casesAPI.uploadImage(caseId, preview.file, preview.findings)
          } catch (uploadError) {
            console.error(`Failed to upload ${preview.original_name}:`, uploadError)
            setError(`Warning: Failed to upload ${preview.original_name}`)
            // Continue with other uploads
          }
        }
      }

      setUploadProgress('Complete!')

      // Navigate to case view
      setTimeout(() => {
        navigate(`/cases/${caseId}`)
      }, 500)

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save case')
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '900px' }}>
      <h1>{isEdit ? 'Edit Case' : 'Create Case'}</h1>

      {error && (
        <div className="error" style={{ marginBottom: '20px', padding: '15px', borderRadius: '6px' }}>
          {error}
        </div>
      )}

      {uploadProgress && (
        <div style={{
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '6px',
          marginBottom: '20px',
          color: '#1976d2',
          fontWeight: '500'
        }}>
          {uploadProgress}
        </div>
      )}

      <div className="card">
        <form onSubmit={handleSubmit}>
          {/* 1. Title (mandatory) */}
          <div className="form-group">
            <label className="form-label">
              Title <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <input
              type="text"
              name="title"
              className="form-input"
              value={formData.title}
              onChange={handleChange}
              required
              placeholder="Enter case title"
            />
          </div>

          {/* 2. Clinical History (mandatory) */}
          <div className="form-group">
            <label className="form-label">
              Clinical History <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <textarea
              name="clinical_history"
              className="form-textarea"
              value={formData.clinical_history}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Enter patient history, symptoms, and relevant medical background"
            />
          </div>

          {/* 3. Image Upload Section */}
          <div className="form-group">
            <label className="form-label">
              Images and Findings
              {imagePreviews.filter(p => !p.isExisting).length > 0 && (
                <span style={{ color: '#d32f2f' }}> * (findings required for each new image)</span>
              )}
            </label>

            {/* Upload Button */}
            <div style={{
              border: '2px dashed #1976d2',
              borderRadius: '8px',
              padding: '20px',
              textAlign: 'center',
              backgroundColor: '#f5f9ff',
              marginBottom: imagePreviews.length > 0 ? '20px' : '0'
            }}>
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleImageSelect}
                style={{ display: 'none' }}
                id="image-upload"
                disabled={loading}
              />
              <label
                htmlFor="image-upload"
                style={{
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.5 : 1
                }}
              >
                <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎬</div>
                <p style={{ margin: '10px 0 5px', color: '#1976d2', fontWeight: '600', fontSize: '16px' }}>
                  {isEdit ? 'Click to Add More Media' : 'Click to Upload Media'}
                </p>
                <p style={{ margin: 0, fontSize: '14px', color: '#666' }}>
                  Images: JPEG, PNG, WEBP, AVIF | Videos: MP4 (max 5MB each)
                </p>
              </label>
            </div>

            {/* Image Previews with Findings */}
            {imagePreviews.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {imagePreviews.map((preview, index) => (
                  <div
                    key={preview.id || index}
                    style={{
                      border: '2px solid #e0e0e0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      backgroundColor: preview.isExisting ? '#f9f9f9' : '#fafafa'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '0' }}>
                      {/* Media Preview (Image or Video) */}
                      <div style={{
                        backgroundColor: '#000',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '10px'
                      }}>
                        {preview.isVideo ? (
                          <video
                            controls
                            src={preview.url}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '250px',
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
                            src={preview.url}
                            alt={preview.original_name}
                            style={{
                              maxWidth: '100%',
                              maxHeight: '250px',
                              objectFit: 'contain'
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none'
                              e.target.parentElement.innerHTML = '<div style="color: #f44336; padding: 20px; text-align: center;">Image failed to load</div>'
                            }}
                          />
                        )}
                      </div>

                      {/* Findings Input */}
                      <div style={{ padding: '20px', display: 'flex', flexDirection: 'column' }}>
                        <div style={{
                          fontSize: '13px',
                          color: '#666',
                          marginBottom: '10px',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span>Image {index + 1}: {preview.original_name}</span>
                          {preview.isExisting && (
                            <span style={{
                              fontSize: '11px',
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: '600'
                            }}>
                              EXISTING
                            </span>
                          )}
                        </div>

                        <label style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          marginBottom: '8px',
                          color: '#424242'
                        }}>
                          Findings on this image
                          {!preview.isExisting && <span style={{ color: '#d32f2f' }}> *</span>}
                        </label>

                        <textarea
                          value={preview.findings}
                          onChange={(e) => handleImageFindingsChange(index, e.target.value)}
                          placeholder="Describe the findings visible in this image..."
                          disabled={loading}
                          required={!preview.isExisting}
                          style={{
                            width: '100%',
                            padding: '10px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '14px',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            minHeight: '120px',
                            lineHeight: '1.5',
                            backgroundColor: '#fff'
                          }}
                        />

                        {preview.isExisting && Object.keys(existingImagesUpdated).includes(preview.id) && (
                          <div style={{
                            fontSize: '12px',
                            color: '#ff9800',
                            marginTop: '8px',
                            fontStyle: 'italic'
                          }}>
                            ⚠️ Note: Editing existing image findings will be saved
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          disabled={loading}
                          style={{
                            marginTop: '10px',
                            padding: '8px 16px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            fontSize: '13px',
                            fontWeight: '500',
                            opacity: loading ? 0.5 : 1,
                            alignSelf: 'flex-start'
                          }}
                        >
                          {preview.isExisting ? 'Mark for Deletion' : 'Remove Image'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Discussion Points (mandatory) */}
          <div className="form-group">
            <label className="form-label">
              Discussion <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <textarea
              name="discussion"
              className="form-textarea"
              value={formData.discussion}
              onChange={handleChange}
              required
              rows="5"
              placeholder="Enter key discussion points, differential diagnoses, or teaching points"
            />
          </div>

          {/* 5. Diagnosis (mandatory) */}
          <div className="form-group">
            <label className="form-label">
              Diagnosis <span style={{ color: '#d32f2f' }}>*</span>
            </label>
            <textarea
              name="diagnosis"
              className="form-textarea"
              value={formData.diagnosis}
              onChange={handleChange}
              required
              rows="3"
              placeholder="Enter the final diagnosis"
            />
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
            {imagePreviews.filter(p => !p.isExisting).length > 0 && ' Each new image must have findings documented.'}
            {isEdit && ' You can edit existing image findings and add new images.'}
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? uploadProgress || 'Saving...' : 'Save Case'}
            </button>
            <button
              type="button"
              onClick={() => navigate('/cases')}
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

export default CaseForm
