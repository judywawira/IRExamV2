"""
Security utilities for authentication and authorization
Implements SHA-256 pre-hashing + bcrypt for password storage
"""
from datetime import datetime, timedelta
from typing import Optional
import hashlib
import bcrypt

from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from app.core.config import settings
from app.models.user import User


# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


def sha256_hash(password: str) -> str:
    """
    Pre-hash password with SHA-256
    This bypasses bcrypt's 72-byte limit
    Returns a 64-character hex string (32 bytes * 2)
    """
    if not isinstance(password, str):
        raise ValueError("Password must be a string")

    # SHA-256 produces a 64-character hex digest (always under 72 bytes)
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def hash_password(password: str) -> str:
    """
    Hash password using SHA-256 + bcrypt
    Step 1: SHA-256 pre-hash (bypasses 72-byte bcrypt limit)
    Step 2: bcrypt hash for storage

    Args:
        password: Raw password string (any length)

    Returns:
        Bcrypt hash of the SHA-256 digest
    """
    if not password:
        raise ValueError("Password cannot be empty")

    # Pre-hash with SHA-256 to handle any password length
    sha256_pass = sha256_hash(password)

    # Convert to bytes for bcrypt
    password_bytes = sha256_pass.encode('utf-8')

    # Use bcrypt directly (not passlib) to avoid version conflicts
    # Generate salt and hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    # Return as string for database storage
    return hashed.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify password against hash

    Args:
        plain_password: Raw password to verify
        hashed_password: Stored bcrypt hash

    Returns:
        True if password matches, False otherwise
    """
    if not plain_password or not hashed_password:
        return False

    try:
        # Pre-hash the plain password the same way we did during hashing
        sha256_pass = sha256_hash(plain_password)

        # Convert to bytes
        password_bytes = sha256_pass.encode('utf-8')
        hashed_bytes = hashed_password.encode('utf-8')

        # Use bcrypt directly to verify
        return bcrypt.checkpw(password_bytes, hashed_bytes)
    except Exception:
        # If verification fails for any reason, return False
        return False


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
