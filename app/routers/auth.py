from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.services.auth_service import (
    AuthError,
    change_password,
    get_profile,
    login,
    signup,
    update_profile,
)

router = APIRouter(prefix="/api/users", tags=["users-auth-profile"])


class SignupRequest(BaseModel):
    student_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=4, max_length=128)


class LoginRequest(BaseModel):
    student_id: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1, max_length=128)


class PasswordChangeRequest(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=4, max_length=128)


class ProfileUpdateRequest(BaseModel):
    nickname: str | None = Field(default=None, max_length=50)
    department: str | None = Field(default=None, max_length=100)
    student_year: str | None = Field(default=None, max_length=20)
    # 현재 프론트는 FileReader.readAsDataURL()로 만든 base64 data URL을 전달한다.
    photo_url: str | None = None


class AuthResponse(BaseModel):
    student_id: str
    message: str


class ProfileResponse(BaseModel):
    student_id: str
    nickname: str | None = None
    department: str | None = None
    student_year: str | None = None
    photo_url: str | None = None
    message: str | None = None


def _bad_request(exc: AuthError) -> HTTPException:
    return HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.post("/signup", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
def signup_user(payload: SignupRequest) -> AuthResponse:
    try:
        return AuthResponse(**signup(payload.student_id, payload.password))
    except AuthError as exc:
        raise _bad_request(exc) from exc


@router.post("/login", response_model=AuthResponse)
def login_user(payload: LoginRequest) -> AuthResponse:
    try:
        return AuthResponse(**login(payload.student_id, payload.password))
    except AuthError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc


@router.patch("/{student_id}/password", response_model=AuthResponse)
def change_user_password(student_id: str, payload: PasswordChangeRequest) -> AuthResponse:
    try:
        return AuthResponse(
            **change_password(
                student_id,
                payload.current_password,
                payload.new_password,
            )
        )
    except AuthError as exc:
        message = str(exc)
        code = (
            status.HTTP_401_UNAUTHORIZED
            if "기존 비밀번호" in message
            else status.HTTP_400_BAD_REQUEST
        )
        raise HTTPException(status_code=code, detail=message) from exc


@router.get("/{student_id}/profile", response_model=ProfileResponse)
def get_user_profile(student_id: str) -> ProfileResponse:
    try:
        return ProfileResponse(**get_profile(student_id))
    except AuthError as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(exc)) from exc


@router.patch("/{student_id}/profile", response_model=ProfileResponse)
def update_user_profile(student_id: str, payload: ProfileUpdateRequest) -> ProfileResponse:
    try:
        return ProfileResponse(
            **update_profile(
                student_id,
                nickname=payload.nickname,
                department=payload.department,
                student_year=payload.student_year,
                photo_url=payload.photo_url,
            )
        )
    except AuthError as exc:
        raise _bad_request(exc) from exc
