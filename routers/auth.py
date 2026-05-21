"""
routers/auth.py
───────────────
FastAPI router xử lý xác thực người dùng:
  POST /auth/register  — đăng ký tài khoản mới
  POST /auth/login     — đăng nhập, trả JWT token
  GET  /auth/me        — xem thông tin user hiện tại
  POST /auth/logout    — ghi log đăng xuất

Dependencies:
  get_current_user()  — decode JWT từ Authorization header
  require_admin()     — chỉ cho phép role='admin'
"""
import json
import random
import string
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status, Request, UploadFile, File
import os
import shutil
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel, EmailStr, field_validator
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from config import config
from database.database import get_db, hash_password, verify_password
from database.models import User, ActivityLog, PredictionLog

router = APIRouter(prefix="/auth", tags=["auth"])

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


# ─── Pydantic Schemas ─────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str
    password: str

    @field_validator("username")
    @classmethod
    def username_must_be_email(cls, v):
        v = v.strip()
        if "@gmail.com" not in v and "@" not in v:
            raise ValueError("Tên đăng nhập phải là một địa chỉ email (VD: abc@gmail.com)")
        return v

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v):
        if len(v) < 8:
            raise ValueError("Mật khẩu phải có ít nhất 8 ký tự")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class PredictionLogRequest(BaseModel):
    drug: Optional[str] = None
    disease: Optional[str] = None
    dataset: Optional[str] = None
    type: Optional[str] = "single"
    top_k: Optional[int] = 10
    result_count: Optional[int] = 0

class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    old_password: Optional[str] = None
    new_password: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    contact: str  # Email or phone


# ─── JWT Helpers ─────────────────────────────────────────────────────────────
def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=config.jwt_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, config.jwt_secret, algorithm=config.jwt_algorithm)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, config.jwt_secret, algorithms=[config.jwt_algorithm])
    except JWTError:
        return None


# ─── Auth Dependencies ────────────────────────────────────────────────────────
def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """Returns the User object if token is valid, else None (guest)."""
    if not token or token == "null" or token == "undefined":
        return None
    payload = decode_token(token)
    if not payload:
        return None
    username: str = payload.get("sub")
    if not username:
        return None
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    return user


def require_logged_in(user: Optional[User] = Depends(get_current_user)) -> User:
    """Raises 401 if not authenticated."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Cần đăng nhập để thực hiện thao tác này",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def require_admin(user: User = Depends(require_logged_in)) -> User:
    """Raises 403 if not admin."""
    if user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Chỉ quản trị viên mới có quyền truy cập",
        )
    return user


def _get_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


# ─── Routes ──────────────────────────────────────────────────────────────────
@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: RegisterRequest, request: Request, db: Session = Depends(get_db)):
    """Đăng ký tài khoản mới."""
    try:
        # Check duplicates
        if db.query(User).filter(User.username == body.username).first():
            raise HTTPException(status_code=400, detail="Tên đăng nhập (Email) đã tồn tại")

        new_user = User(
            username      = body.username,
            email         = body.username, # Email and username are the same
            password_hash = hash_password(body.password),
            role          = "user",
            is_active     = True,
            created_at    = datetime.utcnow(),
        )
        db.add(new_user)
        db.flush()

        db.add(ActivityLog(
            user_id    = new_user.id,
            action     = "REGISTER",
            detail     = json.dumps({"username": body.username}),
            ip_address = _get_ip(request),
        ))
        db.commit()

        return {"message": "Đăng ký thành công!", "user_id": new_user.id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")


@router.post("/login")
async def login(body: LoginRequest, request: Request, db: Session = Depends(get_db)):
    """Đăng nhập và nhận JWT token."""
    try:
        user = db.query(User).filter(User.username == body.username).first()
        
        # Check password hash or reset code
        is_valid_password = False
        if user:
            if verify_password(body.password, user.password_hash):
                is_valid_password = True
            elif user.reset_code and body.password == user.reset_code:
                if user.reset_code_expires and user.reset_code_expires > datetime.utcnow():
                    is_valid_password = True
                    # Clear reset code after single use (optional, or wait for them to change password)
                    # user.reset_code = None
                    # user.reset_code_expires = None

        if not user or not is_valid_password:
            raise HTTPException(status_code=401, detail="Tài khoản hoặc mật khẩu không đúng (hoặc mã khôi phục đã hết hạn)")
        if not user.is_active:
            raise HTTPException(status_code=403, detail="Tài khoản đã bị vô hiệu hóa")

        # Update last login
        user.last_login = datetime.utcnow()

        # Log activity
        db.add(ActivityLog(
            user_id    = user.id,
            action     = "LOGIN",
            detail     = json.dumps({"username": user.username}),
            ip_address = _get_ip(request),
        ))
        db.commit()

        token = create_access_token({"sub": user.username, "role": user.role})
        return {
            "access_token": token,
            "token_type":   "bearer",
            "role":         user.role,
            "username":     user.username,
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, request: Request, db: Session = Depends(get_db)):
    """Tạo mã khôi phục mật khẩu tạm thời gửi qua 'email' hoặc 'phone'."""
    try:
        user = db.query(User).filter(
            (User.email == body.contact) | (User.phone == body.contact) | (User.username == body.contact)
        ).first()

        if not user:
            # We return success anyway to prevent username enumeration attacks
            return {"message": "Nếu tài khoản tồn tại, mã khôi phục đã được gửi đi.", "code": None}
            
        # Generate random 6-character code
        reset_code = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        
        user.reset_code = reset_code
        user.reset_code_expires = datetime.utcnow() + timedelta(minutes=15)
        
        db.add(ActivityLog(
            user_id    = user.id,
            action     = "FORGOT_PASSWORD",
            detail     = json.dumps({"contact": body.contact}),
            ip_address = _get_ip(request),
        ))
        db.commit()
        
        # In a real app, send email/SMS here. For now, return it in the response for demo purposes.
        return {
            "message": "Đã tạo mã khôi phục thành công. Mã có hiệu lực trong 15 phút.",
            "code": reset_code,
            "note": "Vui lòng dùng mã này làm mật khẩu đăng nhập, sau đó vào Hồ sơ để đổi mật khẩu mới."
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi server: {str(e)}")

@router.get("/me")
async def get_me(current_user: User = Depends(require_logged_in)):
    """Xem thông tin tài khoản hiện tại."""
    return current_user.to_dict()

@router.put("/me")
async def update_me(
    body: UpdateProfileRequest,
    current_user: User = Depends(require_logged_in),
    db: Session = Depends(get_db)
):
    """Cập nhật email hoặc mật khẩu cá nhân."""
    try:
        # Cập nhật họ tên và số điện thoại
        if body.full_name is not None:
            current_user.full_name = body.full_name
        if body.phone is not None:
            current_user.phone = body.phone
            
        # Cập nhật mật khẩu
        if body.new_password:
            # Check old password OR if logged in via reset code, they might not know old password.
            # But they are logged in. We can require old password unless they used reset_code.
            # We'll allow change if old_password matches hash OR old_password matches reset_code.
            if not body.old_password:
                raise HTTPException(status_code=400, detail="Cần nhập mật khẩu cũ (hoặc mã khôi phục) để đổi mật khẩu mới")
            
            is_valid_old = False
            if verify_password(body.old_password, current_user.password_hash):
                is_valid_old = True
            elif current_user.reset_code and body.old_password == current_user.reset_code:
                if current_user.reset_code_expires and current_user.reset_code_expires > datetime.utcnow():
                    is_valid_old = True
            
            if not is_valid_old:
                raise HTTPException(status_code=400, detail="Mật khẩu cũ không đúng hoặc mã khôi phục hết hạn")
                
            if len(body.new_password) < 8:
                raise HTTPException(status_code=400, detail="Mật khẩu mới phải có ít nhất 8 ký tự")
                
            current_user.password_hash = hash_password(body.new_password)
            current_user.reset_code = None
            current_user.reset_code_expires = None
            
        db.commit()
        return {"message": "Cập nhật hồ sơ thành công", "user": current_user.to_dict()}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: User = Depends(require_logged_in),
    db: Session = Depends(get_db)
):
    """Upload ảnh đại diện cá nhân."""
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File phải là hình ảnh")
        
    try:
        upload_dir = os.path.join(config.root_dir, "uploads", "avatars")
        os.makedirs(upload_dir, exist_ok=True)
        
        # Lấy đuôi file
        ext = file.filename.split(".")[-1] if "." in file.filename else "jpg"
        filename = f"user_{current_user.id}_{int(datetime.utcnow().timestamp())}.{ext}"
        filepath = os.path.join(upload_dir, filename)
        
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Xóa avatar cũ (nếu có và nếu nằm trong uploads/avatars)
        if current_user.avatar_url and "/uploads/avatars/" in current_user.avatar_url:
            old_filename = current_user.avatar_url.split("/")[-1]
            old_filepath = os.path.join(upload_dir, old_filename)
            if os.path.exists(old_filepath):
                try:
                    os.remove(old_filepath)
                except:
                    pass
                    
        # Cập nhật đường dẫn avatar_url vào db
        current_user.avatar_url = f"/uploads/avatars/{filename}"
        db.commit()
        
        return {"message": "Cập nhật avatar thành công", "avatar_url": current_user.avatar_url}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Lỗi upload file: {str(e)}")


@router.post("/logout")
async def logout(
    request: Request,
    current_user: User = Depends(require_logged_in),
    db: Session = Depends(get_db),
):
    """Ghi log đăng xuất (token vẫn hợp lệ đến khi hết hạn — stateless JWT)."""
    try:
        db.add(ActivityLog(
            user_id    = current_user.id,
            action     = "LOGOUT",
            detail     = json.dumps({"username": current_user.username}),
            ip_address = _get_ip(request),
        ))
        db.commit()
        return {"message": "Đã đăng xuất thành công"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
