import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, or_
from database import get_db
from starlette import status
from database import SessionLocal
from models.user_model import User
from models.refresh_token_model import RefreshToken
from models.trip_model import Trip
from models.task_model import Task
from models.junctions.user_trip_junction_model import User_Trip_Junction
from models.junctions.user_trip_task_junction_model import User_Trip_Task_Junction
from passlib.context import CryptContext
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import ExpiredSignatureError, JWTError, jwt
from pydantic import BaseModel, Field
from typing import Annotated, Any, Optional
from uuid import uuid4
from datetime import datetime, timedelta, timezone
from utils.email_service import send_trip_member_added_email, send_invite_email
import os

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")

router = APIRouter(prefix="/trip", tags=["Trip"])

SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM")

# Password hashing
bcrypt_context = CryptContext(schemes=['bcrypt'], deprecated="auto")
oauth2_bearer = OAuth2PasswordBearer(tokenUrl="auth/login")

# Dependencies
db_dependency = Annotated[Session, Depends(get_db)]

ACTIVE_USER_FILTER = "u.is_active = true AND u.is_verified = true"

def ensure_trip_has_admin(db: Session, trip_id: int) -> None:
    """Self-healing: if a trip has no admin who is still an active, verified
    user (e.g. the admin's account was deleted, deactivated, or lost
    verification), promote the earliest-joined remaining active/verified
    member to admin so the trip is never left without one."""
    admin_exists = db.execute(
        text(f"""SELECT 1 FROM user_trip_junction utj
                 JOIN users u ON u.uid = utj.user_id
                 WHERE utj.trip_id = :trip_id AND utj.role = 'admin' AND {ACTIVE_USER_FILTER}"""),
        {"trip_id": trip_id}
    ).fetchone()
    if admin_exists:
        return

    fallback = db.execute(
        text(f"""SELECT utj.user_id FROM user_trip_junction utj
                 JOIN users u ON u.uid = utj.user_id
                 WHERE utj.trip_id = :trip_id AND {ACTIVE_USER_FILTER}
                 ORDER BY utj.created_at ASC NULLS LAST, utj.user_id ASC
                 LIMIT 1"""),
        {"trip_id": trip_id}
    ).fetchone()
    if not fallback:
        return

    db.execute(
        text("UPDATE user_trip_junction SET role = 'admin' WHERE trip_id = :trip_id AND user_id = :user_id"),
        {"trip_id": trip_id, "user_id": fallback[0]}
    )
    db.commit()

def get_trip_role(db: Session, uid: str, trip_id: int) -> Optional[str]:
    ensure_trip_has_admin(db, trip_id)
    result = db.execute(
        text("SELECT role FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"),
        {"uid": uid, "trip_id": trip_id}
    )
    row = result.fetchone()
    return row[0] if row else None

def is_task_assignee(db: Session, uid: str, task_id: int) -> bool:
    result = db.execute(
        text("SELECT 1 FROM user_trip_task_junction WHERE user_id = :uid AND task_id = :task_id"),
        {"uid": uid, "task_id": task_id}
    )
    return result.fetchone() is not None

def parse_trip_locations(locations: Optional[dict]):
    """Reads the trips.locations JSON blob into (destination_address, itinerary_enabled, itinerary_items).
    Supports the current {"destination": {...}, "itinerary_enabled": bool, "itinerary": [...]} shape as
    well as the legacy {"1": {...}} single-destination shape written before the itinerary feature existed."""
    if not locations:
        return "", False, []

    if "destination" in locations:
        destination_address = (locations.get("destination") or {}).get("address", "")
        itinerary_enabled = bool(locations.get("itinerary_enabled", False))
        itinerary_items = [
            {"location": item.get("location", ""), "address": item.get("address", ""), "notes": item.get("notes", "")}
            for item in (locations.get("itinerary") or [])
        ]
        return destination_address, itinerary_enabled, itinerary_items

    # Legacy format: {"1": {"notes": ..., "address": ..., "location": ...}}
    first_location = next(iter(locations.values()), {}) if locations else {}
    return first_location.get("address", ""), False, []

"""
    Swagger BaseModel Classes
"""
class FetchFilteredTasksRequest(BaseModel):
    uid: str
    trip_filter: str
    status_filter: str
    due_date_filter: str
    people_filter: list[str]
    all_trip_members: bool = False

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
class TaskCostBreakdownEntry(BaseModel):
    uid: str
    amount: float

class FilteredTask(BaseModel):
    task_id: int
    task_title: str
    task_description: str
    trip_title: str
    task_deadline: datetime
    task_status: int
    created_at: datetime
    updated_at: datetime
    total_cost: Optional[float] = None
    cost_split_type: Optional[str] = None
    assignee_uids: list[str] = []
    cost_breakdown: list[TaskCostBreakdownEntry] = []

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

class TripDestination(BaseModel):
    notes: str
    address: str
    location: str

class ItineraryItem(BaseModel):
    location: str
    address: str
    notes: str

class CreateTripRequest(BaseModel):
    uid: str
    name: str
    destination: TripDestination
    start_date: datetime
    end_date: datetime
    status: str
    description: str
    budget: Optional[float] = None
    itinerary_enabled: bool = False
    itinerary: list[ItineraryItem] = []

class DeleteTripRequest(BaseModel):
    uid: str
    trip_id: int

class DeleteTripResponse(BaseModel):
    message: str

class UpdateTripRequest(BaseModel):
    uid: str
    trip_id: int
    name: str
    destination: TripDestination
    start_date: datetime
    end_date: datetime
    status: str
    description: str
    budget: Optional[float] = None
    itinerary_enabled: bool = False
    itinerary: list[ItineraryItem] = []

class UpdateTripResponse(BaseModel):
    trip_id: int
    message: str

class CompleteTripRequest(BaseModel):
    uid: str
    trip_id: int

class CompleteTripResponse(BaseModel):
    trip_id: int
    message: str

class FetchUserTripsRequest(BaseModel):
    uid: str

class TripSummary(BaseModel):
    id: int
    name: str
    destination: str
    start_date: datetime
    end_date: datetime
    status: str
    description: str
    budget: Optional[float] = None
    itinerary_enabled: bool = False
    itinerary: list[ItineraryItem] = []

class FetchUserTripsResponse(BaseModel):
    trips: list[TripSummary]

class CreateTripResponse(BaseModel):
    trip_id: int
    message: str

class FetchTripMembersRequest(BaseModel):
    uid: str
    trip_id: int
    search: str = ""

class TripMember(BaseModel):
    uid: str
    username: str
    first_name: str
    last_name: str
    role: str = "participant"

class FetchTripMembersResponse(BaseModel):
    members: list[TripMember]

class SetTripMemberRoleRequest(BaseModel):
    uid: str
    trip_id: int
    member_uid: str
    role: str

class SetTripMemberRoleResponse(BaseModel):
    message: str

class TaskAssigneeCost(BaseModel):
    uid: str
    amount: Optional[float] = None
    percentage: Optional[float] = None

class CreateTaskRequest(BaseModel):
    uid: str
    trip_id: int
    title: str
    description: str
    deadline: datetime
    status: int
    assignee_uids: list[str]
    cost_enabled: bool = False
    total_cost: Optional[float] = None
    cost_split_type: Optional[str] = None
    assignee_costs: list[TaskAssigneeCost] = []

class CreateTaskResponse(BaseModel):
    task_id: int
    message: str

class UpdateTaskRequest(BaseModel):
    uid: str
    task_id: int
    title: str
    description: str
    deadline: datetime
    status: int
    cost_enabled: bool = False
    total_cost: Optional[float] = None
    cost_split_type: Optional[str] = None
    assignee_costs: list[TaskAssigneeCost] = []

class UpdateTaskResponse(BaseModel):
    task_id: int
    message: str

class UpdateTaskStatusRequest(BaseModel):
    uid: str
    task_id: int
    status: int

class UpdateTaskStatusResponse(BaseModel):
    task_id: int
    message: str

class FetchTaskAssigneeCostsRequest(BaseModel):
    uid: str
    task_id: int

class TaskAssigneeCostMember(BaseModel):
    uid: str
    username: str
    first_name: str
    last_name: str
    cost_amount: Optional[float] = None
    cost_percentage: Optional[float] = None

class FetchTaskAssigneeCostsResponse(BaseModel):
    total_cost: Optional[float] = None
    cost_split_type: Optional[str] = None
    assignees: list[TaskAssigneeCostMember]

class DeleteTaskRequest(BaseModel):
    uid: str
    task_id: int

class DeleteTaskResponse(BaseModel):
    message: str

class AddTripMemberRequest(BaseModel):
    uid: str
    trip_id: int
    identifier: str

class AddTripMemberResponse(BaseModel):
    message: str

class RemoveTripMemberRequest(BaseModel):
    uid: str
    trip_id: int
    member_uid: str

class RemoveTripMemberResponse(BaseModel):
    message: str

class FetchTripMemberProgressRequest(BaseModel):
    uid: str
    trip_id: int

class TripMemberProgress(BaseModel):
    uid: str
    username: str
    total_tasks: int
    completed_tasks: int

class FetchTripMemberProgressResponse(BaseModel):
    members: list[TripMemberProgress]

"""
    Fetch Filtered Trips-Users-Tasks Junction
"""
@router.post("/fetch/filtered-tasks",response_model=FetchFilteredTasksResponse,status_code=status.HTTP_200_OK)
async def fetch_filtered_tasks(request: FetchFilteredTasksRequest, db: db_dependency):
    if not request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    print("Fetch Filtered Trip Request:", request)

    # all_trip_members=True returns every task on the trip regardless of
    # assignee (deduplicated via DISTINCT ON, since a task can have multiple
    # assignees in user_trip_task_junction). Otherwise, only the requesting
    # user's own tasks on the trip are returned.
    if request.all_trip_members:
        query = """SELECT DISTINCT ON (tasks.id) trips.title as trip_title, tasks.*,
                    (SELECT array_agg(uttj_all.user_id) FROM user_trip_task_junction uttj_all WHERE uttj_all.task_id = tasks.id) AS assignee_uid_list,
                    (SELECT json_agg(json_build_object('uid', uttj_c.user_id, 'amount', uttj_c.cost_amount, 'percentage', uttj_c.cost_percentage)) FROM user_trip_task_junction uttj_c WHERE uttj_c.task_id = tasks.id) AS assignee_cost_list
                    from tasks
		                join user_trip_task_junction uttj on tasks.id = uttj.task_id
		                join trips on trips.id = uttj.trip_id
	                where trips.title ILIKE :trip_title_filter
        """
    else:
        query = """SELECT trips.title as trip_title,tasks.*,
                    (SELECT array_agg(uttj_all.user_id) FROM user_trip_task_junction uttj_all WHERE uttj_all.task_id = tasks.id) AS assignee_uid_list,
                    (SELECT json_agg(json_build_object('uid', uttj_c.user_id, 'amount', uttj_c.cost_amount, 'percentage', uttj_c.cost_percentage)) FROM user_trip_task_junction uttj_c WHERE uttj_c.task_id = tasks.id) AS assignee_cost_list
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
    # DISTINCT ON (tasks.id) requires tasks.id to lead the ORDER BY.
    if request.all_trip_members:
        query += " ORDER BY tasks.id, tasks.deadline"
    else:
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
        task_total_cost = float(d['total_cost']) if d.get('total_cost') is not None else None
        task_split_type = d.get('cost_split_type')
        cost_breakdown = []
        for entry in (d.get('assignee_cost_list') or []):
            amount = entry.get('amount')
            percentage = entry.get('percentage')
            if task_split_type == 'percentage' and percentage is not None and task_total_cost is not None:
                resolved_amount = task_total_cost * float(percentage) / 100.0
            elif amount is not None:
                resolved_amount = float(amount)
            else:
                resolved_amount = 0.0
            cost_breakdown.append(TaskCostBreakdownEntry(uid=entry['uid'], amount=resolved_amount))

        task = FilteredTask(
            task_id=d['id'],
            task_title=d['title'],
            task_description=d['description'],
            trip_title=d['trip_title'],
            task_deadline=d['deadline'],
            task_status=d['status'],
            created_at=d['created_at'],
            updated_at=d['updated_at'],
            total_cost=task_total_cost,
            cost_split_type=task_split_type,
            assignee_uids=list(d['assignee_uid_list']) if d.get('assignee_uid_list') else [],
            cost_breakdown=cost_breakdown,
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
                    AND u.uid != :uid
                    AND u.is_active = true AND u.is_verified = true;
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
    Fetch All Trips for a User
"""
@router.post("/fetch/user-trips", response_model=FetchUserTripsResponse, status_code=status.HTTP_200_OK)
async def fetch_user_trips(request: FetchUserTripsRequest, db: db_dependency):
    if not request:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid request")
    print("Fetch User Trips Request:", request)

    query = """SELECT trips.*
                FROM trips
                    JOIN user_trip_junction utj ON utj.trip_id = trips.id
                WHERE utj.user_id = :uid
                ORDER BY trips.start_date"""
    result = db.execute(
        text(query),
        {"uid": request.uid}
    )

    columns = result.keys()
    rows = result.fetchall()

    trips = []
    for row in rows:
        row_dict = dict(zip(columns, row))
        destination_address, itinerary_enabled, itinerary_items = parse_trip_locations(
            row_dict.get('locations')
        )
        trips.append(TripSummary(
            id=row_dict['id'],
            name=row_dict['title'],
            destination=destination_address,
            start_date=row_dict['start_date'],
            end_date=row_dict['end_date'],
            status=row_dict['status'] or '',
            description=row_dict['description'] or '',
            budget=float(row_dict['budget']) if row_dict.get('budget') is not None else None,
            itinerary_enabled=itinerary_enabled,
            itinerary=[ItineraryItem(**item) for item in itinerary_items],
        ))

    return FetchUserTripsResponse(trips=trips)

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

"""
    Create Trip Object (ORM)
"""
@router.post("/create", response_model=CreateTripResponse, status_code=status.HTTP_201_CREATED)
async def create_trip(request: CreateTripRequest, db: db_dependency):
    trip = Trip(
        title=request.name,
        description=request.description,
        location={
            "destination": request.destination.dict(),
            "itinerary_enabled": request.itinerary_enabled,
            "itinerary": [item.dict() for item in request.itinerary],
        },
        status=request.status,
        start_date=request.start_date,
        end_date=request.end_date,
        budget=request.budget,
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)

    user_trip = User_Trip_Junction(
        user_id=request.uid,
        trip_id=trip.id,
        role="admin",
    )
    db.add(user_trip)
    db.commit()

    return CreateTripResponse(
        trip_id=trip.id,
        message="Trip created successfully"
    )

"""
    Delete Trip Object
"""
@router.post("/delete", response_model=DeleteTripResponse, status_code=status.HTTP_200_OK)
async def delete_trip(request: DeleteTripRequest, db: db_dependency):
    role = get_trip_role(db, request.uid, request.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can delete this trip")

    db.execute(
        text("DELETE FROM user_trip_task_junction WHERE trip_id = :trip_id"),
        {"trip_id": request.trip_id}
    )
    db.execute(
        text("DELETE FROM tasks WHERE trip_id = :trip_id"),
        {"trip_id": request.trip_id}
    )
    # user_trip_junction rows cascade automatically when the trip is deleted
    db.execute(
        text("DELETE FROM trips WHERE id = :trip_id"),
        {"trip_id": request.trip_id}
    )
    db.commit()

    return DeleteTripResponse(message="Trip deleted successfully")

"""
    Update Trip Object (ORM)
"""
@router.post("/update", response_model=UpdateTripResponse, status_code=status.HTTP_200_OK)
async def update_trip(request: UpdateTripRequest, db: db_dependency):
    role = get_trip_role(db, request.uid, request.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can edit this trip")

    trip = db.query(Trip).filter(Trip.id == request.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    trip.title = request.name
    trip.description = request.description
    trip.location = {
        "destination": request.destination.dict(),
        "itinerary_enabled": request.itinerary_enabled,
        "itinerary": [item.dict() for item in request.itinerary],
    }
    trip.status = request.status
    trip.start_date = request.start_date
    trip.end_date = request.end_date
    trip.budget = request.budget
    db.commit()

    return UpdateTripResponse(
        trip_id=trip.id,
        message="Trip updated successfully"
    )

"""
    Complete Trip
    Marks a trip (and every task on it) as completed. Admin-only.
"""
@router.post("/complete", response_model=CompleteTripResponse, status_code=status.HTTP_200_OK)
async def complete_trip(request: CompleteTripRequest, db: db_dependency):
    role = get_trip_role(db, request.uid, request.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can complete this trip")

    trip = db.query(Trip).filter(Trip.id == request.trip_id).first()
    if not trip:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found")

    trip.status = "completed"
    db.query(Task).filter(Task.trip_id == request.trip_id).update({Task.status: 2})
    db.commit()

    return CompleteTripResponse(
        trip_id=trip.id,
        message="Trip and all its tasks marked as completed"
    )

"""
    Fetch Trip Members
    Users who share the given trip (via user_trip_junction), searchable by
    username. Used to populate the assignee picker on task creation.
"""
@router.post("/fetch/trip-members", response_model=FetchTripMembersResponse, status_code=status.HTTP_200_OK)
async def fetch_trip_members(request: FetchTripMembersRequest, db: db_dependency):
    membership_check_query = """SELECT 1 FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"""
    result = db.execute(
        text(membership_check_query),
        {"uid": request.uid, "trip_id": request.trip_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")

    ensure_trip_has_admin(db, request.trip_id)

    query = """SELECT u.uid, u.username, u.first_name, u.last_name, utj.role
                FROM users u
                    JOIN user_trip_junction utj ON utj.user_id = u.uid
                WHERE utj.trip_id = :trip_id AND u.is_active = true AND u.is_verified = true"""
    params = {"trip_id": request.trip_id}
    if request.search:
        query += " AND u.username ILIKE :search"
        params["search"] = f"%{request.search}%"
    query += " ORDER BY u.username"

    result = db.execute(text(query), params)
    members = [
        TripMember(
            uid=row[0],
            username=row[1],
            first_name=row[2],
            last_name=row[3],
            role=row[4] or "participant",
        )
        for row in result.fetchall()
    ]

    return FetchTripMembersResponse(members=members)

"""
    Set Trip Member Role
    Promotes a participant to admin, or demotes an admin back to
    participant. Only callable by an existing trip admin. Always keeps at
    least one admin on the trip.
"""
@router.post("/member/set-role", response_model=SetTripMemberRoleResponse, status_code=status.HTTP_200_OK)
async def set_trip_member_role(request: SetTripMemberRoleRequest, db: db_dependency):
    if request.role not in ("admin", "participant"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Role must be 'admin' or 'participant'")

    requester_role = get_trip_role(db, request.uid, request.trip_id)
    if not requester_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if requester_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can change member roles")

    target_role = get_trip_role(db, request.member_uid, request.trip_id)
    if not target_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This user is not a member of the trip")

    if request.role == "participant" and target_role == "admin" and request.member_uid != request.uid:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins can't demote other admins. Each admin can only remove their own admin role."
        )

    if request.role == "participant" and target_role == "admin":
        admin_count_result = db.execute(
            text("""SELECT COUNT(*) FROM user_trip_junction WHERE trip_id = :trip_id AND role = 'admin'"""),
            {"trip_id": request.trip_id}
        )
        admin_count = admin_count_result.scalar()
        if admin_count <= 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="A trip must have at least one admin. Promote another member first."
            )

    db.execute(
        text("""UPDATE user_trip_junction SET role = :role
                 WHERE trip_id = :trip_id AND user_id = :member_uid"""),
        {"role": request.role, "trip_id": request.trip_id, "member_uid": request.member_uid}
    )
    db.commit()

    return SetTripMemberRoleResponse(message=f"Role updated to {request.role}")

"""
    Create Task (ORM)
    Creates a task tied to a trip and assigns it to the given trip members
    via user_trip_task_junction.
"""
@router.post("/task/create", response_model=CreateTaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(request: CreateTaskRequest, db: db_dependency):
    role = get_trip_role(db, request.uid, request.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can create tasks")

    membership_check_query = """SELECT 1 FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"""
    assignee_uids = list(dict.fromkeys(request.assignee_uids))
    for assignee_uid in assignee_uids:
        result = db.execute(
            text(membership_check_query),
            {"uid": assignee_uid, "trip_id": request.trip_id}
        )
        if not result.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"User {assignee_uid} is not a member of this trip"
            )

    cost_by_uid = {c.uid: c for c in request.assignee_costs}

    now = datetime.now(timezone.utc)
    task = Task(
        title=request.title,
        description=request.description,
        status=request.status,
        deadline=request.deadline,
        trip_id=request.trip_id,
        total_cost=request.total_cost if request.cost_enabled else None,
        cost_split_type=request.cost_split_type if request.cost_enabled else None,
        created_at=now,
        updated_at=now,
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    for assignee_uid in assignee_uids:
        cost = cost_by_uid.get(assignee_uid)
        db.add(User_Trip_Task_Junction(
            user_id=assignee_uid,
            trip_id=request.trip_id,
            task_id=task.id,
            assigned_at=now,
            cost_amount=cost.amount if (request.cost_enabled and cost) else None,
            cost_percentage=cost.percentage if (request.cost_enabled and cost) else None,
        ))
    db.commit()

    return CreateTaskResponse(task_id=task.id, message="Task created successfully")

"""
    Fetch Task Assignee Costs
    Returns the task's current assignees along with their per-user cost
    split, for populating the edit-task cost UI.
"""
@router.post("/task/fetch-assignee-costs", response_model=FetchTaskAssigneeCostsResponse, status_code=status.HTTP_200_OK)
async def fetch_task_assignee_costs(request: FetchTaskAssigneeCostsRequest, db: db_dependency):
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    membership_check_query = """SELECT 1 FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"""
    result = db.execute(
        text(membership_check_query),
        {"uid": request.uid, "trip_id": task.trip_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found for this user")

    query = """SELECT u.uid, u.username, u.first_name, u.last_name,
                    uttj.cost_amount, uttj.cost_percentage
                FROM user_trip_task_junction uttj
                    JOIN users u ON u.uid = uttj.user_id
                WHERE uttj.task_id = :task_id
                ORDER BY u.username"""
    result = db.execute(text(query), {"task_id": request.task_id})

    assignees = [
        TaskAssigneeCostMember(
            uid=row[0],
            username=row[1],
            first_name=row[2],
            last_name=row[3],
            cost_amount=float(row[4]) if row[4] is not None else None,
            cost_percentage=float(row[5]) if row[5] is not None else None,
        )
        for row in result.fetchall()
    ]

    return FetchTaskAssigneeCostsResponse(
        total_cost=float(task.total_cost) if task.total_cost is not None else None,
        cost_split_type=task.cost_split_type,
        assignees=assignees,
    )

"""
    Add Trip Member
    Adds an existing user (found by username or email) to a trip's
    user_trip_junction. If no matching user exists, sends an app invite
    email instead (mirrors /user/add-friend's fallback behavior).
"""
@router.post("/add-member", response_model=AddTripMemberResponse, status_code=status.HTTP_200_OK)
async def add_trip_member(request: AddTripMemberRequest, db: db_dependency):
    role = get_trip_role(db, request.uid, request.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can add members")

    membership_check_query = """SELECT 1 FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"""
    identifier = request.identifier.strip()
    if not identifier:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Please enter a username or email")

    inviter_query = """SELECT username FROM users WHERE uid = :uid"""
    inviter_result = db.execute(text(inviter_query), {"uid": request.uid})
    inviter_row = inviter_result.fetchone()
    inviter_username = inviter_row[0] if inviter_row else "Someone"

    trip_query = """SELECT title FROM trips WHERE id = :trip_id"""
    trip_result = db.execute(text(trip_query), {"trip_id": request.trip_id})
    trip_row = trip_result.fetchone()
    trip_name = trip_row[0] if trip_row else "a trip"

    found_user_query = """SELECT uid, email FROM users WHERE (username = :identifier OR email = :identifier) AND is_active = true AND is_verified = true"""
    found_user_result = db.execute(text(found_user_query), {"identifier": identifier.lower()})
    found_user = found_user_result.fetchone()

    if found_user:
        found_uid, found_email = found_user

        if found_uid == request.uid:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You're already on this trip")

        result = db.execute(
            text(membership_check_query),
            {"uid": found_uid, "trip_id": request.trip_id}
        )
        if result.fetchone():
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This user is already on the trip")

        db.add(User_Trip_Junction(user_id=found_uid, trip_id=request.trip_id, role="participant"))
        db.commit()

        send_trip_member_added_email(found_email, inviter_username, trip_name)

        return AddTripMemberResponse(message=f"Added {identifier} to the trip")

    if not EMAIL_PATTERN.match(identifier):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No user found with username '{identifier}', and it isn't a valid email address to invite"
        )

    send_invite_email(identifier, inviter_username)

    return AddTripMemberResponse(message=f"Invite sent to {identifier}")

"""
    Remove Trip Member
    Removes a member from a trip's user_trip_junction and clears their
    assignments (and cost splits) on that trip's tasks.
"""
@router.post("/remove-member", response_model=RemoveTripMemberResponse, status_code=status.HTTP_200_OK)
async def remove_trip_member(request: RemoveTripMemberRequest, db: db_dependency):
    requester_role = get_trip_role(db, request.uid, request.trip_id)
    if not requester_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")

    is_self_removal = request.member_uid == request.uid
    if not is_self_removal and requester_role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can remove other members")

    target_role = get_trip_role(db, request.member_uid, request.trip_id)
    if not target_role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="This user is not a member of the trip")

    if is_self_removal and target_role == "admin":
        admin_count_result = db.execute(
            text("""SELECT COUNT(*) FROM user_trip_junction WHERE trip_id = :trip_id AND role = 'admin'"""),
            {"trip_id": request.trip_id}
        )
        admin_count = admin_count_result.scalar()
        member_count_result = db.execute(
            text("""SELECT COUNT(*) FROM user_trip_junction WHERE trip_id = :trip_id"""),
            {"trip_id": request.trip_id}
        )
        member_count = member_count_result.scalar()
        if admin_count <= 1 and member_count > 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You're the only admin. Promote another member to admin before leaving."
            )

    db.execute(
        text("""DELETE FROM user_trip_task_junction
                 WHERE trip_id = :trip_id AND user_id = :member_uid"""),
        {"trip_id": request.trip_id, "member_uid": request.member_uid}
    )
    db.execute(
        text("""DELETE FROM user_trip_junction
                 WHERE trip_id = :trip_id AND user_id = :member_uid"""),
        {"trip_id": request.trip_id, "member_uid": request.member_uid}
    )
    db.commit()

    return RemoveTripMemberResponse(message="Member removed from the trip")

"""
    Fetch Trip Member Progress
    Task completion counts for every OTHER member of the trip (excludes the
    requesting user), used to show teammates' status on the homepage.
"""
@router.post("/fetch/member-progress", response_model=FetchTripMemberProgressResponse, status_code=status.HTTP_200_OK)
async def fetch_trip_member_progress(request: FetchTripMemberProgressRequest, db: db_dependency):
    membership_check_query = """SELECT 1 FROM user_trip_junction WHERE user_id = :uid AND trip_id = :trip_id"""
    result = db.execute(
        text(membership_check_query),
        {"uid": request.uid, "trip_id": request.trip_id}
    )
    if not result.fetchone():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Trip not found for this user")

    query = """SELECT u.uid, u.username,
                    COUNT(uttj.task_id) AS total_tasks,
                    COUNT(uttj.task_id) FILTER (WHERE t.status = 2) AS completed_tasks
                FROM users u
                    JOIN user_trip_junction utj ON utj.user_id = u.uid AND utj.trip_id = :trip_id
                    LEFT JOIN user_trip_task_junction uttj ON uttj.user_id = u.uid AND uttj.trip_id = :trip_id
                    LEFT JOIN tasks t ON t.id = uttj.task_id
                WHERE u.uid != :uid AND u.is_active = true AND u.is_verified = true
                GROUP BY u.uid, u.username
                ORDER BY u.username"""
    result = db.execute(text(query), {"uid": request.uid, "trip_id": request.trip_id})

    members = [
        TripMemberProgress(
            uid=row[0],
            username=row[1],
            total_tasks=row[2],
            completed_tasks=row[3],
        )
        for row in result.fetchall()
    ]

    return FetchTripMemberProgressResponse(members=members)

"""
    Update Task (ORM)
"""
@router.post("/task/update", response_model=UpdateTaskResponse, status_code=status.HTTP_200_OK)
async def update_task(request: UpdateTaskRequest, db: db_dependency):
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    role = get_trip_role(db, request.uid, task.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found for this user")
    if role != "admin" and not is_task_assignee(db, request.uid, task.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks assigned to you"
        )

    task.title = request.title
    task.description = request.description
    task.deadline = request.deadline
    task.status = request.status
    task.total_cost = request.total_cost if request.cost_enabled else None
    task.cost_split_type = request.cost_split_type if request.cost_enabled else None
    task.updated_at = datetime.now(timezone.utc)

    cost_by_uid = {c.uid: c for c in request.assignee_costs}
    junctions = db.query(User_Trip_Task_Junction).filter(
        User_Trip_Task_Junction.task_id == task.id
    ).all()
    for junction in junctions:
        cost = cost_by_uid.get(junction.user_id)
        junction.cost_amount = cost.amount if (request.cost_enabled and cost) else None
        junction.cost_percentage = cost.percentage if (request.cost_enabled and cost) else None

    db.commit()

    return UpdateTaskResponse(task_id=task.id, message="Task updated successfully")

"""
    Update Task Status Only
    A lightweight status change (e.g. the "Complete" button) that leaves
    every other field - including cost data - untouched. The full
    /task/update endpoint requires resubmitting the whole task, and would
    otherwise wipe cost data whenever a caller doesn't resend it.
"""
@router.post("/task/update-status", response_model=UpdateTaskStatusResponse, status_code=status.HTTP_200_OK)
async def update_task_status(request: UpdateTaskStatusRequest, db: db_dependency):
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    role = get_trip_role(db, request.uid, task.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found for this user")
    if role != "admin" and not is_task_assignee(db, request.uid, task.id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only update tasks assigned to you"
        )

    task.status = request.status
    task.updated_at = datetime.now(timezone.utc)
    db.commit()

    return UpdateTaskStatusResponse(task_id=task.id, message="Task status updated successfully")

"""
    Delete Task
"""
@router.post("/task/delete", response_model=DeleteTaskResponse, status_code=status.HTTP_200_OK)
async def delete_task(request: DeleteTaskRequest, db: db_dependency):
    task = db.query(Task).filter(Task.id == request.task_id).first()
    if not task:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")

    role = get_trip_role(db, request.uid, task.trip_id)
    if not role:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found for this user")
    if role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only trip admins can delete tasks")

    db.execute(
        text("DELETE FROM user_trip_task_junction WHERE task_id = :task_id"),
        {"task_id": request.task_id}
    )
    db.delete(task)
    db.commit()

    return DeleteTaskResponse(message="Task deleted successfully")