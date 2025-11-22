# IRExam Frontend

React frontend for the IRExam real-time medical education examination platform.

## Features

- **React 18** - Modern UI library with hooks
- **Vite** - Fast build tool and dev server
- **React Router** - Client-side routing
- **Socket.IO Client** - Real-time WebSocket communication
- **Axios** - HTTP client for API calls
- **Responsive Design** - Works on desktop and tablets

## Prerequisites

- Node.js 16+
- npm or yarn

## Installation

```bash
# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env if needed (default values work for local development)
```

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

Development server runs at: http://localhost:5173

## Project Structure

```
frontend/
├── src/
│   ├── components/      # Reusable components
│   │   ├── Navbar.jsx
│   │   └── PrivateRoute.jsx
│   ├── pages/           # Page components
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── Dashboard.jsx
│   │   ├── CasesList.jsx
│   │   ├── ExamsList.jsx
│   │   ├── SessionsList.jsx
│   │   ├── SessionView.jsx  # Real-time exam view
│   │   └── UsersList.jsx
│   ├── services/        # API & WebSocket services
│   │   ├── api.js           # REST API client
│   │   └── socket.js        # WebSocket service
│   ├── utils/           # Helper functions
│   │   └── auth.js          # Authentication utilities
│   ├── styles/          # CSS styles
│   │   └── index.css
│   ├── App.jsx          # Main app component
│   └── main.jsx         # Application entry point
├── public/              # Static assets
├── index.html           # HTML template
├── package.json         # Dependencies
└── vite.config.js       # Vite configuration
```

## Key Components

### Session View (Real-Time)

The `SessionView` component handles the real-time synchronized exam experience:

- **For Examiners**: Full control panel with navigation, start/pause/resume/end buttons
- **For Students**: Read-only view that follows examiner's actions
- **WebSocket**: Automatic reconnection and state synchronization
- **Timer**: Server-authoritative timing with local display

### API Service

The `api.js` service provides:
- Authentication (login, register)
- User management
- Case CRUD operations
- Exam management
- Session management
- Automatic JWT token injection
- Error handling

### WebSocket Service

The `socket.js` service manages:
- Connection with authentication
- Room joining
- Event listeners
- Command emission (examiner controls)
- Automatic reconnection

## Environment Variables

```bash
VITE_API_URL=http://localhost:8000      # Backend API URL
VITE_WS_URL=http://localhost:8000       # WebSocket URL
```

## Testing

```bash
# Run tests (when implemented)
npm run test
```

## Building for Production

```bash
# Create production build
npm run build

# Output directory: dist/
# Deploy contents of dist/ to web server
```

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Troubleshooting

### WebSocket Connection Issues

1. Check backend is running on correct port
2. Verify CORS settings in backend
3. Check browser console for errors
4. Ensure JWT token is valid

### Image Upload Issues

1. Check file size (max 10MB)
2. Verify file type (JPEG or PNG only)
3. Check backend upload directory permissions

## Contributing

See main [README.md](../README.md) for contribution guidelines.
