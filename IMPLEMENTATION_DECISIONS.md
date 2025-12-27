# IRExam - Implementation Decisions & Architecture

## Overview

This document captures all significant architectural and implementation decisions made during the development of the IRExam platform, along with the rationale and alternatives considered.

---

## 1. Technology Stack Decisions

### 1.1 Backend Framework: FastAPI

**Decision:** Use FastAPI for the backend REST API and WebSocket server.

**Rationale:**
- Modern async/await support (critical for WebSocket connections)
- Automatic API documentation (Swagger/OpenAPI)
- Type hints and Pydantic validation
- High performance (similar to Node.js/Go)
- Native WebSocket support via python-socketio integration
- Excellent async database driver support (Motor for MongoDB)

**Alternatives Considered:**
- **Django + Channels**: More mature but heavier, channels adds complexity
- **Flask + Flask-SocketIO**: Lightweight but lacks native async support
- **Node.js + Express**: Considered, but team expertise in Python was decisive

**Impact:** Enables fast development with strong type safety and automatic validation.

---

### 1.2 Database: MongoDB with Beanie ODM

**Decision:** Use MongoDB as the primary database with Beanie as the ODM (Object-Document Mapper).

**Rationale:**
- Document-based model fits medical case structure (variable fields, embedded images)
- Flexible schema for evolving case metadata
- Native support for embedded documents (CaseImage, CaseAnnotation)
- Beanie provides Pythonic async ORM experience
- Horizontal scaling capabilities for future growth
- No complex joins needed (denormalized data acceptable)

**Alternatives Considered:**
- **PostgreSQL + SQLAlchemy**: Better for relational data, but medical cases are hierarchical
- **SQLite**: Too limited for production multi-user scenarios
- **DynamoDB**: Vendor lock-in concerns

**Trade-offs:**
- No ACID transactions across multiple documents (acceptable for this use case)
- Eventual consistency in replicated setups
- Larger storage footprint (acceptable given modern storage costs)

**Impact:** Fast development, natural data modeling for medical cases.

---

### 1.3 Real-Time Engine: Socket.IO (python-socketio)

**Decision:** Use Socket.IO for real-time bidirectional communication.

**Rationale:**
- Built-in fallback mechanisms (WebSocket → polling)
- Rooms and namespaces for session isolation
- Automatic reconnection with exponential backoff
- Event-based architecture (clean separation of concerns)
- Wide browser support
- Mature ecosystem

**Alternatives Considered:**
- **Plain WebSockets (ws library)**: Lower-level, requires manual reconnection logic
- **Server-Sent Events (SSE)**: Unidirectional only
- **Pusher/Ably**: Third-party dependency, cost scaling issues

**Key Implementation Patterns:**
- **Server-Authoritative State**: Server is the single source of truth
- **Snapshot-on-Connect**: New/reconnecting clients receive full state
- **Heartbeat Timer Sync**: 30-second server broadcasts prevent client drift

**Impact:** Reliable real-time synchronization even with network instability.

---

### 1.4 Frontend Framework: React with Vite

**Decision:** Use React 18 with Vite as the build tool.

**Rationale:**
- Component-based architecture ideal for complex UI (session view)
- Large ecosystem of libraries
- Vite provides fast HMR (Hot Module Replacement) during development
- React Hooks simplify state management (useState, useEffect)
- Wide developer familiarity

**Alternatives Considered:**
- **Vue.js**: Considered, but React has better Socket.IO integration examples
- **Svelte**: Smaller ecosystem, less mature tooling
- **Next.js**: Overkill for this SPA (no SSR needed)

**Build Tool:**
- **Vite** chosen over Webpack for faster builds and simpler config

**Impact:** Fast development iteration, straightforward deployment.

---

## 2. Authentication & Security Decisions

### 2.1 Password Hashing: SHA-256 + bcrypt

**Decision:** Two-stage password hashing:
1. Client-side SHA-256 hash (bypasses bcrypt 72-byte limit)
2. Server-side bcrypt hash of the SHA-256 output

**Rationale:**
- bcrypt has a 72-byte input limit
- SHA-256 pre-hash allows unlimited password lengths
- bcrypt provides strong protection against brute-force attacks
- Industry-standard approach

**Implementation:**
```python
# Client sends: sha256(password)
# Server stores: bcrypt(sha256(password))
```

**Alternatives Considered:**
- **Argon2**: Better algorithm but less mature Python library support
- **Plain bcrypt**: Would limit password length to 72 characters

**Security Considerations:**
- SECRET_KEY must be changed in production
- JWT tokens expire after 30 minutes (configurable)
- No password reset flow implemented yet (future enhancement)

---

### 2.2 Authorization Model: Role-Based Access Control (RBAC)

**Decision:** Three fixed roles with hierarchical permissions:

| Role | Permissions |
|------|-------------|
| **Admin** | Full system access, user management, all content |
| **Examiner** | Create cases/exams/sessions, control own sessions, view all exams |
| **Student** | View assigned sessions, read-only participation |

**Rationale:**
- Simple mental model (no complex permission matrices)
- Matches educational institution hierarchy
- Easy to enforce in code (FastAPI dependencies)

**Implementation:**
```python
# Dependency injection for role checks
@router.post("/cases")
async def create_case(current_user: User = Depends(verify_examiner)):
    # Only examiners and admins can reach here
```

**Future Enhancements:**
- Fine-grained permissions (e.g., read-only examiner)
- Department-based isolation
- Custom roles

---

## 3. Data Modeling Decisions

### 3.1 Case Structure: Embedded vs. Referenced Images

**Decision:** Embed images as CaseImage subdocuments within the Case document.

**Rationale:**
- Cases and their images are tightly coupled (1:N relationship)
- Images are never shared across cases
- Embedding provides atomic updates
- Simpler queries (no joins)
- Max document size (16MB) rarely exceeded

**Schema:**
```python
class Case(Document):
    title: str
    images: List[CaseImage] = []  # Embedded
    annotations: List[CaseAnnotation] = []  # Embedded
    created_by: Link[User]  # Referenced
```

**Alternatives Considered:**
- **Separate Images Collection**: More normalized, but requires joins
- **GridFS**: Overkill for files < 16MB

**File Storage:**
- **Development**: Local filesystem (`./uploads`)
- **Production**: Configurable to S3/CloudStorage (not yet implemented)

---

### 3.2 Session State: Database vs. In-Memory Cache

**Decision:** Store session state in MongoDB with optional in-memory cache.

**Rationale:**
- Database persistence ensures state survives server restarts
- Enables horizontal scaling (multiple server instances)
- Cache layer (future) can optimize frequent reads

**Current State Fields:**
```python
class Session(Document):
    status: Literal["scheduled", "active", "paused", "completed"]
    current_case_index: int
    current_image_index: int
    actual_start: datetime
    paused_at: datetime
    total_pause_duration: int  # Accumulates across multiple pauses
```

**Alternatives Considered:**
- **Redis for state**: Faster but requires additional infrastructure
- **In-memory only**: Loses state on server crash

**Chosen Approach:** Database-first with future Redis caching layer.

---

### 3.3 Archive vs. Delete: Smart Deletion

**Decision:** Implement soft deletes (archiving) for entities with relationships.

**Rules:**
- Sessions with assigned students: **Archive** (preserve history)
- Sessions with no students: **Hard delete**
- Users: **Archive** (never hard delete)
- Exams: **Archive**
- Cases: **Hard delete** (but prevent if used in active session)

**Rationale:**
- Preserves audit trail
- Prevents data loss from accidental deletions
- Allows recovery if needed

**Implementation:**
```python
if len(session.students) > 0:
    session.is_archived = True
    await session.save()
else:
    await session.delete()
```

---

## 4. Real-Time Synchronization Architecture

### 4.1 Server-Authoritative State Model

**Decision:** The server is the single source of truth for all session state.

**Architecture:**
```
┌─────────────┐
│   Examiner  │ ──── cmd_nav ────> ┌────────┐
│   (Driver)  │ <─── nav_update ─  │ Server │
└─────────────┘                     │ (Auth) │
                                    └────────┘
┌─────────────┐                         │
│   Student   │ <─── nav_update ────────┤
│  (Observer) │                         │
└─────────────┘                         │
                                        │
┌─────────────┐                         │
│   Student   │ <─── nav_update ────────┘
│  (Observer) │
└─────────────┘
```

**Benefits:**
- Prevents client-side manipulation
- Guarantees all clients see identical state
- Late joiners sync to current state (not initial)
- Reconnections automatically recover

**Client Behavior:**
- **Examiner**: Can send commands, listens for confirmations
- **Student**: Listen-only mode, ignores local input

---

### 4.2 Reconnection & Late Join Handling

**Decision:** Implement "Sync-on-Connect" handshake.

**Flow:**
1. Client connects to WebSocket
2. Client emits `request_sync` with session_id
3. Server queries database for current state
4. Server emits `session_snapshot` to THAT CLIENT ONLY
5. Client overwrites local state with snapshot

**Snapshot Example:**
```json
{
  "session_id": "123",
  "status": "active",
  "current_case_index": 2,
  "current_image_index": 4,
  "time_elapsed": 1200,
  "duration_minutes": 60,
  "server_time": "2024-03-15T10:30:00Z"
}
```

**Rationale:**
- Student who joins late sees current image (not start)
- Reconnecting client doesn't miss state changes
- No "replay" logic needed

---

### 4.3 Timer Synchronization Strategy

**Decision:** Server-authoritative timer with 30-second heartbeat.

**Problem:** Client-side `setInterval` drifts over time.

**Solution:**
- Server calculates `expected_end_time = start_time + duration`
- Server broadcasts `timer_sync` event every 30 seconds:
  ```json
  {
    "seconds_remaining": 3420,
    "time_elapsed": 180
  }
  ```
- Client runs local 1-second ticker for smooth countdown
- On heartbeat, client **overwrites** local timer with server value

**Pause Duration Tracking:**
```python
# On pause
session.paused_at = now()

# On resume
pause_duration = now() - session.paused_at
session.total_pause_duration += pause_duration
session.paused_at = None
```

**Accuracy:** ±1 second across all clients.

---

## 5. Image Handling Decisions

### 5.1 Supported Formats: JPEG & PNG Only

**Decision:** Restrict uploads to JPEG and PNG.

**Rationale:**
- Medical imaging primarily uses JPEG (CT, MRI exports)
- PNG for lossless charts/diagrams
- DICOM viewer out of scope (future enhancement)

**Validation:**
```python
if file.content_type not in ["image/jpeg", "image/png"]:
    raise HTTPException(400, "Only JPEG and PNG allowed")
```

---

### 5.2 File Size Limit: 10MB

**Decision:** Maximum file size of 10MB per image.

**Rationale:**
- High-quality medical images typically 2-5MB
- 10MB allows margin for high-resolution scans
- Prevents abuse (100GB uploads)

**Future:** Implement chunked uploads for very large files.

---

### 5.3 Storage Location

**Decision:**
- **Development**: `./uploads` directory
- **Production**: AWS S3 / Azure Blob (configurable)

**UUID-based Filenames:**
```python
filename = f"{uuid4()}.jpg"  # Prevents path traversal attacks
```

**URL Structure:**
```
/uploads/{uuid}.jpg
```

---

## 6. Frontend Decisions

### 6.1 State Management: React Hooks (No Redux)

**Decision:** Use React's built-in hooks (useState, useEffect) instead of Redux.

**Rationale:**
- Application state is mostly local to components
- WebSocket events drive state updates (event-driven)
- Redux adds boilerplate without clear benefit
- Zustand considered but not needed yet

**When to Use Redux:**
- If app grows to >20 interconnected components
- If complex state sharing needed

---

### 6.2 Session View: Full-Screen Presentation Mode

**Decision:** Session view uses full viewport (100vh) with black background.

**Rationale:**
- Mimics in-person exam presentation
- Eliminates distractions
- Large image display (medical images need detail)

**Layout:**
```
┌─────────────────────────────────────┐
│ Header: Session | Status | Timer   │
├──────────────────────┬──────────────┤
│                      │   Sidebar    │
│   Image Display      │   Case Info  │
│   (Centered)         │   Thumbnails │
│                      │              │
└──────────────────────┴──────────────┘
```

---

### 6.3 Student Navigation Lock

**Decision:** Students cannot navigate (no Previous/Next buttons).

**Implementation:**
- Controls hidden for students (CSS + role check)
- WebSocket server rejects `cmd_nav` from students (server-side enforcement)

**Rationale:**
- Exam integrity (no "jumping ahead")
- Synchronized viewing experience

---

## 7. Error Handling & Resilience

### 7.1 WebSocket Disconnection Strategy

**Decision:** Automatic reconnection with exponential backoff.

**Socket.IO Config:**
```javascript
{
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 10
}
```

**On Reconnect:**
1. Re-join session room
2. Request state sync
3. Update UI instantly

---

### 7.2 Database Connection Failures

**Decision:** Fail fast on startup, retry on transient errors.

**Startup:**
```python
await init_db()  # If fails, app doesn't start
```

**Runtime:**
- Motor driver auto-retries transient errors
- Critical writes wrapped in try/except

**Future:** Database replication + failover.

---

## 8. Deployment Decisions

### 8.1 Containerization: Docker (Planned)

**Decision:** Deploy backend and frontend as Docker containers.

**Benefits:**
- Consistent environments (dev, staging, prod)
- Easy horizontal scaling
- Infrastructure-as-code

**Not Yet Implemented** - Manual deployment for now.

---

### 8.2 Environment Configuration

**Decision:** Use `.env` files with `pydantic-settings`.

**Variables:**
```bash
MONGODB_URL=mongodb://localhost:27017
SECRET_KEY=change-me-in-production
CORS_ORIGINS=["http://localhost:5173"]
```

**Security:**
- `.env` never committed to Git
- `.env.example` provided as template

---

## 9. Testing Strategy Decisions

### 9.1 Backend Testing: pytest

**Decision:** Use pytest for backend unit and integration tests.

**Structure:**
```
backend/tests/
├── test_auth.py
├── test_users.py
├── test_cases.py
├── test_exams.py
├── test_sessions.py
└── test_websocket.py
```

**Fixtures:**
- `async_client`: FastAPI test client
- `test_db`: Isolated MongoDB instance

---

### 9.2 Frontend Testing: Vitest (Planned)

**Decision:** Use Vitest for frontend component tests.

**Why Vitest:**
- Native ESM support (matches Vite)
- Fast HMR
- Compatible with existing React tools

**Coverage Goal:** 70%+ for critical paths.

---

## 10. Future Enhancements & Decisions Deferred

### 10.1 DICOM Image Support

**Status:** Deferred

**Rationale:**
- Adds significant complexity (DICOM viewer required)
- Most educators export to JPEG/PNG for presentations

**When to Implement:**
- If demand from radiologists exceeds 30% of users

---

### 10.2 Annotation Persistence

**Status:** Partially implemented

**Current:**
- Annotations broadcast in real-time
- Saved to database (structure exists)

**Missing:**
- Annotation retrieval on reconnect
- Annotation playback in review mode

**Priority:** Medium

---

### 10.3 Session Recording/Playback

**Status:** Not implemented

**Feature:** Record exam session for later review.

**Complexity:** High (video streaming, storage)

**Priority:** Low (nice-to-have)

---

## 11. UI/UX Enhancements

### 11.1 Dashboard Visual Improvements

**Decision:** Make entire dashboard tiles clickable with proper spacing and hover effects.

**Rationale:**
- Previous implementation had overlapping "Manage" text
- Users expect entire card to be clickable (not just small link)
- Better visual hierarchy with consistent spacing
- Hover effects provide clear interactive feedback

**Implementation:**
- Wrapped entire card in `<Link>` component
- Increased card padding from default to 30px
- Added flexbox with `justifyContent: 'space-between'`
- Implemented hover transform and shadow effects
- Set minimum card width to 220px for better grid layout

**Date:** 2025-12-27

**Status:** ✅ Implemented

---

### 11.2 Enhanced Case Creation Workflow

**Decision:** Allow image upload during case creation with live previews.

**Rationale:**
- Original workflow required saving case before uploading images
- Clinicians need to see images while documenting findings and diagnosis
- Poor UX to switch between form and separate image upload page
- Difficult to write accurate findings without visual reference

**Implementation Details:**
1. **Two-Column Layout:**
   - Left: Case form (title, clinical history, findings, diagnosis, discussion points)
   - Right: Image preview sidebar (sticky, scrollable)
   - Grid adapts: single column when no images, two-column when images present

2. **Image Selection:**
   - Drag-and-drop style file input with clear visual indicator
   - Multiple file selection support
   - Client-side validation (image types, 5MB limit per file)
   - FileReader API for instant previews

3. **Image Preview Features:**
   - 200px height thumbnail with proper object-fit
   - Filename display
   - Optional description input for each image
   - Remove button for each image
   - Counter showing total images selected

4. **Save Workflow:**
   - Step 1: Create/update case (text fields)
   - Step 2: Upload images sequentially with progress indicator
   - Shows: "Creating case..." → "Uploading image 1 of 3..." → "Complete!"
   - Error handling: continues with other uploads if one fails
   - 500ms delay after completion before navigation (user feedback)

5. **Edit Mode Support:**
   - Loads existing images with descriptions
   - Distinguishes between existing and new images
   - Can add new images to existing case
   - Remove button works for both existing and new images

**Alternatives Considered:**
- **Multi-step wizard**: More complex, requires state persistence between steps
- **Backend support for draft cases**: Would require API changes, overkill for this use case
- **Cloud upload before save**: Privacy concerns, orphaned files if user cancels

**Trade-offs:**
- Case is created before images upload (minor) - acceptable because it's atomic to user
- Images uploaded sequentially not in parallel - simpler error handling, progress tracking
- No drag-and-drop reordering - can be added later if needed

**Benefits:**
✅ Clinicians see images while writing findings
✅ Better workflow matches clinical documentation process
✅ Clear progress feedback during multi-image upload
✅ Works for both create and edit modes
✅ Graceful error handling per image

**Date:** 2025-12-27

**Status:** ✅ Implemented

**Files Modified:**
- `frontend/src/pages/CaseForm.jsx` (150 → 410 lines)
- `frontend/src/pages/Dashboard.jsx`

---

## 12. Lessons Learned

### What Worked Well
✅ FastAPI's automatic validation caught bugs early
✅ Socket.IO reconnection logic "just worked"
✅ MongoDB's flexible schema allowed rapid iteration
✅ Beanie's Link[] system simplified relationships

### Challenges Faced
⚠️ Timer synchronization required multiple iterations
⚠️ WebSocket authentication needed custom middleware
⚠️ File upload size limits needed nginx config (production)

### Would Do Differently
🔄 Start with comprehensive E2E tests earlier
🔄 Implement logging/monitoring from day 1
🔄 Consider GraphQL for complex nested queries

---

## 13. Decision Log Summary

| # | Decision | Date | Status |
|---|----------|------|--------|
| 1 | FastAPI backend | 2025-11-22 | ✅ Implemented |
| 2 | MongoDB + Beanie | 2025-11-22 | ✅ Implemented |
| 3 | Socket.IO for WebSocket | 2025-11-22 | ✅ Implemented |
| 4 | React + Vite frontend | 2025-11-22 | ✅ Implemented |
| 5 | SHA-256 + bcrypt passwords | 2025-11-22 | ✅ Implemented |
| 6 | RBAC (3 roles) | 2025-11-22 | ✅ Implemented |
| 7 | Embedded image documents | 2025-11-22 | ✅ Implemented |
| 8 | Server-authoritative state | 2025-11-22 | ✅ Implemented |
| 9 | 30s timer heartbeat | 2025-11-22 | ✅ Implemented |
| 10 | JPEG/PNG only | 2025-11-22 | ✅ Implemented |
| 11 | 10MB file limit | 2025-11-22 | ✅ Implemented |
| 12 | Smart deletion/archiving | 2025-11-22 | ✅ Implemented |
| 13 | React Hooks (no Redux) | 2025-11-22 | ✅ Implemented |
| 14 | Full-screen session view | 2025-11-22 | ✅ Implemented |
| 15 | pytest for testing | 2025-11-22 | 🚧 In Progress |
| 16 | Docker deployment | 2025-11-22 | ⏳ Planned |
| 17 | DICOM support | 2025-11-22 | ❌ Deferred |
| 18 | Dashboard UX improvements | 2025-12-27 | ✅ Implemented |
| 19 | Case creation image workflow | 2025-12-27 | ✅ Implemented |

---

**Document Version:** 1.1
**Last Updated:** 2025-12-27
**Next Review:** After first production deployment
