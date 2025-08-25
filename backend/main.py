from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio
from routes import auth_routes
from sqlalchemy.orm import Session
from database import engine, Base, SessionLocal, get_db
from models import user_tasks_model
from routes import posts, users, messages, user_tasks_routes
import os
from routes.auth_routes import get_current_user
from typing import Annotated
from starlette import status

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(title="Family Social Network", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://smithfamily.social"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for uploads
if not os.path.exists("uploads"):
    os.makedirs("uploads")
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include routers
app.include_router(user_tasks_routes.router)
app.include_router(auth_routes.router, tags=["Authentication"])
# app.include_router(posts.router, prefix="/posts", tags=["Posts"])
# app.include_router(users.router, prefix="/users", tags=["Users"])
# app.include_router(messages.router, prefix="/messages", tags=["Messages"])

# Dependencies
db_dependency = Annotated[Session, Depends(get_db)]
user_dependency = Annotated[dict, Depends(get_current_user)]

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Family Social Network API"}

@app.get("/", status_code=status.HTTP_200_OK)
async def user(user: user_dependency, db: db_dependency):
    return {"User": user}

print("Starting application...")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)
    