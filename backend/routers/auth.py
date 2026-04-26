from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from models.user import User
from routers.deps import create_access_token, get_current_user, hash_password, verify_password
from routers.utils import err, ok
from schemas.user import Token, UserCreate, UserOut

router = APIRouter()


@router.post("/register")
async def register(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        name=payload.name,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
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
