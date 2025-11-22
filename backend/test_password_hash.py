"""
Test script to verify password hashing works correctly
Run: python test_password_hash.py
"""
import hashlib
from passlib.context import CryptContext

# Test with different password lengths
test_passwords = [
    "short",
    "Admin@123",
    "a" * 50,   # 50 chars
    "a" * 72,   # Exactly 72 chars
    "a" * 100,  # 100 chars (would fail without SHA-256)
    "a" * 200,  # 200 chars (would definitely fail without SHA-256)
]

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def sha256_hash(password: str) -> str:
    """Pre-hash with SHA-256"""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()


def hash_password(password: str) -> str:
    """Hash with SHA-256 + bcrypt"""
    sha256_pass = sha256_hash(password)
    print(f"  SHA-256 digest length: {len(sha256_pass)} chars")
    return pwd_context.hash(sha256_pass)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify password"""
    sha256_pass = sha256_hash(plain)
    return pwd_context.verify(sha256_pass, hashed)


print("Testing password hashing with SHA-256 + bcrypt\n")
print("=" * 60)

for password in test_passwords:
    print(f"\nTesting password length: {len(password)} chars")
    print(f"Password: {'*' * min(len(password), 20)}...")

    try:
        # Hash the password
        hashed = hash_password(password)
        print(f"  ✅ Hashing successful")
        print(f"  Hash: {hashed[:60]}...")

        # Verify the password
        is_valid = verify_password(password, hashed)
        if is_valid:
            print(f"  ✅ Verification successful")
        else:
            print(f"  ❌ Verification failed!")

    except Exception as e:
        print(f"  ❌ Error: {e}")

print("\n" + "=" * 60)
print("Test complete!")
print("\nNOTE: All passwords should hash successfully with SHA-256 pre-hashing")
print("SHA-256 always produces a 64-character hex string, under bcrypt's 72-byte limit")
