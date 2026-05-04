import os

class Settings:
    def __init__(self):
        self.SECRET_KEY = os.getenv("SECRET_KEY", "change-me-in-production")
        self.ALGORITHM = "HS256"
        self.ACCESS_TOKEN_EXPIRE_MINUTES = 30
        self.REFRESH_TOKEN_EXPIRE_DAYS = 7
        self.SAM2_URL = "http://localhost:5000/annotate"
        self.VALIDATION_URL = "http://localhost:3033/validate"

settings = Settings()