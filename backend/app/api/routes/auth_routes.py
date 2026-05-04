from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session

from app.domain.entities.users import UserCreate, UserResponse, Token, TokenRefresh
from app.application.services.auth_service import AuthService
from app.infrastructure.repositories.user_repository import UserRepository

from app.infrastructure.utils.dependencies import get_auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse, status_code=201)
async def register(user_data: UserCreate, service: Annotated[AuthService, Depends(get_auth_service)]):
    try:
        user = await service.register(user_data)
        return UserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            is_active=user.is_active
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/login", response_model=Token)
async def login(
    service: Annotated[AuthService, Depends(get_auth_service)],
    username: str = Form(...),
    password: str = Form(...)
):
    auth_result = await service.authenticate(username, password)
    if not auth_result:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    user, access_token, refresh_token = auth_result
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/refresh", response_model=Token)
async def refresh_token(
    refresh_data: TokenRefresh, 
    service: Annotated[AuthService, Depends(get_auth_service)]
):
    try:
        new_access, new_refresh = await service.refresh_tokens(refresh_data.refresh_token)
        return Token(access_token=new_access, refresh_token=new_refresh, token_type="bearer")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
