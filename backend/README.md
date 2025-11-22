# IRExam Backend

FastAPI backend for the IRExam real-time medical education examination platform.

## Features

- **FastAPI Framework** - Modern, fast async Python web framework
- **MongoDB + Beanie ODM** - NoSQL database with async support
- **JWT Authentication** - Secure token-based authentication
- **WebSocket (Socket.IO)** - Real-time synchronization
- **Role-Based Access Control** - Admin, Examiner, Student roles
- **Image Upload** - Medical image management (JPEG, PNG)

## Prerequisites

- Python 3.9+
- MongoDB 4.4+
- pip

## Installation

1. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows
```

2. **Install dependencies**
```bash
pip install -r requirements.txt
```

3. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. **Seed admin user**
```bash
python seed_admin.py
```

## Running the Application

### Development Server

```bash
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

### Production Server

```bash
uvicorn app.main:socket_app --host 0.0.0.0 --port 8000 --workers 4
```

## API Documentation

Once running, visit:
- **Interactive API Docs (Swagger)**: http://localhost:8000/docs
- **Alternative Docs (ReDoc)**: http://localhost:8000/redoc

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/          # API endpoints
│   │       ├── auth.py       # Authentication
│   │       ├── users.py      # User management
│   │       ├── cases.py      # Case management
│   │       ├── exams.py      # Exam management
│   │       └── sessions.py   # Session management
│   ├── core/            # Core functionality
│   │   ├── config.py         # Configuration
│   │   ├── database.py       # Database connection
│   │   ├── security.py       # Auth & security
│   │   └── socketio_server.py # WebSocket server
│   ├── models/          # Database models
│   │   ├── user.py
│   │   ├── case.py
│   │   ├── exam.py
│   │   └── session.py
│   ├── schemas/         # Pydantic schemas
│   │   ├── user.py
│   │   ├── case.py
│   │   ├── exam.py
│   │   └── session.py
│   └── main.py          # Application entry point
├── tests/               # Test files
├── uploads/             # Uploaded images
├── requirements.txt     # Dependencies
└── seed_admin.py        # Admin seed script
```

## Authentication

### Register User
```bash
POST /api/v1/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123",
  "first_name": "John",
  "last_name": "Doe",
  "role": "examiner"
}
```

### Login
```bash
POST /api/v1/auth/login
Form data:
  username: user@example.com
  password: SecurePass123
```

Returns JWT token for authentication.

### Using the Token
```bash
Authorization: Bearer <token>
```

## WebSocket Events

### Client -> Server
- `join_room` - Join session room
- `request_sync` - Request current state
- `cmd_start` - Start exam (examiner only)
- `cmd_pause` - Pause exam (examiner only)
- `cmd_resume` - Resume exam (examiner only)
- `cmd_nav` - Navigate to image (examiner only)
- `cmd_end` - End exam (examiner only)
- `cmd_annotate` - Add annotation (examiner only)
- `cmd_clear_annotations` - Clear annotations (examiner only)

### Server -> Client
- `session_snapshot` - Full state sync
- `state_change` - Status change (active, paused, completed)
- `nav_update` - Image navigation update
- `timer_sync` - Timer synchronization (every 30s)
- `annotation_stream` - Annotation updates

## Testing

```bash
pytest
```

## Environment Variables

See `.env.example` for all configuration options.

Key variables:
- `MONGODB_URL` - MongoDB connection string
- `DATABASE_NAME` - Database name
- `SECRET_KEY` - JWT secret key (change in production!)
- `ADMIN_EMAIL` - Initial admin email
- `ADMIN_PASSWORD` - Initial admin password
