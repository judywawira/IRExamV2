# IRExam - Testing Milestones

## Overview

This document outlines comprehensive testing milestones for the IRExam platform, organized by feature area and priority.

---

## Milestone 1: Backend API Testing

### Priority: HIGH
### Estimated Duration: 2-3 days

#### 1.1 Authentication & Authorization
- [ ] User registration with valid data
- [ ] User registration with duplicate email (should fail)
- [ ] User login with correct credentials
- [ ] User login with incorrect credentials
- [ ] JWT token generation and validation
- [ ] Token expiration handling
- [ ] Password hashing verification (SHA-256 + bcrypt)
- [ ] Role-based access control (admin, examiner, student)
- [ ] Unapproved user login attempt (should fail)
- [ ] Archived user login attempt (should fail)

**Test Files:**
- `backend/tests/test_auth.py`
- `backend/tests/test_security.py`

#### 1.2 User Management
- [ ] Admin can list all users
- [ ] Admin can approve users
- [ ] Admin can archive users
- [ ] Non-admin cannot access user management endpoints
- [ ] Admin cannot delete themselves
- [ ] Filter users by role
- [ ] Filter users by approval status

**Test Files:**
- `backend/tests/test_users.py`

#### 1.3 Case Management
- [ ] Create case with valid data
- [ ] Update case
- [ ] Delete case
- [ ] Upload image to case (JPEG)
- [ ] Upload image to case (PNG)
- [ ] Reject non-image file upload
- [ ] Reject oversized file upload (> 10MB)
- [ ] Delete image from case
- [ ] Examiner can only see own cases
- [ ] Admin can see all cases
- [ ] Case with clinical history, findings, diagnosis
- [ ] Multiple images per case

**Test Files:**
- `backend/tests/test_cases.py`

#### 1.4 Exam Management
- [ ] Create exam with multiple cases
- [ ] Update exam
- [ ] Delete/archive exam
- [ ] Clone exam (creates copy)
- [ ] Exam duration validation
- [ ] Verify all case IDs exist
- [ ] Invalid case ID rejection

**Test Files:**
- `backend/tests/test_exams.py`

#### 1.5 Session Management
- [ ] Create session with exam and students
- [ ] Update session (scheduled state only)
- [ ] Delete session (smart delete with archiving)
- [ ] Session with no students (hard delete)
- [ ] Session with students (soft delete/archive)
- [ ] Cannot update active session
- [ ] Cannot update paused session
- [ ] List sessions (role-based filtering)

**Test Files:**
- `backend/tests/test_sessions.py`

---

## Milestone 2: WebSocket Real-Time Synchronization Testing

### Priority: CRITICAL
### Estimated Duration: 3-4 days

#### 2.1 Connection & Authentication
- [ ] Client connects with valid JWT token
- [ ] Client connection rejected with invalid token
- [ ] Client connection rejected with expired token
- [ ] Client disconnection handling
- [ ] Reconnection after network interruption
- [ ] Multiple clients can connect simultaneously

#### 2.2 Session Room Management
- [ ] Client joins session room
- [ ] Student can only join assigned sessions
- [ ] Examiner can only join own sessions
- [ ] Admin can join any session
- [ ] Unauthorized join attempt rejected
- [ ] Participants list updates on join/leave

#### 2.3 State Synchronization
- [ ] Client receives session snapshot on join
- [ ] Late joiner receives current state (not initial state)
- [ ] Reconnecting client syncs to current state
- [ ] Navigation updates broadcast to all clients
- [ ] Status changes broadcast to all clients
- [ ] Timer synchronization across clients

#### 2.4 Examiner Controls
- [ ] Start exam (status: scheduled → active)
- [ ] Pause exam (status: active → paused)
- [ ] Resume exam (status: paused → active, pause duration tracked)
- [ ] End exam (status → completed)
- [ ] Navigate to specific case/image
- [ ] Add annotation (broadcast to all)
- [ ] Clear annotations (broadcast to all)
- [ ] Student cannot trigger examiner commands

#### 2.5 Timer Synchronization
- [ ] Timer starts when exam starts
- [ ] Timer pauses when exam paused
- [ ] Timer resumes with correct offset
- [ ] Heartbeat every 30 seconds
- [ ] Client timer corrects drift on heartbeat
- [ ] Time elapsed calculation accuracy

#### 2.6 Stress Testing
- [ ] 50+ students in single session
- [ ] Rapid navigation commands
- [ ] Multiple examiners across different sessions
- [ ] Network latency simulation (100ms, 500ms, 1000ms)
- [ ] Packet loss simulation

**Test Files:**
- `backend/tests/test_websocket.py`
- `backend/tests/test_realtime_sync.py`

---

## Milestone 3: Frontend Component Testing

### Priority: MEDIUM
### Estimated Duration: 2-3 days

#### 3.1 Authentication Flow
- [ ] Login form validation
- [ ] Successful login redirects to dashboard
- [ ] Failed login shows error message
- [ ] Registration form validation
- [ ] Registration success message
- [ ] Logout clears session

#### 3.2 Dashboard
- [ ] Display user information
- [ ] Show statistics (cases, exams, sessions)
- [ ] List upcoming sessions
- [ ] Role-based UI visibility

#### 3.3 Case Management UI
- [ ] List cases
- [ ] Create new case
- [ ] Edit case
- [ ] Delete case confirmation
- [ ] Image upload (drag & drop)
- [ ] Image preview
- [ ] Delete image from case

#### 3.4 Session View (Real-Time)
- [ ] Waiting room display (status: scheduled)
- [ ] Exam view (status: active)
- [ ] Paused overlay (status: paused)
- [ ] Image display (full quality)
- [ ] Case information sidebar
- [ ] Timer display
- [ ] Examiner controls visibility (role-based)
- [ ] Student cannot navigate (locked)
- [ ] Image thumbnails clickable (examiner only)
- [ ] Next/Previous buttons (examiner only)

**Test Files:**
- `frontend/src/__tests__/`

---

## Milestone 4: Integration Testing

### Priority: HIGH
### Estimated Duration: 2-3 days

#### 4.1 End-to-End User Flows

**Flow 1: Complete Exam Creation & Delivery**
- [ ] Admin approves examiner account
- [ ] Examiner creates case with 3 images
- [ ] Examiner creates exam with 2 cases
- [ ] Examiner creates session with 5 students
- [ ] Examiner starts session
- [ ] Students see first image simultaneously
- [ ] Examiner navigates through all images
- [ ] Students' views update in real-time
- [ ] Examiner ends session
- [ ] All clients redirected to dashboard

**Flow 2: Late Join & Reconnection**
- [ ] Session starts
- [ ] Examiner navigates to case 2, image 3
- [ ] Student joins 5 minutes late
- [ ] Student sees case 2, image 3 (current state)
- [ ] Student disconnects network
- [ ] Student reconnects 2 minutes later
- [ ] Student syncs to current state

**Flow 3: Pause & Resume**
- [ ] Exam is active
- [ ] Examiner pauses exam
- [ ] Students see "Paused" overlay
- [ ] Timer stops
- [ ] Examiner resumes exam
- [ ] Timer continues with correct offset
- [ ] Pause duration tracked correctly

#### 4.2 Multi-User Scenarios
- [ ] 2 examiners in separate sessions simultaneously
- [ ] 30 students across 3 sessions
- [ ] Admin manages users while sessions are active

#### 4.3 Error Handling
- [ ] MongoDB connection failure
- [ ] WebSocket server restart (clients reconnect)
- [ ] Network interruption recovery
- [ ] Invalid session ID handling
- [ ] Deleted case/exam error messages

**Test Files:**
- `tests/integration/test_e2e.py`

---

## Milestone 5: Performance & Load Testing

### Priority: MEDIUM
### Estimated Duration: 1-2 days

#### 5.1 API Performance
- [ ] List 1000+ cases (< 500ms)
- [ ] Upload 10MB image (< 3s)
- [ ] Create exam with 50 cases (< 1s)
- [ ] Concurrent API requests (100 req/s)

#### 5.2 WebSocket Performance
- [ ] 100 clients in single session
- [ ] 500 navigation commands/minute
- [ ] Annotation broadcast to 100 clients (< 100ms)

#### 5.3 Database Performance
- [ ] Query 10,000 cases (indexed search)
- [ ] Complex aggregation queries

**Tools:**
- Apache JMeter
- Locust
- Artillery

---

## Milestone 6: Security Testing

### Priority: HIGH
### Estimated Duration: 1-2 days

#### 6.1 Authentication Security
- [ ] SQL injection prevention (N/A - using NoSQL)
- [ ] XSS prevention in inputs
- [ ] CSRF protection
- [ ] Password complexity requirements
- [ ] JWT token tampering detection
- [ ] Rate limiting on login endpoint

#### 6.2 Authorization Security
- [ ] Student cannot access admin endpoints
- [ ] Examiner cannot modify other examiners' cases
- [ ] Student cannot control exam session
- [ ] Unauthorized WebSocket commands rejected

#### 6.3 File Upload Security
- [ ] Malicious file upload rejection
- [ ] File size limit enforcement
- [ ] MIME type validation
- [ ] Filename sanitization

---

## Milestone 7: Browser & Device Compatibility

### Priority: MEDIUM
### Estimated Duration: 1 day

#### 7.1 Browser Testing
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

#### 7.2 Responsive Design
- [ ] Desktop (1920x1080)
- [ ] Laptop (1366x768)
- [ ] Tablet (768x1024)
- [ ] Mobile (warning: session view requires large screen)

---

## Milestone 8: Accessibility Testing

### Priority: LOW
### Estimated Duration: 1 day

- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast (WCAG AA)
- [ ] Focus indicators
- [ ] Alt text for images

---

## Test Execution Strategy

### Phase 1: Unit & API Tests (Week 1)
- Backend API tests (pytest)
- Security tests
- Database model tests

### Phase 2: WebSocket & Real-Time Tests (Week 2)
- WebSocket connection tests
- State synchronization tests
- Timer accuracy tests

### Phase 3: Frontend Tests (Week 3)
- Component tests (Vitest)
- User interaction tests
- UI/UX validation

### Phase 4: Integration & E2E Tests (Week 4)
- End-to-end user flows
- Multi-user scenarios
- Performance benchmarks

### Phase 5: UAT (User Acceptance Testing) (Week 5)
- Medical education faculty testing
- Student testing
- Feedback collection

---

## Continuous Testing

### Automated CI/CD Pipeline
- Run unit tests on every commit
- Run integration tests on pull requests
- Deploy to staging on main branch merge
- Run smoke tests on staging
- Manual approval for production deployment

### Test Coverage Goals
- Backend: 80%+ code coverage
- Frontend: 70%+ code coverage
- Critical paths: 100% coverage

---

## Success Criteria

✅ All HIGH priority tests passing
✅ 90%+ CRITICAL tests passing
✅ No critical security vulnerabilities
✅ Real-time sync < 100ms latency
✅ System stable with 100 concurrent users
✅ Zero data loss scenarios
✅ Graceful degradation on network issues

---

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| WebSocket connection drops | High | Auto-reconnect with state sync |
| MongoDB failure | Critical | Database replication, backups |
| Image storage failure | High | Cloud storage with CDN |
| Timer drift | Medium | Server-authoritative 30s heartbeat |
| Large file uploads | Low | Chunked upload, progress indicators |

---

**Document Version:** 1.0
**Last Updated:** 2025-11-22
**Next Review:** After Milestone 4 completion
