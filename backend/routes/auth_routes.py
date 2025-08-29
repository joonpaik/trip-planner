from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from database import get_db
from starlette import status
from database import SessionLocal
from models.user_model import User
from models.refresh_token_model import RefreshToken
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, Field
from typing import Annotated, Any
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import os

"""
    Auth Layout:
        User Register account:
            - added to users table
        User login:
            - Pass in username and password
            - Verify by users table
            - If valid, create access and refresh Token
        User refresh:
            - Pass in refresh token
            - Verify if refresh token is valid
            - If valid, create new access token
        User logout:
            - Invalidate refresh token
"""

router = APIRouter(prefix="/auth", tags=["Authentication"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# Password hashing
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/login")

# Dependencies
db_dependency = Annotated[Session, Depends(get_db)]

"""
    Swagger BaseModel Classes
"""
class CreateUserRequest(BaseModel):
    username: str
    email: str
    first_name: str = Field(alias="firstname")
    last_name: str = Field(alias="lastname")
    password: str
class Token(BaseModel):
    access_token: str
    token_type: str
class UserLoginRequest(BaseModel):
    username: str 
    password: str 
class UserModel(BaseModel):
    username: str
    uid: str
class UserLoginResponse(BaseModel):
    user: UserModel
    access_token: str
    token_type: str
"""
    Helper Methods
"""
# Getting current user from token
# TODO: Use this in other APIs that require authentication
@router.post("/user",response_model=UserModel,status_code=status.HTTP_200_OK)
async def get_current_user(token: Token, db: db_dependency):
    print("Received token for user retrieval:", token)
    try:
        payload = jwt.decode(token.access_token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Decoded JWT payload:", payload)
        username: str = payload.get("sub")
        uid = payload.get("id")
        
        if username is None or uid is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")
        
        # Check if refresh token is expired
        result = db.query(RefreshToken).filter(
            (RefreshToken.user_id == uid) & 
            (RefreshToken.expires_at > datetime.now(timezone.utc)) & 
            (RefreshToken.is_revoked == False)
        ).first()

        if not result:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired or invalid")

        return {'username': username, 'uid': uid}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

# Verifying if user exists and if the passwords match (verify())
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(or_(
        User.username == username,
        User.email == username
    )).first()

    if not user:
        return False
    if not bcrypt_context.verify(password, user.hashed_password):
        return False
    return user

# Create Access Token
def create_access_token(username: str, user_id: int, expires_delta: timedelta):
    encode = {"sub": username, "id": user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

# Verify Access Token
def verify_access_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None

# Creating Refresh Token
def create_refresh_token(username: str, user_id: int, expires_delta: timedelta, db: Session):
    encode = {"sub": username, "id": user_id}
    expires = datetime.now(timezone.utc) + expires_delta
    encode.update({"exp": expires})

    # Input into database
    refresh_token_model = RefreshToken(
        user_id=user_id,
        token_hash=jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM),
        expires_at=expires,
        created_at=datetime.now(timezone.utc),
        is_revoked=False,
        device_info={"ip": "127.0.0.1"}
    )
    db.add(refresh_token_model)
    db.commit()
    return jwt.encode(encode, SECRET_KEY, algorithm=ALGORITHM)

# Verify Refresh Token
def verify_refresh_token(token: str, db: Session):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        print("Decoded refresh token payload:", payload)
        token_id = payload.get("id")
        if token_id is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

        # Check if the refresh token exists in the database
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.id == token_id, 
            RefreshToken.is_revoked == False
        ).first()
        if not refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

        return refresh_token
    except ExpiredSignatureError:
        return None
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

"""
    Register User API
"""
@router.post("/register",response_model=UserLoginResponse,status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request: CreateUserRequest, db: db_dependency):
    # Check for existing user
    existing_username = db.query(User).filter(
        (User.username == create_user_request.username)
    ).first()

    if existing_username:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")

    # Check for existing email
    existing_email = db.query(User).filter(
        (User.email == create_user_request.email)
    ).first()

    if existing_email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

    create_user_model = User(
        username=create_user_request.username,
        uid=str(uuid4()),
        email=create_user_request.email,
        first_name=create_user_request.first_name,
        last_name=create_user_request.last_name,
        hashed_password=bcrypt_context.hash(create_user_request.password)
    )
    db.add(create_user_model)
    db.commit()

    access_token = create_access_token(create_user_model.username, create_user_model.uid, timedelta(minutes=30))
    refresh_token = create_refresh_token(create_user_model.username, create_user_model.uid, timedelta(days=1), db)
    token = Token(access_token=access_token, token_type="bearer")
    user_model = await get_current_user(token, db=db)
    print("User created:", user_model)

    userLoginResponse = {
        "user": user_model,
        "access_token": access_token,
        "token_type": "bearer"
    }
    return userLoginResponse


"""
    Login User API
"""
# Passing username and password
@router.post("/login",response_model=UserLoginResponse)
async def login_user(form_data: UserLoginRequest, db: db_dependency):
    print("Login attempt for user:", form_data.username, form_data.password)
    user = authenticate_user(form_data.username, form_data.password, db)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, 
                            detail="Invalid username or password")

    access_token = create_access_token(user.username, user.uid, timedelta(minutes=30))
    refresh_token = create_refresh_token(user.username, user.uid, timedelta(days=1), db)
    token = Token(access_token=access_token, token_type="bearer")

    user_model = await get_current_user(token, db=db)

    print("User authenticated:", user_model)


    userLoginResponse = {
        "user": user_model,
        "access_token": access_token,
        "token_type": "bearer"
    }
    return userLoginResponse

"""
    Refresh User Access Token
"""
@router.post("/refresh",response_model=Token)
async def refresh_access_token(refresh_token: str, db: db_dependency):
    # Verify the refresh token
    token_data = verify_refresh_token(refresh_token, db)
    if not token_data:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Create new access token
    access_token = create_access_token(token_data.username, token_data.uid, timedelta(minutes=30))
    return {"access_token": access_token, "token_type": "bearer"}

"""
    Logout User
"""
@router.post("/logout",status_code=status.HTTP_200_OK)
async def logout(user: UserModel, db: db_dependency):
    # Verify the refresh token
    print("Revoking user: ", user.username)

    result = db.query(RefreshToken).filter(
        (RefreshToken.user_id == user.uid)
    ).update({
        "is_revoked": True
    })
    db.commit()
    if result == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active sessions found")

    return {"detail": "Successfully logged out"}