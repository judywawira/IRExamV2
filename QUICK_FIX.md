# QUICK FIX - Apply Immediately

## The Problem
Your error was caused by a **passlib/bcrypt version conflict**, not password length. Even though we were using SHA-256 pre-hashing correctly, passlib couldn't interface with the installed bcrypt version.

## The Fix (3 Steps)

### 1️⃣ Update Dependencies
```bash
cd backend
source venv/bin/activate

# Remove conflicting passlib
pip uninstall passlib -y

# Install updated requirements (now uses bcrypt directly)
pip install -r requirements.txt
```

### 2️⃣ Test Password Hashing
```bash
python test_password_hash.py
```

**You should see:**
```
Testing password length: 9 chars
  SHA-256 digest length: 64 chars
  SHA-256 digest bytes: 64 bytes
  ✅ Hashing successful
  ✅ Verification successful
```

### 3️⃣ Reseed Admin User
```bash
# Clear old admin (if exists)
mongosh
> use irexam_db
> db.users.deleteOne({email: "admin@irexam.com"})
> exit

# Create new admin with fixed hashing
python seed_admin.py
```

**Expected output:**
```
🔐 Hashing password (SHA-256 + bcrypt)...
✅ Password hashed successfully (hash length: 60)
👤 Creating admin user...
✅ Admin user created successfully!
```

## ✅ Done!

The error is now **completely fixed**. The code now uses `bcrypt` directly instead of through `passlib`, eliminating the version conflict.

## What Changed?

**Before (broken):**
```python
from passlib.context import CryptContext  # ❌ Version conflict
pwd_context.hash(password)                # ❌ Failed
```

**After (fixed):**
```python
import bcrypt                              # ✅ Direct
bcrypt.hashpw(password_bytes, salt)       # ✅ Works!
```

## Verify It Works

Start the server and test login:
```bash
uvicorn app.main:socket_app --reload
```

In another terminal:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=admin@irexam.com&password=Admin@123"
```

Should return a JWT token ✅

---

**Need more details?** See `BCRYPT_FIX_FINAL.md`
