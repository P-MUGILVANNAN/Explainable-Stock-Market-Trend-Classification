from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends
from app.database.connection import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.schemas.user import UserRegister, UserLogin, UserResponse, Token
from app.api.deps import require_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserRegister):
    db = get_db()
    existing = db.users.find_one({"email": user_in.email.lower()})
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email already exists")

    new_user = {
        "name": user_in.name,
        "email": user_in.email.lower(),
        "password_hash": get_password_hash(user_in.password),
        "role": user_in.role or "user",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    insert_res = db.users.insert_one(new_user)
    new_user["id"] = str(insert_res.inserted_id)

    access_token = create_access_token(new_user["email"], role=new_user["role"])
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": new_user["id"],
            "name": new_user["name"],
            "email": new_user["email"],
            "role": new_user["role"],
            "created_at": new_user["created_at"]
        }
    }

@router.post("/login", response_model=Token)
def login(login_in: UserLogin):
    db = get_db()
    user = db.users.find_one({"email": login_in.email.lower()})
    if not user or not verify_password(login_in.password, user.get("password_hash", "")):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    user_id = str(user.get("_id", ""))
    access_token = create_access_token(user["email"], role=user.get("role", "user"))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user_id,
            "name": user.get("name", "User"),
            "email": user["email"],
            "role": user.get("role", "user"),
            "created_at": user.get("created_at")
        }
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(require_current_user)):
    return {
        "id": str(current_user.get("_id", "")),
        "name": current_user.get("name", ""),
        "email": current_user.get("email", ""),
        "role": current_user.get("role", "user"),
        "created_at": current_user.get("created_at")
    }

