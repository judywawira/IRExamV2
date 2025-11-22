"""
IRExam - Main Application Entry Point
FastAPI backend with real-time WebSocket support
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import socketio
import os

from app.core.config import settings
from app.core.database import init_db, close_db
from app.api.v1 import api_router
from app.core.socketio_server import sio


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Handle startup and shutdown events"""
    # Startup
    await init_db()
    print("✅ Database connected")

    # Create uploads directory if it doesn't exist
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    print(f"✅ Upload directory ready: {settings.UPLOAD_DIR}")

    yield

    # Shutdown
    await close_db()
    print("❌ Database connection closed")


# Create FastAPI app
app = FastAPI(
    title="IRExam API",
    description="Real-Time Medical Education Examination Platform",
    version="1.0.0",
    lifespan=lifespan
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include API routes
app.include_router(api_router, prefix="/api/v1")

# Mount Socket.IO
socket_app = socketio.ASGIApp(
    sio,
    other_asgi_app=app,
    socketio_path="/socket.io"
)


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "name": "IRExam API",
        "version": "1.0.0",
        "status": "healthy"
    }


@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "websocket": "ready"
    }
