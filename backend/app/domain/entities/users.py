import re

from pydantic import BaseModel, EmailStr, field_validator

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

    @field_validator('password')
    def password_complexity(cls, v: str):
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one number")
        if not re.search(r"[@$!%*?&]", v):
            raise ValueError("Password must contain at least one special character")
        return v

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    is_active: bool
    role: str

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"

class TokenRefresh(BaseModel):
    refresh_token: str

class PasswordReset(BaseModel):
    token: str
    new_password: str

    @field_validator('new_password')
    def password_strenght(cls, v):
        if len(v) < 8:
            raise ValueError("Password must be at leats 8 characters long")
        return v

class PasswordResetRequest(BaseModel):
    email: EmailStr
