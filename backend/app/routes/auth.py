import os
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pwdlib import PasswordHash
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth_models import Registration, Login
from ..schemas import (
    RegistrationRequest,
    RegistrationResponse,
    LoginRequest,
    LoginResponse,
    ProfileUpdateRequest,
    ProfileResponse
)

load_dotenv()

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")
)

if not SECRET_KEY:
    raise ValueError("SECRET_KEY is missing. Add it to your .env file.")

password_hash = PasswordHash.recommended()
security = HTTPBearer()


def create_access_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    payload = {
        "sub": str(user_id),
        "exp": expire
    }

    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        user_id = payload.get("sub")

        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
                headers={"WWW-Authenticate": "Bearer"}
            )

    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"}
        )

    user = db.query(Registration).filter(
        Registration.id == int(user_id),
        Registration.is_active == True
    ).first()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found or inactive",
            headers={"WWW-Authenticate": "Bearer"}
        )

    return user


@router.post(
    "/register",
    response_model=RegistrationResponse,
    status_code=status.HTTP_201_CREATED
)
def register_user(
    data: RegistrationRequest,
    db: Session = Depends(get_db)
):
    email = str(data.email).lower().strip()
    username = data.username.strip()

    existing_email = db.query(Registration).filter(
        Registration.email == email
    ).first()

    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered"
        )

    existing_username = db.query(Registration).filter(
        Registration.username == username
    ).first()

    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username is already taken"
        )

    user = Registration(
        full_name=data.full_name.strip(),
        username=username,
        email=email,
        password_hash=password_hash.hash(data.password)
    )

    try:
        db.add(user)
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not create the account"
        )

    return user


@router.post("/login", response_model=LoginResponse)
def login_user(
    data: LoginRequest,
    db: Session = Depends(get_db)
):
    email = str(data.email).lower().strip()

    user = db.query(Registration).filter(
        Registration.email == email
    ).first()

    valid_password = (
        user is not None
        and password_hash.verify(data.password, user.password_hash)
        and user.is_active
    )

    login_record = Login(
        user_id=user.id if user else None,
        attempted_email=email,
        success=bool(valid_password)
    )

    db.add(login_record)
    db.commit()

    if not valid_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me", response_model=ProfileResponse)
def get_my_profile(
    current_user: Registration = Depends(get_current_user)
):
    return current_user


@router.put("/profile", response_model=ProfileResponse)
def update_profile(
    data: ProfileUpdateRequest,
    current_user: Registration = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()

    if data.username is not None:
        username = data.username.strip()

        existing_user = db.query(Registration).filter(
            Registration.username == username,
            Registration.id != current_user.id
        ).first()

        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username is already taken"
            )

        current_user.username = username

    try:
        db.commit()
        db.refresh(current_user)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not update the profile"
        )

    return current_user