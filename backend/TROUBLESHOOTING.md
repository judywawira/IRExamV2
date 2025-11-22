# IRExam Backend - Troubleshooting Guide

## Password Hashing Error: "password cannot be longer than 72 bytes"

### Error Message
```
ValueError: password cannot be longer than 72 bytes, truncate manually if necessary
```

### Cause
This error occurs when a password longer than 72 characters is being hashed. Bcrypt has a hard limit of 72 bytes for password input.

### Solution
The IRExam platform uses **SHA-256 pre-hashing** to handle passwords of any length. This is implemented in `app/core/security.py`:

```python
def hash_password(password: str) -> str:
    # Step 1: SHA-256 pre-hash (produces 64-char hex string)
    sha256_pass = hashlib.sha256(password.encode()).hexdigest()
    # Step 2: Bcrypt hash the SHA-256 digest
    return pwd_context.hash(sha256_pass)
```

If you're still seeing this error, it means the password is being hashed **without** going through the SHA-256 step.

### Diagnostic Steps

1. **Check your .env file**
   ```bash
   cat backend/.env | grep ADMIN_PASSWORD
   ```
   The password length doesn't matter for our system, but verify it's set correctly.

2. **Test the password hashing**
   ```bash
   cd backend
   source venv/bin/activate
   python test_password_hash.py
   ```
   This will test passwords of various lengths.

3. **Verify you're using the correct hashing function**
   Always use `hash_password()` from `app.core.security`:
   ```python
   from app.core.security import hash_password

   # Correct ✅
   hashed = hash_password("any-length-password")

   # Wrong ❌ - Don't use pwd_context directly
   # hashed = pwd_context.hash("password")
   ```

4. **Check imports in your code**
   If you've modified the code, ensure you're not bypassing the SHA-256 step:
   ```python
   # In any file creating users
   from app.core.security import hash_password  # ✅ Correct

   # Not this
   from passlib.context import CryptContext  # ❌ Don't use directly
   ```

### Quick Fix

If you need to quickly resolve the issue:

1. **Use a shorter admin password temporarily**
   Edit `backend/.env`:
   ```bash
   ADMIN_PASSWORD=Admin@123
   ```

2. **Re-run the seed script**
   ```bash
   cd backend
   python seed_admin.py
   ```

### For Developers

If you're implementing custom user creation or password updates, always use the provided functions:

**Hashing a password:**
```python
from app.core.security import hash_password

user.password = hash_password(plain_password)
```

**Verifying a password:**
```python
from app.core.security import verify_password

is_valid = verify_password(plain_password, user.password)
```

**Never do this:**
```python
# ❌ WRONG - Bypasses SHA-256
from passlib.context import CryptContext
pwd_context = CryptContext(schemes=["bcrypt"])
hashed = pwd_context.hash(password)  # Will fail if password > 72 bytes
```

### Still Having Issues?

If the error persists after following these steps:

1. Check that all imports use `app.core.security`
2. Verify no custom password hashing code exists
3. Clear your MongoDB database and re-seed:
   ```bash
   # In MongoDB shell
   use irexam_db
   db.users.drop()
   ```
   Then run `python seed_admin.py` again

4. Check the stack trace to see exactly where the error occurs:
   ```
   File ".../security.py", line XX
   ```
   This will tell you which function is failing.

### Technical Details

**Why SHA-256 + bcrypt?**
- SHA-256 hash is always 64 characters (hex digest)
- 64 characters < 72 bytes (bcrypt limit)
- Allows unlimited password length for users
- Maintains bcrypt's strong security properties

**Password flow:**
```
User Password (any length)
    ↓
SHA-256 Hash (64 chars)
    ↓
Bcrypt Hash (stored in DB)
```

**Verification flow:**
```
User enters password
    ↓
SHA-256 Hash (64 chars)
    ↓
Compare with bcrypt hash
    ↓
True/False
```

### Prevention

To prevent this issue in new code:

1. **Always** import from `app.core.security`
2. **Never** use passlib directly
3. **Test** with long passwords (100+ chars)
4. **Document** password requirements (if any)

---

Last Updated: 2025-11-22
