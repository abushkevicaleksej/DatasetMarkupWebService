import datetime

from sqlalchemy.orm import Session

from app.domain.models import TokenBlacklist

class TokenBlacklistRepository:
    def __init__(self, db: Session):
        self.db = db

    def add(self, jti: str, token_type: str, expired_at: datetime):
        entry = TokenBlacklist(
            token_jti=jti,
            token_type=token_type,
            expired_at=expired_at
        )
        self.db.add(entry)
        self.db.commit()

    def is_blacklisted(self, jti: str) -> bool:
        return self.db.query(TokenBlacklist).filter(
            TokenBlacklist.token_jti == jti,
            TokenBlacklist.expired_at > datetime.datetime.utcnow()
        ).first() is not None