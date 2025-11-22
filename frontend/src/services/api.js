/**
 * API Client
 * Handles all HTTP requests to backend
 */
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

// Create axios instance
const api = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json'
  }
})

// Request interceptor - Add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (email, password) => {
    const formData = new FormData()
    formData.append('username', email)
    formData.append('password', password)
    return api.post('/auth/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getCurrentUser: () => api.get('/auth/me')
}

// Users API
export const usersAPI = {
  list: (params) => api.get('/users', { params }),
  get: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`)
}

// Cases API
export const casesAPI = {
  list: () => api.get('/cases'),
  get: (id) => api.get(`/cases/${id}`),
  create: (data) => api.post('/cases', data),
  update: (id, data) => api.patch(`/cases/${id}`, data),
  delete: (id) => api.delete(`/cases/${id}`),
  uploadImage: (caseId, file, description) => {
    const formData = new FormData()
    formData.append('file', file)
    if (description) formData.append('description', description)
    return api.post(`/cases/${caseId}/images`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  deleteImage: (caseId, imageId) => api.delete(`/cases/${caseId}/images/${imageId}`)
}

// Exams API
export const examsAPI = {
  list: () => api.get('/exams'),
  get: (id) => api.get(`/exams/${id}`),
  create: (data) => api.post('/exams', data),
  update: (id, data) => api.patch(`/exams/${id}`, data),
  delete: (id) => api.delete(`/exams/${id}`),
  clone: (id) => api.post(`/exams/${id}/clone`)
}

// Sessions API
export const sessionsAPI = {
  list: () => api.get('/sessions'),
  get: (id) => api.get(`/sessions/${id}`),
  create: (data) => api.post('/sessions', data),
  update: (id, data) => api.patch(`/sessions/${id}`, data),
  delete: (id) => api.delete(`/sessions/${id}`)
}

export default api
