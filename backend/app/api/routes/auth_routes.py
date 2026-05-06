from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Form, BackgroundTasks
from fastapi.security import OAuth2PasswordRequestForm

from app.domain.models import User
from app.domain.entities.users import UserCreate, UserResponse, Token, TokenRefresh, PasswordReset, PasswordResetRequest
from app.application.services.auth_service import AuthService

from app.infrastructure.utils.dependencies import get_auth_service, get_current_user

router = APIRouter()

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
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()]
):
    auth_result = await service.authenticate(form_data.username, form_data.password)
    if not auth_result:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    user, access_token, refresh_token = auth_result
    return Token(access_token=access_token, refresh_token=refresh_token)

@router.post("/logout")
async def logout(
    service: Annotated[AuthService, Depends(get_auth_service)],
    refresh_token: str = Form(...),
):
    try:
        await service.logout(refresh_token)
        return {"message": "Successfully logged out"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

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

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return UserResponse(
        id=str(current_user.id),
        username=str(current_user.username),
        email=str(current_user.email),
        is_active=bool(current_user.is_active)
    )

# @router.post("/request-password-reset")
# async def request_password_reset(
#     reset_request: PasswordResetRequest,
#     service: Annotated[AuthService, Depends(get_auth_service)],
#     background_tasks: BackgroundTasks
# ):
#     user = service.user_repo.get_by_email(reset_request.email)
#     if not user:
#         return {"detail": "No user with given email is exist! Register first"}
    
#     token = service.create_access_token( )
#     user.token = token

# @router.post("/reset-password")
# async def reset_password(
#     reset_data: PasswordReset,
#     service: Annotated[AuthService, Depends(get_auth_service)]
# ):
    