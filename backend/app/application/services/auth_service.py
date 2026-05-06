import uuid
from datetime import datetime, timedelta

from jose import jwt, JWTError
from passlib.context import CryptContext

from app.domain.models import User
from app.domain.entities.users import UserCreate
from app.infrastructure.repositories.user_repository import UserRepository
from app.infrastructure.repositories.token_repository import TokenBlacklistRepository

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(self, user_repo: UserRepository, token_blacklist_repo: TokenBlacklistRepository):
        self.user_repo = user_repo
        self.token_blacklist_repo = token_blacklist_repo

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def hash_password(self, password: str) -> str:
        return pwd_context.hash(password)

    def create_access_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": expire, "type": "access"})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    async def register(self, user_data: UserCreate) -> User:
        existing = self.user_repo.get_by_email(user_data.email)
        if existing:
            raise ValueError("Email already registered")
        existing = self.user_repo.get_by_username(user_data.username)
        if existing:
            raise ValueError("Username already taken")
        hashed = self.hash_password(user_data.password)
        user = self.user_repo.create(
            username=user_data.username,
            email=user_data.email,
            hashed_password=hashed,
            role="user"
        )
        return user

    async def authenticate(self, username: str, password: str) -> tuple[User, str, str] | None:
        user = self.user_repo.get_by_username(username)
        if not user or not self.verify_password(password, user.hashed_password):
            return None
        if not user.is_active:
            raise ValueError("Inactive user")
        access_token = self.create_access_token({"sub": user.id})
        refresh_token = self.create_refresh_token({"sub": user.id})
        return user, access_token, refresh_token

    async def refresh_tokens(self, refresh_token: str) -> tuple[str, str]:
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            if payload.get("type") != "refresh":
                raise JWTError("Invalid token type")
            jti = payload.get("jti")
            if not jti:
                raise JWTError("Missing jti")
            
            if self.token_blacklist_repo.is_blacklisted(jti):
                raise ValueError("Token has been revoked")
            
            user_id = payload.get("sub")
            user = self.user_repo.get_by_id(user_id)
            if not user or not user.is_active:
                raise ValueError("User not found or inactive")
            
            new_access = self.create_access_token({"sub": user_id})
            new_refresh = self.create_refresh_token({"sub": user_id})
            return new_access, new_refresh
        except JWTError:
            raise ValueError("Invalid refresh token")
        
    def create_refresh_token(self, data: dict) -> str:
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        jti = str(uuid.uuid4())
        to_encode.update({
            "exp": expire,
            "type": "refresh",
            "jti": jti
        })
        token = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return token

    async def logout(self, refresh_token: str):
        try:
            payload = jwt.decode(refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            jti = payload.get("jti")
            exp = payload.get("exp")
            if not jti or not exp:
                raise ValueError("Invalid token")
            expired_at = datetime.fromtimestamp(exp)
            self.token_blacklist_repo.add(jti, "refresh", expired_at)
        except JWTError:
            raise ValueError("Invalid token")