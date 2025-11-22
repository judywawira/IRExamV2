# IRExam - Product Specification Document
## Real-Time Medical Education Examination Platform

**Version:** 1.2
**Last Updated:** 2025-11-22
**Status:** Production Ready
**Architecture:** FastAPI (Backend) + React (Frontend) + MongoDB

---

## Executive Summary

IRExam is a real-time, synchronized medical education examination platform designed for delivering image-based clinical cases to residents. The system enables examiners to conduct live, synchronized exams where the student views the same high-quality medical images (JPEG/PNG) the examiner is displaying simultaneously, creating a controlled testing environment.

### Key Differentiators
- **Real-time synchronization** - The student and the examiner see identical images at the same time.
- **Server-Authoritative State** - Robust handling of disconnections and late joiners.
- **Multi-user roles** - Admin, Examiner, and Student with distinct capabilities.
- **Live Annotation** - Real-time synchronized drawing tools on images.
- **Session management** - Named sessions with examiner and student pairing support.

---

## 1. Product Overview

### 1.1 Purpose
IRExam addresses the need for synchronized, controlled examination environments in medical education. It replaces manual image presentation with an automated system that ensures all students experience identical examination conditions using standard image formats.

### 1.2 Target Users
- **Medical Education Administrators** - Manage cases, exams, users, and sessions.
- **Medical Examiners/Faculty** - Create cases, conduct live exam sessions, annotate images.
- **Medical Residents/Students** - Participate in synchronized examination sessions.

### 1.3 Core Value Proposition
- Eliminates timing discrepancies in image-based examinations.
- Provides real-time annotation capabilities for teaching.
- Ensures fair examination conditions.
- Enables remote, synchronized medical education.

---

## 2. Infrastructure Overview
- **Backend:** FastAPI (Python)
- **Frontend:** React (Vite)
- **Database:** MongoDB (Motor/Beanie ODM)
- **Real-time Communication:** WebSocket (python-socketio)
- **File Storage:** Local filesystem (configurable to cloud storage)

---

## 3. User Roles and Permissions

### 3.1 Admin
**Purpose:** Full system management.

**Capabilities:**
- Create and manage image-based cases with clinical histories.
- Upload medical images (JPEG, PNG).
- Create exams by selecting multiple cases.
- Manage users (approve, archive, delete).
- Create and manage exam sessions.
- Assign examiners and students to sessions.
- View all system data.

**Access:**
- All API endpoints.
- Admin dashboard.
- **Note:** First admin is created via seed script; subsequent admins require approval.

### 3.2 Examiner
**Purpose:** Create educational content and conduct exams.

**Capabilities:**
- Create and manage their own cases.
- Upload medical images (JPEG, PNG).
- Create exam sessions from existing exams.
- Control live exam sessions in real-time.
- Navigate through cases and images (synchronized to all students).
- Start, pause, resume, and end exams.
- Use annotation tools on images (circle, arrow, rectangle, freehand).
- Monitor participants in real-time.

**Access:**
- Own cases only (create, read, update, delete).
- Read all exams.
- Create and manage own sessions.
- Real-time exam control.
- Requires admin approval.

### 3.3 Student
**Purpose:** Participate in examinations.

**Capabilities:**
- Join assigned exam sessions.
- View synchronized images controlled by examiner.
- See clinical history, findings, and diagnosis for each case.
- View examiner annotations in real-time.
- Synchronized countdown timer.

**Access:**
- Read-only access to assigned sessions.
- Join sessions via "Waiting Room".
- Full-screen presentation mode (no navigation controls).
- Requires admin approval.

---

## 4. Core Features

### 4.1 Case Management

#### 4.1.1 Case Creation
- **Title** (required): Descriptive case name.
- **Clinical History** (optional): Patient background.
- **Findings** (optional): Observable findings.
- **Diagnosis** (optional): Final diagnosis.
- **Discussion Points** (optional): Case-level teaching points.
- **Images**: Upload 1-n images per case.
- **Supported Formats**: High-quality JPEG, PNG.

#### 4.1.2 Image Operations
- **Upload**: Drag-and-drop interface.
- **Preview**: Thumbnail view.
- **Delete**: Remove specific images from case (prevented if case is in active session).
- **Metadata**: Description per image.

### 4.2 Exam Management

#### 4.2.1 Exam Creation
- **Title** (required): Exam name.
- **Description**: Purpose/details.
- **Case Selection**: Select multiple cases from library.
- **Duration**: Exam duration in minutes.

#### 4.2.2 Exam Cloning
- Creates duplicate exam with " (Copy)" suffix.
- Copies all case references for template-based creation.

### 4.3 Session Management

#### 4.3.1 Session Lifecycle
1. **Scheduled**: Created, waiting to start.
2. **Active**: Exam running, timer active, students viewing images.
3. **Paused**: Timer stopped, content hidden/blurred for students.
4. **Completed**: Exam ended, redirect to dashboard.

#### 4.3.2 Archive System
- **Smart Delete**: Sessions with assigned students are archived (soft delete), not permanently removed, to preserve history.

---

## 5. Real-Time Exam Execution & Synchronization

### 5.1 Architectural Overview
The real-time engine uses **FastAPI** with `python-socketio` (AsyncServer). The architecture follows a **Server-Authoritative State Model**. The server holds the "Source of Truth" for the exam state; clients (React) are strictly renderers of that state. This ensures that if a student refreshes their browser or loses internet momentarily, they immediately snap back to the correct image and time upon reconnection.

### 5.2 Examiner Controls (The Driver)
The examiner client is the only role authorized to mutate the session state.

* **State Mutations (Emitters):**
    * `start_exam`: Triggers server to set `status = 'active'` and initialize `start_time`.
    * `pause_exam`: Triggers server to set `status = 'paused'` and freeze the timer.
    * `nav_image`: Sends `{ case_index, image_index }` to server.
    * `end_exam`: Triggers session closure.
* **Passive Updates:** The examiner also listens to the broadcast channel to confirm their actions were received and processed by the server.

### 5.3 Student Experience (The Observer)
The student client is a "dumb terminal" that renders whatever state the server dictates.

* **Navigation Lock:** Student clients ignore local keyboard/mouse inputs for navigation.
* **View Modes:**
    1.  **Waiting Room:** (`status: 'scheduled'`) - Shows session metadata and "Waiting for Examiner" message.
    2.  **Live Exam:** (`status: 'active'`) - Shows the image defined by `server_state.current_image`.
    3.  **Frozen/Paused:** (`status: 'paused'`) - Shows a "Paused" overlay; image is hidden to prevent unauthorized study during breaks.

### 5.4 Synchronization & Reconnection Logic

#### 5.4.1 The "Sync-On-Connect" Handshake
When a user (Student or Examiner) joins a session, the following handshake guarantees state alignment:

1.  **Client:** Connects via WebSocket and joins the specific `room_{session_id}`.
2.  **Client:** Emits `request_session_sync` event immediately upon connection.
3.  **Server:** Looks up the active session in database/memory.
4.  **Server:** Emits a distinct `session_snapshot` event to **that specific socket only**.
    * **Snapshot Payload:**
        ```json
        {
          "status": "in_progress",
          "currentCaseIndex": 2,
          "currentImageIndex": 4,
          "serverTime": "2024-03-15T10:30:00Z",
          "examDuration": 3600,
          "timeElapsed": 1200,
          "isPaused": false
        }
        ```
5.  **Client:** React `useEffect` receives snapshot and batch-updates all local state variables instantly.

#### 5.4.2 Handling Late Joins & Reconnections
* **Scenario:** Student X loses Wi-Fi at 10:05 AM and reconnects at 10:08 AM.
* **Behavior:**
    1.  Socket re-establishes connection automatically.
    2.  Client fires `request_session_sync`.
    3.  Server sends current state (which is now 3 minutes ahead).
    4.  **Outcome:** Student X's screen "jumps" immediately to the image currently being discussed. They do *not* start from the beginning.

#### 5.4.3 Timer Synchronization (Drift Prevention)
To prevent the "10:00" on the student's screen from drifting differently than the "10:00" on the examiner's screen:

* **Server Authority:** The server calculates the `expected_end_time` when the exam starts.
* **Transmission:** The server broadcasts a `heartbeat` event every 30 seconds containing the absolute `seconds_remaining`.
* **Client Logic:**
    * The React client runs a local `setInterval` (1s) for smooth UI decrementing.
    * When a `heartbeat` or `session_snapshot` is received, the client **overwrites** its local timer with the server's value.

### 5.5 Socket Event Dictionary

#### 5.5.1 Client -> Server (Commands)
| Event Name | Payload | Authorization | Description |
| :--- | :--- | :--- | :--- |
| `join_room` | `{ session_id, token }` | All | Authenticates and adds socket to room. |
| `request_sync` | `{ session_id }` | All | Requests immediate state snapshot. |
| `cmd_start` | `{ session_id }` | Examiner Only | Sets status to active. |
| `cmd_nav` | `{ session_id, case_idx, img_idx }` | Examiner Only | Updates current image coordinates. |
| `cmd_annotate` | `{ session_id, data }` | Examiner Only | Adds annotation to current image. |

#### 5.5.2 Server -> Client (Broadcasts)
| Event Name | Payload | Target | Description |
| :--- | :--- | :--- | :--- |
| `session_snapshot` | `{ full_state_object }` | Single Socket | Sent on join/reconnect. |
| `state_change` | `{ key: "status", val: "active" }` | Room | Sent on Start/Pause/End. |
| `nav_update` | `{ case_idx, img_idx }` | Room | Sent when examiner changes image. |
| `timer_sync` | `{ seconds_remaining }` | Room | Periodic heartbeat (every 30s). |
| `annotation_stream`| `{ operation, data }` | Room | Real-time drawing vectors. |

---

## 6. Annotation System

### 6.1 Tools
Available to examiners during exam sessions for standard images:
1.  **Freehand Drawing**: Custom shapes/highlighting.
2.  **Circle**: Highlight circular regions.
3.  **Arrow**: Point to findings.
4.  **Rectangle**: Define bounding boxes.
5.  **Clear**: Remove all annotations.

### 6.2 Synchronization
- **Events**: `annotation_added`, `annotation_cleared`.
- **Persistence**: Annotations are saved to the database so they reappear if an examiner navigates away and comes back to the image.

---

## 7. Technical Specifications

### 7.1 Database Schema (MongoDB/Beanie)

#### 7.1.1 User Collection
```python
class User(Document):
    email: Indexed(str, unique=True)
    password: str  # SHA-256 pre-hashed + bcrypt
    first_name: str
    last_name: str
    role: Enum['admin', 'examiner', 'student']
    is_approved: bool = False
    is_archived: bool = False
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

#### 7.1.2 Case Collection

```python
class CaseImage(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    filename: str
    original_name: str
    path: str
    mimetype: str
    size: int
    description: Optional[str] = None
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)

class CaseAnnotation(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    image_id: str
    image_index: int
    tool_type: str  # 'circle', 'arrow', 'rectangle', 'freehand'
    data: Dict[str, Any]  # Coordinates and style data
    created_by: Link[User]
    is_visible: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Case(Document):
    title: str
    clinical_history: Optional[str] = None
    findings: Optional[str] = None
    diagnosis: Optional[str] = None
    discussion_points: Optional[str] = None
    images: List[CaseImage] = []
    annotations: List[CaseAnnotation] = []

    # Usage tracking to prevent deletion of active content
    usage_history: List[Dict[str, Any]] = []

    created_by: Link[User]
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "cases"
```

### 7.2 API Security

  - **Authentication**: OAuth2 with Password Flow (Bearer Token).
  - **Password Hashing**:
      - **Step 1 (Client/Pre-process)**: Passwords pre-hashed with SHA-256 to generate 64-char string (bypasses bcrypt 72-byte limit).
      - **Step 2 (Storage)**: `Passlib` with `bcrypt` hashes the SHA-256 string.
  - **Authorization**:
      - `Depends(get_current_active_user)` middleware.
      - Role-based dependencies: `Depends(verify_admin)`, `Depends(verify_examiner)`.

### 7.3 File Handling

  - **Upload Endpoint**: `POST /api/cases/upload`
  - **Validation**: Python `python-multipart` checks for MIME types `image/jpeg`, `image/png`.
  - **Storage**: Files saved to `./uploads` (dev) or S3 Bucket (production) with UUID filenames.

---

## 8. User Interface Specifications

### 8.1 Layout Structure

  - **Admin/Examiner**: Dashboard with sidebar navigation (Cases, Exams, Sessions).
  - **Student**: Minimalist dashboard showing "My Sessions" cards.

### 8.2 Exam Session View (Student)

**Full-Screen Presentation Mode**:

  - **Header**: Session Name | Status Badge | Timer.
  - **Main Area**: Large central image or text (Clinical History).
  - **No Controls**: No Previous/Next buttons (controlled by server).
  - **Feedback**:
      - `status == 'scheduled'`: "Waiting for Examiner to Start".
      - `status == 'paused'`: "Session Paused".
      - `reconnecting`: Toast notification "Reconnecting to session...".

### 8.3 Exam Session View (Examiner)

  - **Main Area**: Image display with overlay annotation canvas.
  - **Sidebar**: Thumbnail grid of all case images.
  - **Controls**: Start, Pause, Resume, End buttons.
  - **Annotation Toolbar**: Pen, Arrow, Circle, Clear.
