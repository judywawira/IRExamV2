/**
 * WebSocket Service
 * Manages Socket.IO connection for real-time synchronization
 */
import { io } from 'socket.io-client'

const WS_URL = import.meta.env.VITE_WS_URL || 'http://localhost:8000'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.listeners = new Map()
  }

  connect(token) {
    if (this.socket?.connected) {
      console.log('Socket already connected')
      return this.socket
    }

    this.socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10
    })

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket.id)
      this.connected = true
    })

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason)
      this.connected = false
    })

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
    })

    return this.socket
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
      this.listeners.clear()
    }
  }

  joinSession(sessionId, callback) {
    if (!this.socket) {
      console.error('Socket not connected')
      return
    }

    this.socket.emit('join_room', { session_id: sessionId }, callback)
  }

  requestSync(sessionId) {
    if (!this.socket) return
    this.socket.emit('request_sync', { session_id: sessionId })
  }

  // Examiner commands
  startExam(sessionId, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_start', { session_id: sessionId }, callback)
  }

  pauseExam(sessionId, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_pause', { session_id: sessionId }, callback)
  }

  resumeExam(sessionId, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_resume', { session_id: sessionId }, callback)
  }

  navigateToImage(sessionId, caseIndex, imageIndex, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_nav', {
      session_id: sessionId,
      case_index: caseIndex,
      image_index: imageIndex
    }, callback)
  }

  endExam(sessionId, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_end', { session_id: sessionId }, callback)
  }

  addAnnotation(sessionId, data, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_annotate', {
      session_id: sessionId,
      data
    }, callback)
  }

  clearAnnotations(sessionId, callback) {
    if (!this.socket) return
    this.socket.emit('cmd_clear_annotations', { session_id: sessionId }, callback)
  }

  // Event listeners
  on(event, callback) {
    if (!this.socket) return

    // Store listener reference for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, [])
    }
    this.listeners.get(event).push(callback)

    this.socket.on(event, callback)
  }

  off(event, callback) {
    if (!this.socket) return

    this.socket.off(event, callback)

    // Clean up listener reference
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event)
      const index = callbacks.indexOf(callback)
      if (index > -1) {
        callbacks.splice(index, 1)
      }
    }
  }

  removeAllListeners(event) {
    if (!this.socket) return

    this.socket.removeAllListeners(event)
    this.listeners.delete(event)
  }
}

// Export singleton instance
export const socketService = new SocketService()
export default socketService
