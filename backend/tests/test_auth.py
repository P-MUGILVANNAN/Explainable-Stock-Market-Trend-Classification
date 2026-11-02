import pytest
from app.core.security import get_password_hash, verify_password, create_access_token, decode_access_token

def test_password_hashing():
    raw = "ResearchSecurePass123!"
    hashed = get_password_hash(raw)
    assert hashed != raw
    assert verify_password(raw, hashed) is True
    assert verify_password("wrong_pass", hashed) is False

def test_jwt_token_flow():
    email = "analyst@stockxai.internal"
    role = "admin"
    token = create_access_token(subject=email, role=role)
    assert isinstance(token, str)

    payload = decode_access_token(token)
    assert payload is not None
    assert payload["sub"] == email
    assert payload["role"] == role
    assert "exp" in payload

