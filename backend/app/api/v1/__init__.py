"""
API v1 Router
Combines all API endpoints
"""
from fastapi import APIRouter

from app.api.v1 import auth, users, cases, exams, sessions

api_router = APIRouter()

# Include all route modules
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(cases.router, prefix="/cases", tags=["Cases"])
api_router.include_router(exams.router, prefix="/exams", tags=["Exams"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["Sessions"])
