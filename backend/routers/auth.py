from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User, UserRole
from routers.deps import create_access_token, get_current_user, hash_password, verify_password
from routers.utils import err, ok
from schemas.user import Token, UserCreate, UserOut

router = APIRouter()


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


@router.get("/bootstrap-status")
async def bootstrap_status(db: AsyncSession = Depends(get_db)):
    """Public endpoint so the frontend can decide whether to show /register."""
    count = await db.scalar(select(func.count(User.id)))
    return ok({"needs_bootstrap": count == 0})


@router.post("/register")
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    # Only allow self-registration when the database has zero users.
    # The first registered account is forced to admin so the system has an owner.
    # All subsequent users must be created by an admin via POST /api/users.
    user_count = await db.scalar(select(func.count(User.id)))
    if user_count and user_count > 0:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Self-registration is disabled. Ask an admin to create your account.",
        )
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=UserRole.admin,
        availability=payload.availability,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return ok(UserOut.model_validate(user), status=201)


@router.post("/login", response_model=Token)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id)
    # OAuth2 spec requires the token at the top level (not wrapped),
    # so Swagger UI / standard clients can pick it up automatically.
    return Token(access_token=token)


@router.get("/me")
async def me(current_user: User = Depends(get_current_user)):
    return ok(UserOut.model_validate(current_user))


@router.post("/logout")
async def logout():
    # JWT is stateless; instruct client to discard token
    return ok({"message": "Logged out successfully"})


@router.post("/change-password")
async def change_password(
    payload: PasswordChange,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from current")
    current_user.hashed_password = hash_password(payload.new_password)
    await db.commit()
    return ok({"message": "Password updated"})
