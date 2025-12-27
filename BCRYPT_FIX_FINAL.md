# CRITICAL FIX: Bcrypt/Passlib Version Conflict Resolution

## Problem Identified

The bcrypt password length error was caused by a **version incompatibility between passlib and bcrypt**, not the password length itself.

### Error Messages
```
(trapped) error reading bcrypt version
AttributeError: module 'bcrypt' has no attribute '__about__'
ValueError: password cannot be longer than 72 bytes
```

Even though SHA-256 digest was exactly 64 characters, passlib couldn't properly interface with the installed bcrypt version.

## Solution: Use bcrypt Directly

**Changed from:** passlib → bcrypt (indirect)
**Changed to:** bcrypt directly (no passlib layer)

### What Changed

#### 1. **Removed passlib dependency**
```python
# OLD (caused version conflicts)
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])
hashed = pwd_context.hash(password)

# NEW (direct bcrypt, no conflicts)
import bcrypt
hashed = bcrypt.hashpw(password_bytes, bcrypt.gensalt())
```

#### 2. **Updated requirements.txt**
```diff
- passlib[bcrypt]==1.7.4
+ bcrypt==4.1.2
```

#### 3. **Enhanced password functions**
All password hashing now uses bcrypt directly with proper byte handling.

## How to Apply Fix

### Step 1: Reinstall Dependencies
```bash
cd backend
source venv/bin/activate

# Remove old passlib
pip uninstall passlib -y

# Install new requirements
pip install -r requirements.txt
```

### Step 2: Verify Installation
```bash
python -c "import bcrypt; print(f'bcrypt version: {bcrypt.__version__}')"
```

Should output: `bcrypt version: 4.1.2` (or similar)

### Step 3: Test Password Hashing
```bash
python test_password_hash.py
```

**Expected output:**
```
Testing password length: 9 chars
  SHA-256 digest length: 64 chars
  SHA-256 digest bytes: 64 bytes
  ✅ Hashing successful
  ✅ Verification successful

Testing password length: 200 chars
  SHA-256 digest length: 64 chars
  SHA-256 digest bytes: 64 bytes
  ✅ Hashing successful
  ✅ Verification successful
```

### Step 4: Clear Database and Reseed
```bash
# Drop users collection (if exists)
mongosh
> use irexam_db
> db.users.drop()
> exit

# Reseed admin
python seed_admin.py
```

**Expected output:**
```
🌱 Seeding database...
📧 Admin email: admin@irexam.com
🔑 Admin password length: 9 characters
🔌 Connecting to MongoDB...
✅ Connected to database: irexam_db
🔐 Hashing password (SHA-256 + bcrypt)...
✅ Password hashed successfully (hash length: 60)
👤 Creating admin user...
✅ Admin user created successfully!
```

### Step 5: Test Login
```bash
# Start server
uvicorn app.main:socket_app --reload

# In another terminal, test login
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@irexam.com&password=Admin@123"
```

Should return JWT token ✅

## Technical Details

### Why Direct bcrypt Works

**Before (passlib layer):**
```
Password → passlib.CryptContext → bcrypt (version conflict!)
```

**After (direct):**
```
Password → SHA-256 → bcrypt.hashpw() → Success ✅
```

### Code Changes

**File: `backend/app/core/security.py`**

```python
import bcrypt

def hash_password(password: str) -> str:
    # Step 1: SHA-256 pre-hash
    sha256_pass = hashlib.sha256(password.encode()).hexdigest()

    # Step 2: Convert to bytes
    password_bytes = sha256_pass.encode('utf-8')  # 64 bytes

    # Step 3: bcrypt hash directly
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)

    return hashed.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    sha256_pass = hashlib.sha256(plain_password.encode()).hexdigest()
    password_bytes = sha256_pass.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(password_bytes, hashed_bytes)
```

## Verification Checklist

After applying fix, verify:

- [ ] `pip list | grep bcrypt` shows bcrypt 4.1.2 (not passlib)
- [ ] `python test_password_hash.py` all tests pass
- [ ] `python seed_admin.py` succeeds without errors
- [ ] Login API returns valid JWT token
- [ ] No more "72 bytes" errors in logs

## Why This Happened

1. **passlib** is an abstraction layer over multiple hashing libraries
2. **bcrypt** updated its API in newer versions
3. **passlib** (v1.7.4) expected older bcrypt API attributes
4. Newer **bcrypt** (v4.x) removed `__about__` attribute
5. **passlib** failed to load bcrypt backend properly
6. **Error bubbled up** as "password too long" (misleading!)

## Benefits of Direct bcrypt

✅ No version conflicts
✅ Simpler dependency tree
✅ More control over hashing parameters
✅ Better error messages
✅ Easier to debug

## If You Still See Errors

### Error: "No module named 'bcrypt'"
```bash
pip install bcrypt==4.1.2
```

### Error: Old passlib still installed
```bash
pip uninstall passlib -y
pip install -r requirements.txt
```

### Error: Permission issues with pip
```bash
pip install --user bcrypt==4.1.2
```

## Rollback (if needed)

To rollback to passlib (not recommended):
```bash
pip install passlib[bcrypt]==1.7.4
pip install bcrypt==3.2.0  # Older compatible version
```

Then revert security.py to use CryptContext.

---

**Status:** ✅ **RESOLVED**
**Root Cause:** passlib/bcrypt version incompatibility
**Solution:** Use bcrypt directly, remove passlib
**Date:** 2025-11-22
