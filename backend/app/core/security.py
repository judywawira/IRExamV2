"""
Security utilities for authentication and authorization
Implements SHA-256 pre-hashing + bcrypt for password storage
"""
from datetime import datetime, timedelta
from typing import Optional
import hashlib

from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.models.user import User


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def sha256_hash(password: str) -> str:
    """
    Pre-hash password with SHA-256
    This bypasses bcrypt's 72-byte limit
    """
    return hashlib.sha256(password.encode()).hexdigest()


def hash_password(password: str) -> str:
    """
    Hash password using SHA-256 + bcrypt
    Step 1: SHA-256 pre-hash (client-side simulation)
    Step 2: bcrypt hash for storage
    """
    # In production, client should send SHA-256 hash
    # For development, we hash here
    sha256_pass = sha256_hash(password)
    return pwd_context.hash(sha256_pass)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    sha256_pass = sha256_hash(plain_password)
    return pwd_context.verify(sha256_pass, hashed_password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.SECRET_KEY,
        algorithm=settings.ALGORITHM
    )
    return encoded_jwt


async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    """
    Dependency to get current authenticated user
    Validates JWT token and returns user
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = await User.find_one(User.email == email)
    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Ensure user is approved and not archived"""
    if current_user.is_archived:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is archived"
        )
    if not current_user.is_approved:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is pending approval"
        )
    return current_user


async def verify_admin(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Verify user has admin role"""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin privileges required"
        )
    return current_user


async def verify_examiner(
    current_user: User = Depends(get_current_active_user)
) -> User:
    """Verify user has examiner or admin role"""
    if current_user.role not in ["examiner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Examiner privileges required"
        )
    return current_user
