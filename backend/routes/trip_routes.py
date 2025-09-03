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

router = APIRouter(prefix="/trip", tags=["Trip"])

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
class FetchFilteredTasksRequest(BaseModel):
    uid: str
    trip_filter: str 
    status_filter: str
    due_date_filter: str
    people_filter: list[str]

class User(BaseModel):
    uid: str
    email: str
    username: str
    first_name: str 
    last_name: str

class FilteredTask(BaseModel):
    task_title: str
    task_description: str
    trip_title: str
    task_deadline: datetime
    task_status: int
    created_at: datetime
    updated_at: datetime


class FetchFilteredTasksResponse(BaseModel):
    filtered_trips: list[FilteredTask]


"""
    Fetch Filtered Trips-Users-Tasks Junction
"""
@router.post("/fetch/fitered-tasks",response_model=FetchFilteredTasksResponse,status_code=status.HTTP_200_OK)
async def fetch_filtered_tasks(request: FetchFilteredTasksRequest, db: db_dependency):
    if not request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    print("Fetch Filtered Trip Request:", request)

    query = """SELECT trips.title as trip_title,tasks.* 
                from tasks 
		            join user_trip_task_junction uttj on tasks.id = uttj.task_id
		            join users on users.uid = uttj.user_id 
		            join trips on trips.id = uttj.trip_id 
	            where users.uid = :uid
        """
    # Check for trip filter
    if request.trip_filter:
        query += " AND trips.title ILIKE :trip_title_filter"
        print("Trip Title Filter:", request.trip_filter)

    # Check for status filter
    if request.status_filter:
        query += " AND tasks.status = :status_filter"
        print("Status Filter:", request.trip_filter)

    # Check for due date filter
    if request.due_date_filter:
        query += " AND tasks.deadline <= :due_date_filter"
        print("Due Date Filter:", request.due_date_filter)
    
    # Check for people filter
    user_inclusion = ""
    if request.people_filter and len(request.people_filter) > 0:
        user_inclusion = ",".join(request.people_filter)
        query += """ AND exists (SELECT 1 from user_trip_task_junction uttj2 
					join users u2 on u2.uid = uttj2.user_id
				where uttj2.task_id = tasks.id
					and uttj2.trip_id = uttj.trip_id
					and u2.uid in (:people_filter))"""
        people_filter = f"%{request.people_filter}%"
        print("People Filter:", people_filter)

    # Order by deadline asc AND tasks.deadline > now() 
    query += " ORDER BY tasks.deadline"

    # Build the base query
    result = db.execute(
        text(query),
        {
            "uid": request.uid, 
            "trip_title_filter": request.trip_filter,
            "status_filter": request.status_filter,
            "due_date_filter": request.due_date_filter,
            "people_filter": user_inclusion
        }
    )
    print("Final Query:", query)
    # print("Filtered Tasks Objects:", result.fetchall())

    data = []
    columns = result.keys()
    print(columns)
    rows = result.fetchall()
    for row in rows:
        row_dict = {}
        for i, column in enumerate(columns):
            row_dict[column] = row[i]
            print(column, row[i])
        data.append(row_dict)
    print(data)
    fetch_filtered_tasks_response = FetchFilteredTasksResponse
    filtered_tasks = []
    for d in data:
        task = FilteredTask(
            task_title=d['title'],
            task_description=d['description'],
            trip_title=d['trip_title'],
            task_deadline=d['deadline'],
            task_status=d['status'],
            created_at=d['created_at'],
            updated_at=d['updated_at'],
            
        )
    
        filtered_tasks.append(task)

    return fetch_filtered_tasks_response(filtered_trips=filtered_tasks)