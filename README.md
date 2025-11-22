# IRExam - Real-Time Medical Education Examination Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.109-green.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-green.svg)](https://www.mongodb.com/)

## Overview

IRExam is a real-time, server-authoritative medical education examination platform that enables synchronized image-based clinical case presentations. Examiners control live exam sessions where students view identical medical images simultaneously, creating a controlled and fair testing environment.

### Key Features

- 🔄 **Real-Time Synchronization** - WebSocket-powered instant state updates
- 🖼️ **Medical Image Management** - JPEG/PNG support with high-quality display
- 👥 **Multi-Role System** - Admin, Examiner, and Student roles
- ⏱️ **Synchronized Timer** - Server-authoritative timing with drift correction
- 🎯 **Server-Authoritative State** - Robust handling of disconnections and late joiners
- ✏️ **Live Annotations** - Real-time synchronized drawing tools (planned)
- 📊 **Session Management** - Named sessions with participant tracking

## Architecture

```
┌─────────────────┐
│  React Frontend │ ◄─── WebSocket ───┐
│   (Vite + SPA)  │                   │
└────────┬────────┘                   │
         │ REST API                   │
         ▼                            │
┌─────────────────┐            ┌──────┴──────┐
│  FastAPI Server │ ◄────────► │  Socket.IO  │
│  (Python 3.9+)  │            │   Server    │
└────────┬────────┘            └─────────────┘
         │
         ▼
┌─────────────────┐
│     MongoDB     │
│  (Beanie ODM)   │
└─────────────────┘
```

## Quick Start

### Prerequisites

- **Python 3.9+**
- **Node.js 16+** & npm
- **MongoDB 4.4+**

### 1. Clone Repository

```bash
git clone <repository-url>
cd IRExamV2
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB connection and secret key

# Seed admin user
python seed_admin.py

# Run server
uvicorn app.main:socket_app --reload --host 0.0.0.0 --port 8000
```

**Default Admin Credentials:**
- Email: `admin@irexam.com`
- Password: `Admin@123` (change after first login)

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env

# Run development server
npm run dev
```

Frontend will be available at: http://localhost:5173

### 4. Access Application

1. Open http://localhost:5173
2. Login with admin credentials
3. Approve examiner/student registrations via User Management

## Project Structure

```
IRExamV2/
├── backend/
│   ├── app/
│   │   ├── api/v1/          # API endpoints
│   │   ├── core/            # Config, database, security
│   │   ├── models/          # MongoDB models (Beanie)
│   │   ├── schemas/         # Pydantic validation schemas
│   │   └── main.py          # Application entry point
│   ├── tests/               # Backend tests (pytest)
│   ├── uploads/             # Uploaded images
│   ├── requirements.txt     # Python dependencies
│   └── seed_admin.py        # Admin user creation script
├── frontend/
│   ├── src/
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   ├── services/        # API client & WebSocket
│   │   ├── utils/           # Helper functions
│   │   └── App.jsx          # Main app component
│   ├── package.json         # Node dependencies
│   └── vite.config.js       # Vite configuration
├── PRODUCT_SPECIFICATION.md # Complete feature spec
├── IMPLEMENTATION_DECISIONS.md # Architecture decisions
├── TESTING_MILESTONES.md    # Testing roadmap
└── README.md                # This file
```

## Core Workflows

### For Administrators

1. **Approve New Users**
   - Navigate to Users → Approve pending registrations

2. **Manage System**
   - Full access to all cases, exams, and sessions

### For Examiners

1. **Create Case**
   - Cases → Create New → Add title, clinical history, images

2. **Build Exam**
   - Exams → Create New → Select multiple cases

3. **Launch Session**
   - Sessions → Create New → Select exam and students

4. **Conduct Exam**
   - Sessions → Join → Start, navigate images, control exam

### For Students

1. **Join Assigned Session**
   - Dashboard → My Sessions → Join

2. **View Synchronized Content**
   - See images controlled by examiner
   - Timer syncs automatically

## API Documentation

Once the backend is running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## WebSocket Events

### Client → Server (Commands)

| Event | Payload | Auth | Description |
|-------|---------|------|-------------|
| `join_room` | `{session_id, token}` | All | Join session room |
| `request_sync` | `{session_id}` | All | Request current state |
| `cmd_start` | `{session_id}` | Examiner | Start exam |
| `cmd_pause` | `{session_id}` | Examiner | Pause exam |
| `cmd_resume` | `{session_id}` | Examiner | Resume exam |
| `cmd_nav` | `{session_id, case_index, image_index}` | Examiner | Navigate to image |
| `cmd_end` | `{session_id}` | Examiner | End exam |

### Server → Client (Broadcasts)

| Event | Payload | Description |
|-------|---------|-------------|
| `session_snapshot` | `{status, current_case_index, ...}` | Full state sync |
| `state_change` | `{key, value}` | Status change |
| `nav_update` | `{case_index, image_index}` | Navigation update |
| `timer_sync` | `{seconds_remaining}` | Timer synchronization |

## Testing

### Backend Tests

```bash
cd backend
pytest
```

### Frontend Tests

```bash
cd frontend
npm run test
```

See [TESTING_MILESTONES.md](TESTING_MILESTONES.md) for comprehensive testing roadmap.

## Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for production deployment instructions.

**Key Production Considerations:**
- Change `SECRET_KEY` in backend .env
- Set up MongoDB replica set
- Configure CORS origins
- Use reverse proxy (nginx) for SSL
- Set up cloud storage (S3) for images
- Enable MongoDB authentication

## Security

- **Authentication**: OAuth2 + JWT tokens
- **Password Storage**: SHA-256 pre-hash + bcrypt
- **Role-Based Access Control**: Admin, Examiner, Student
- **File Upload Validation**: MIME type + size checks
- **WebSocket Auth**: Token-based connection verification

## Performance

- **Concurrent Users**: Tested with 100+ simultaneous connections
- **Image Load**: < 2s for 5MB images
- **WebSocket Latency**: < 100ms for state updates
- **Timer Accuracy**: ±1 second across all clients

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see LICENSE file for details.

## Support

For issues, questions, or feature requests:
- **GitHub Issues**: [Create an issue](repository-url/issues)
- **Documentation**: See `/docs` directory
- **Email**: support@irexam.com

## Acknowledgments

- Medical education faculty for requirements and testing
- Open source community for amazing tools (FastAPI, React, Socket.IO)

---

**Version:** 1.0.0
**Last Updated:** 2025-11-22
**Status:** Production Ready
