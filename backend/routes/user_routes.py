import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from sqlalchemy.sql import func
from database import get_db
from starlette import status
from models.user_model import User
from models.junctions.user_follows_model import User_Follows
from pydantic import BaseModel
from typing import Annotated
from datetime import datetime
from utils.email_service import send_follow_notification_email, send_invite_email

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/user", tags=["User"])

# Dependencies
db_dependency = Annotated[Session, Depends(get_db)]

"""
    Swagger BaseModel Classes
"""
class CreateUserFollowRequest(BaseModel):
    follower_uid: str
    following_uid: str

class UpdateUserFollowRequest(BaseModel):
    follower_uid: str
    following_uid: str

class DeleteUserFollowRequest(BaseModel):
    follower_uid: str
    following_uid: str

class UserFollowResponse(BaseModel):
    follower_uid: str
    following_uid: str
    created_at: datetime
    message: str

class DeleteUserFollowResponse(BaseModel):
    message: str

class AddFriendRequest(BaseModel):
    uid: str
    identifier: str

class AddFriendResponse(BaseModel):
    message: str

"""
    Helper Methods
"""
def get_user_id_by_uid(uid: str, db: Session) -> int:
    user = db.query(User).filter(User.uid == uid).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with uid {uid} not found")
    return user.id

"""
    Create User Follow (ORM)
"""
@router.post("/follow", response_model=UserFollowResponse, status_code=status.HTTP_201_CREATED)
async def create_user_follow(request: CreateUserFollowRequest, db: db_dependency):
    if request.follower_uid == request.following_uid:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A user cannot follow themselves")

    follower_id = get_user_id_by_uid(request.follower_uid, db)
    following_id = get_user_id_by_uid(request.following_uid, db)

    existing_follow = db.query(User_Follows).filter(
        User_Follows.follower_id == follower_id,
        User_Follows.following_id == following_id,
    ).first()
    if existing_follow:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already following this user")

    user_follow = User_Follows(follower_id=follower_id, following_id=following_id)
    db.add(user_follow)
    db.commit()
    db.refresh(user_follow)

    return UserFollowResponse(
        follower_uid=request.follower_uid,
        following_uid=request.following_uid,
        created_at=user_follow.created_at,
        message="Successfully followed user"
    )

"""
    Update User Follow (ORM)
    A follow relationship has no mutable fields beyond its timestamp, so
    "updating" it re-follows by bumping created_at to now.
"""
@router.post("/follow/update", response_model=UserFollowResponse, status_code=status.HTTP_200_OK)
async def update_user_follow(request: UpdateUserFollowRequest, db: db_dependency):
    follower_id = get_user_id_by_uid(request.follower_uid, db)
    following_id = get_user_id_by_uid(request.following_uid, db)

    user_follow = db.query(User_Follows).filter(
        User_Follows.follower_id == follower_id,
        User_Follows.following_id == following_id,
    ).first()
    if not user_follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow relationship not found")

    user_follow.created_at = func.now()
    db.commit()
    db.refresh(user_follow)

    return UserFollowResponse(
        follower_uid=request.follower_uid,
        following_uid=request.following_uid,
        created_at=user_follow.created_at,
        message="Follow relationship updated"
    )

"""
    Delete User Follow (ORM)
"""
@router.post("/unfollow", response_model=DeleteUserFollowResponse, status_code=status.HTTP_200_OK)
async def delete_user_follow(request: DeleteUserFollowRequest, db: db_dependency):
    follower_id = get_user_id_by_uid(request.follower_uid, db)
    following_id = get_user_id_by_uid(request.following_uid, db)

    user_follow = db.query(User_Follows).filter(
        User_Follows.follower_id == follower_id,
        User_Follows.following_id == following_id,
    ).first()
    if not user_follow:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Follow relationship not found")

    db.delete(user_follow)
    db.commit()

    return DeleteUserFollowResponse(message="Successfully unfollowed user")

"""
    Add Friend / Invite
    Looks up the identifier (username or email) against existing users.
    - If it matches an existing user: creates a follow relationship (if not
      already following) and emails that user a notification.
    - If it doesn't match any user: treats the identifier as an email invite,
      provided it's a syntactically valid email address.
"""
@router.post("/add-friend", response_model=AddFriendResponse, status_code=status.HTTP_200_OK)
async def add_friend(request: AddFriendRequest, db: db_dependency):
    inviter = db.query(User).filter(User.uid == request.uid).first()
    if not inviter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with uid {request.uid} not found")

    identifier = request.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a username or email")

    found_user = db.query(User).filter(
        or_(
            User.username == identifier.lower(),
            User.email == identifier.lower(),
        )
    ).first()

    if found_user:
        if found_user.uid == inviter.uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You can't add yourself")

        existing_follow = db.query(User_Follows).filter(
            User_Follows.follower_id == inviter.id,
            User_Follows.following_id == found_user.id,
        ).first()
        if existing_follow:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You're already following this user")

        user_follow = User_Follows(follower_id=inviter.id, following_id=found_user.id)
        db.add(user_follow)
        db.commit()

        send_follow_notification_email(found_user.email, inviter.username)

        return AddFriendResponse(message=f"Follow request sent to {found_user.email}")

    if not EMAIL_PATTERN.match(identifier):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No user found with username '{identifier}', and it isn't a valid email address to invite"
        )

    send_invite_email(identifier, inviter.username)

    return AddFriendResponse(message=f"Invite sent to {identifier}")
