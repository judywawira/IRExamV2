/**
 * Main App Component
 * Handles routing and authentication
 */
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authAPI } from './services/api'
import { getToken, setUser, isAuthenticated } from './utils/auth'

// Pages
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import CasesList from './pages/CasesList'
import CaseForm from './pages/CaseForm'
import ExamsList from './pages/ExamsList'
import ExamForm from './pages/ExamForm'
import SessionsList from './pages/SessionsList'
import SessionForm from './pages/SessionForm'
import SessionView from './pages/SessionView'
import UsersList from './pages/UsersList'

// Components
import Navbar from './components/Navbar'
import PrivateRoute from './components/PrivateRoute'

function App() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    // Check authentication on mount
    const checkAuth = async () => {
      if (!isAuthenticated()) {
        setLoading(false)
        return
      }

      try {
        const response = await authAPI.getCurrentUser()
        setUser(response.data)
        setAuthenticated(true)
      } catch (error) {
        console.error('Auth check failed:', error)
        setAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [])

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <BrowserRouter>
      {authenticated && <Navbar />}

      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected routes */}
        <Route path="/" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        } />

        <Route path="/cases" element={
          <PrivateRoute>
            <CasesList />
          </PrivateRoute>
        } />

        <Route path="/cases/new" element={
          <PrivateRoute>
            <CaseForm />
          </PrivateRoute>
        } />

        <Route path="/cases/:id/edit" element={
          <PrivateRoute>
            <CaseForm />
          </PrivateRoute>
        } />

        <Route path="/exams" element={
          <PrivateRoute>
            <ExamsList />
          </PrivateRoute>
        } />

        <Route path="/exams/new" element={
          <PrivateRoute>
            <ExamForm />
          </PrivateRoute>
        } />

        <Route path="/exams/:id/edit" element={
          <PrivateRoute>
            <ExamForm />
          </PrivateRoute>
        } />

        <Route path="/sessions" element={
          <PrivateRoute>
            <SessionsList />
          </PrivateRoute>
        } />

        <Route path="/sessions/new" element={
          <PrivateRoute>
            <SessionForm />
          </PrivateRoute>
        } />

        <Route path="/sessions/:id" element={
          <PrivateRoute>
            <SessionView />
          </PrivateRoute>
        } />

        <Route path="/users" element={
          <PrivateRoute>
            <UsersList />
          </PrivateRoute>
        } />

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
