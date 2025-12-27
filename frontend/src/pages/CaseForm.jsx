/**
 * Case Form Page (Create/Edit)
 * Enhanced with image upload during case creation
 */
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { casesAPI } from '../services/api'

function CaseForm() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEdit = !!id

  const [formData, setFormData] = useState({
    title: '',
    clinical_history: '',
    findings: '',
    diagnosis: '',
    discussion_points: ''
  })
  const [selectedImages, setSelectedImages] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
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
        findings: response.data.findings || '',
        diagnosis: response.data.diagnosis || '',
        discussion_points: response.data.discussion_points || ''
      })
      // Load existing images if editing
      if (response.data.images && response.data.images.length > 0) {
        const existingPreviews = response.data.images.map(img => ({
          id: img.id,
          url: img.url,
          original_name: img.original_name,
          description: img.description,
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

    // Validate file types
    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} is not an image file`)
        return false
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setError(`${file.name} is too large (max 5MB)`)
        return false
      }
      return true
    })

    if (validFiles.length === 0) return

    // Add to selected images
    setSelectedImages(prev => [...prev, ...validFiles])

    // Create previews
    validFiles.forEach(file => {
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreviews(prev => [...prev, {
          file,
          url: reader.result,
          original_name: file.name,
          description: '',
          isExisting: false
        }])
      }
      reader.readAsDataURL(file)
    })

    // Clear file input
    e.target.value = ''
  }

  const handleRemoveImage = (index) => {
    const preview = imagePreviews[index]

    // Remove from previews
    setImagePreviews(prev => prev.filter((_, i) => i !== index))

    // Remove from selected files if not existing
    if (!preview.isExisting) {
      setSelectedImages(prev => {
        const fileIndex = prev.findIndex(f => f.name === preview.file.name)
        return prev.filter((_, i) => i !== fileIndex)
      })
    }
  }

  const handleImageDescriptionChange = (index, description) => {
    setImagePreviews(prev => prev.map((preview, i) =>
      i === index ? { ...preview, description } : preview
    ))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
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

      // Step 2: Upload new images (only for new files, not existing ones)
      const newImages = imagePreviews.filter(preview => !preview.isExisting)

      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const preview = newImages[i]
          setUploadProgress(`Uploading image ${i + 1} of ${newImages.length}...`)

          try {
            await casesAPI.uploadImage(caseId, preview.file, preview.description)
          } catch (uploadError) {
            console.error(`Failed to upload ${preview.original_name}:`, uploadError)
            setError(`Warning: Failed to upload ${preview.original_name}`)
            // Continue with other uploads
          }
        }
      }

      setUploadProgress('Complete!')

      // Navigate to cases list
      setTimeout(() => {
        navigate('/cases')
      }, 500)

    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save case')
      setUploadProgress('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container" style={{ maxWidth: '1200px' }}>
      <h1>{isEdit ? 'Edit Case' : 'Create Case'}</h1>

      {error && (
        <div className="error" style={{ marginBottom: '20px' }}>
          {error}
        </div>
      )}

      {uploadProgress && (
        <div style={{
          padding: '15px',
          backgroundColor: '#e3f2fd',
          borderRadius: '4px',
          marginBottom: '20px',
          color: '#1976d2',
          fontWeight: '500'
        }}>
          {uploadProgress}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: imagePreviews.length > 0 ? '1fr 400px' : '1fr', gap: '20px' }}>

        {/* Main Form */}
        <div className="card">
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input
                type="text"
                name="title"
                className="form-input"
                value={formData.title}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Clinical History</label>
              <textarea
                name="clinical_history"
                className="form-textarea"
                value={formData.clinical_history}
                onChange={handleChange}
                rows="4"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Findings</label>
              <textarea
                name="findings"
                className="form-textarea"
                value={formData.findings}
                onChange={handleChange}
                rows="4"
                placeholder="Describe what you observe in the images..."
              />
            </div>

            <div className="form-group">
              <label className="form-label">Diagnosis</label>
              <textarea
                name="diagnosis"
                className="form-textarea"
                value={formData.diagnosis}
                onChange={handleChange}
                rows="3"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Discussion Points</label>
              <textarea
                name="discussion_points"
                className="form-textarea"
                value={formData.discussion_points}
                onChange={handleChange}
                rows="4"
              />
            </div>

            {/* Image Upload Section */}
            <div className="form-group">
              <label className="form-label">Images</label>
              <div style={{
                border: '2px dashed #ccc',
                borderRadius: '8px',
                padding: '20px',
                textAlign: 'center',
                backgroundColor: '#fafafa'
              }}>
                <input
                  type="file"
                  accept="image/*"
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
                  <div style={{ fontSize: '48px', color: '#999' }}>📁</div>
                  <p style={{ margin: '10px 0 5px', color: '#666', fontWeight: '500' }}>
                    Click to select images
                  </p>
                  <p style={{ margin: 0, fontSize: '14px', color: '#999' }}>
                    PNG or JPEG (max 5MB each)
                  </p>
                </label>
              </div>
              {imagePreviews.length > 0 && (
                <p style={{ marginTop: '10px', fontSize: '14px', color: '#666' }}>
                  {imagePreviews.length} image(s) selected
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '30px' }}>
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

        {/* Image Preview Sidebar */}
        {imagePreviews.length > 0 && (
          <div>
            <div className="card" style={{ position: 'sticky', top: '20px', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
              <h3 style={{ marginTop: 0 }}>Images ({imagePreviews.length})</h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {imagePreviews.map((preview, index) => (
                  <div
                    key={index}
                    style={{
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      padding: '10px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <img
                      src={preview.url}
                      alt={preview.original_name}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        marginBottom: '10px'
                      }}
                    />
                    <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px', wordBreak: 'break-word' }}>
                      {preview.original_name}
                    </div>

                    {!preview.isExisting && (
                      <div style={{ marginBottom: '8px' }}>
                        <input
                          type="text"
                          placeholder="Image description (optional)"
                          value={preview.description}
                          onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            border: '1px solid #ddd',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}
                          disabled={loading}
                        />
                      </div>
                    )}

                    {preview.isExisting && preview.description && (
                      <div style={{ fontSize: '12px', color: '#666', fontStyle: 'italic', marginBottom: '8px' }}>
                        {preview.description}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      disabled={loading}
                      style={{
                        width: '100%',
                        padding: '6px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        opacity: loading ? 0.5 : 1
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CaseForm
