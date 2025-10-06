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

class FetchTaskCollaboratorsRequest(BaseModel):
    uid: str
class User(BaseModel):
    uid: str
    email: str
    username: str
    first_name: str 
    last_name: str

class FetchTaskCollaboratorsResponse(BaseModel):
    collaborators: list[User]
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

class AddTripRequest(BaseModel):
    uid: str
    trip_title: str
    trip_description: str
    locations: str
    people: list[User]
    start_date: datetime
    end_date: datetime

class AddTripResponse(BaseModel):
    trip_id: int
    message: str

"""
    Fetch Filtered Trips-Users-Tasks Junction
"""
@router.post("/fetch/filtered-tasks",response_model=FetchFilteredTasksResponse,status_code=status.HTTP_200_OK)
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

"""
    Fetch Filtered Task Collaborators Trips-Users-Tasks Junction
"""
@router.post("/fetch/filtered-task-collaborators",response_model=FetchTaskCollaboratorsResponse, status_code=status.HTTP_200_OK)
async def fetch_filtered_task_collaborators(request: FetchTaskCollaboratorsRequest, db: db_dependency):
    if not request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    print("Fetch Filtered Task Collaborators Request:", request)
    # Build the base query
    query = """SELECT DISTINCT 
                    utt.task_id, 
                    u.*
                FROM users u
                    JOIN user_trip_task_junction utt ON u.uid = utt.user_id
                WHERE 
                    EXISTS (
                        SELECT 1
                            FROM user_trip_task_junction utt2
                            WHERE 
                                utt2.task_id = utt.task_id
                                AND utt2.user_id = :uid
                        )
                    AND u.uid != :uid;
                    """
    result = db.execute(
        text(query),
        {
            "uid": request.uid, 
        }
    )
    print("Final Query:", query)
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
    fetch_filtered_task_collaborators = FetchTaskCollaboratorsResponse
    collaborators = []
    for d in data:
        collaborator = User(
            uid=d['uid'],
            email=d['email'],
            username=d['username'],
            first_name=d['first_name'],
            last_name=d['last_name'],
        )
    
        collaborators.append(collaborator)

    return fetch_filtered_task_collaborators(collaborators=collaborators)

"""
    Add Trip Object:
        - Add trip
        - Add users
"""
@router.post("/add", response_model=AddTripResponse, status_code=status.HTTP_201_CREATED)
async def add_trip(request: AddTripRequest, db: db_dependency):
    if not request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    print("Add Trip Request:", request)

    # Check if user and collaborators exist
    user_check_query = """SELECT uid from users where uid = :uid"""
    result = db.execute(
        text(user_check_query),
        {"uid": request.uid}
    )

    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with uid {request.uid} not found")
    for person in request.people:
        result = db.execute(
            text(user_check_query),
            {"uid": person.uid}
        )
        if not result.fetchone():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"User with uid {person.uid} not found")
    print("All users exist")

    # Insert trip into trips tables
    insert_trip_query = """INSERT INTO trips (title, description, locations, start_date, end_date, created_at, updated_at)
                            VALUES (:title, :description, :locations, :start_date, :end_date, NOW(), NOW())
                            RETURNING id;"""
    result = db.execute(
        text(insert_trip_query),
        {
            "title": request.trip_title,
            "description": request.trip_description,
            "locations": request.locations,
            "start_date": request.start_date,
            "end_date": request.end_date,
        }
    )
    trip_id = result.fetchone()[0]
    db.commit()
    print("Inserted Trip ID:", trip_id)

    # Insert users into user_trip_task_junction
    insert_user_trip_junction_query = """INSERT INTO user_trip_task_junction (user_id, trip_id, task_id)
                                            VALUES (:user_id, :trip_id, NULL);"""
    # Add the requesting user to the trip
    db.execute(
        text(insert_user_trip_junction_query),
        {
            "user_id": request.uid,
            "trip_id": trip_id,
        }
    )
    # Add other people to the trip
    for person in request.people:
        db.execute(
            text(insert_user_trip_junction_query),
            {
                "user_id": person.uid,
                "trip_id": trip_id,
            }
        )
    db.commit()

    add_trip_response = AddTripResponse(
        trip_id=trip_id,
        message="Trip added successfully"
    )
    return add_trip_response