from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from database import get_db
from starlette import status
from database import SessionLocal
from models.user_model import User
from models.refresh_token_model import RefreshToken
from models.email_verification_token_model import EmailVerificationToken
from models.password_reset_token_model import PasswordResetToken
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, Field
from typing import Annotated, Any, Union
from uuid import uuid4
from datetime import datetime, timedelta, timezone
import os
import secrets
from utils.email_service import send_verification_email, send_password_reset_email

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

class AuthTokens(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

class RefreshTokenRequest(BaseModel):
    refresh_token: str
    token_type: str
class UserLoginRequest(BaseModel):
    username: str 
    password: str 
class UserModel(BaseModel):
    username: str
    uid: str
    email: str
    is_verified: bool
class UserLoginResponse(BaseModel):
    user: UserModel
    access_token: str
    refresh_token: str
    token_type: str

class VerifyEmailRequest(BaseModel):
    token: str

class VerifyEmailResponse(BaseModel):
    message: str

class ResendVerificationRequest(BaseModel):
    email: str

class ResendVerificationResponse(BaseModel):
    message: str

class ForgotPasswordRequest(BaseModel):
    email: str

class ForgotPasswordResponse(BaseModel):
    message: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class ResetPasswordResponse(BaseModel):
    message: str
"""
    Helper Methods
"""
# Getting current user from token
# TODO: Use this in other APIs that require authentication
@router.post("/user",response_model=UserModel,status_code=status.HTTP_200_OK)
async def get_current_user(access_token: Token, db: db_dependency):
    print("Received token for user retrieval:", access_token)
    try:
        payload = jwt.decode(access_token.access_token, SECRET_KEY, algorithms=[ALGORITHM])
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

        user = db.query(User).filter(User.uid == uid).first()
        if not user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

        return {'username': username, 'uid': uid, 'email': user.email, 'is_verified': user.is_verified}
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

# Verifying if user exists and if the passwords match (verify())
def authenticate_user(username: str, password: str, db: Session):
    user = db.query(User).filter(or_(
        User.username == username.lower(),
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
        uid = payload.get("id")
        if uid is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

        # Check if the refresh token exists in the database
        refresh_token = db.query(RefreshToken).filter(
            RefreshToken.user_id == uid, 
            RefreshToken.is_revoked == False
        ).first()
        if not refresh_token:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

        return {"username": payload.get("sub"), "uid": uid}
    except ExpiredSignatureError:
        return None
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Could not validate credentials")

# Creating and emailing an email verification token
def create_and_send_verification_token(user: User, db: Session):
    token = secrets.token_urlsafe(32)
    verification_token = EmailVerificationToken(
        user_id=user.uid,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=24),
        is_used=False
    )
    db.add(verification_token)
    db.commit()
    send_verification_email(user.email, token)

# Creating and emailing a password reset token
def create_and_send_password_reset_token(user: User, db: Session):
    token = secrets.token_urlsafe(32)
    reset_token = PasswordResetToken(
        user_id=user.uid,
        token=token,
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_used=False
    )
    db.add(reset_token)
    db.commit()
    send_password_reset_email(user.email, token)

"""
    Register User API
"""
@router.post("/register",response_model=Union[UserLoginResponse, ResendVerificationResponse],status_code=status.HTTP_201_CREATED)
async def create_user(create_user_request: CreateUserRequest, db: db_dependency, response: Response):
    print(">>> [register] Endpoint hit with request:", create_user_request)

    # Check for existing user
    create_user_request.username = create_user_request.username.lower()
    create_user_request.email = create_user_request.email.lower()
    print(">>> [register] Checking for existing username:", create_user_request.username)
    existing_username = db.query(User).filter(
        (User.username == create_user_request.username)
    ).first()

    if existing_username:
        print(">>> [register] FAILED: username already registered:", create_user_request.username)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Username already registered")

    # Check for existing email
    print(">>> [register] Checking for existing email:", create_user_request.email)
    existing_email = db.query(User).filter(
        (User.email == create_user_request.email)
    ).first()

    if existing_email:
        if existing_email.is_verified:
            print(">>> [register] FAILED: email already registered and verified:", create_user_request.email)
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered")

        print(">>> [register] Email exists but is unverified, resending verification email:", create_user_request.email)
        create_and_send_verification_token(existing_email, db)
        response.status_code = status.HTTP_200_OK
        return ResendVerificationResponse(
            message=f"An account with {create_user_request.email} already exists but hasn't been verified. We've resent the verification email to {create_user_request.email}."
        )

    print(">>> [register] No conflicts found, creating user row")
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
    print(">>> [register] User row committed with uid:", create_user_model.uid)

    try:
        create_and_send_verification_token(create_user_model, db)
        print(">>> [register] Verification email step completed")
    except Exception as e:
        print(">>> [register] FAILED sending verification email (non-fatal, continuing):", repr(e))

    access_token = create_access_token(create_user_model.username, create_user_model.uid, timedelta(minutes=30))
    refresh_token = create_refresh_token(create_user_model.username, create_user_model.uid, timedelta(days=1), db)
    token = Token(access_token=access_token, token_type="bearer")
    user_model = await get_current_user(token, db=db)
    print(">>> [register] SUCCESS. User created:", user_model)

    userLoginResponse = {
        "user": user_model,
        "access_token": access_token,
        "refresh_token": refresh_token,
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
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    return userLoginResponse

"""
    Refresh User Access Token
"""
@router.post("/refresh",response_model=AuthTokens,status_code=status.HTTP_200_OK)
async def refresh_access_token(refresh_request: RefreshTokenRequest, db: db_dependency):
    print("Received refresh token:", refresh_request.refresh_token)
    # Verify the refresh token
    decoded_token = verify_refresh_token(refresh_request.refresh_token, db)
    if not decoded_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

    # Create new access token
    access_token = create_access_token(decoded_token['username'], decoded_token['uid'], timedelta(minutes=30))
    new_refresh_token = create_refresh_token(decoded_token['username'], decoded_token['uid'], timedelta(days=1), db)
    return {"access_token": access_token, "refresh_token": new_refresh_token, "token_type": "bearer"}

"""
    Logout User
"""
@router.post("/logout",status_code=status.HTTP_200_OK)
async def logout(token: Token, db: db_dependency):
    access_token = token.access_token

    # Decode the access token
    decoded_access_token = verify_access_token(access_token)

    if not decoded_access_token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid access token")
    
    # Retrieve user information
    username = decoded_access_token.get("sub")
    uid = decoded_access_token.get("id")

    print("Revoking user: ", username)

    result = db.query(RefreshToken).filter(
        (RefreshToken.user_id == uid)
    ).update({
        "is_revoked": True
    })
    db.commit()
    if result == 0:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No active sessions found")

    return {"detail": "Successfully logged out"}

"""
    Verify Email
"""
@router.post("/verify-email", response_model=VerifyEmailResponse, status_code=status.HTTP_200_OK)
async def verify_email(request: VerifyEmailRequest, db: db_dependency):
    verification_token = db.query(EmailVerificationToken).filter(
        EmailVerificationToken.token == request.token
    ).first()

    if not verification_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid verification token")

    if verification_token.is_used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token already used")

    if verification_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Verification token expired")

    user = db.query(User).filter(User.uid == verification_token.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.is_verified = True
    verification_token.is_used = True
    db.commit()

    return VerifyEmailResponse(message="Email verified successfully")

"""
    Resend Verification Email
"""
@router.post("/resend-verification", response_model=ResendVerificationResponse, status_code=status.HTTP_200_OK)
async def resend_verification(request: ResendVerificationRequest, db: db_dependency):
    user = db.query(User).filter(User.email == request.email.lower()).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user.is_verified:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Email already verified")

    create_and_send_verification_token(user, db)

    return ResendVerificationResponse(message="Verification email sent")

"""
    Forgot Password
"""
@router.post("/forgot-password", response_model=ForgotPasswordResponse, status_code=status.HTTP_200_OK)
async def forgot_password(request: ForgotPasswordRequest, db: db_dependency):
    generic_message = "If an account with that email exists, a password reset link has been sent."

    user = db.query(User).filter(User.email == request.email.lower()).first()
    if user:
        create_and_send_password_reset_token(user, db)
    else:
        print(">>> [forgot-password] No account found for email (not disclosed to client):", request.email)

    # Always return the same message, regardless of whether the account exists,
    # so this endpoint can't be used to enumerate registered emails.
    return ForgotPasswordResponse(message=generic_message)

"""
    Reset Password
"""
@router.post("/reset-password", response_model=ResetPasswordResponse, status_code=status.HTTP_200_OK)
async def reset_password(request: ResetPasswordRequest, db: db_dependency):
    if len(request.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Password must be at least 6 characters long")

    reset_token = db.query(PasswordResetToken).filter(
        PasswordResetToken.token == request.token
    ).first()

    if not reset_token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset token")

    if reset_token.is_used:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token already used")

    if reset_token.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset token expired")

    user = db.query(User).filter(User.uid == reset_token.user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    user.hashed_password = bcrypt_context.hash(request.new_password)
    reset_token.is_used = True

    # Invalidate existing sessions so a stolen/old session can't survive a password reset
    db.query(RefreshToken).filter(RefreshToken.user_id == user.uid).update({"is_revoked": True})

    db.commit()

    return ResetPasswordResponse(message="Password reset successfully")