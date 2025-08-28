from fastapi import FastAPI, Depends, HTTPException, Request
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
from typing import Annotated, Callable
from starlette import status
import json

# Create database tables
Base.metadata.create_all(bind=engine)

# Initialize FastAPI
app = FastAPI(title="Family Social Network", version="1.0.0")

@app.middleware("http")
async def log_requests(request: Request, call_next: Callable):
    # Only log specific endpoints to avoid spam
    if request.url.path.startswith("/auth/"):
        print(f"\n🔍 === REQUEST DEBUG for {request.url.path} ===")
        print(f"Method: {request.method}")
        print(f"Headers: {dict(request.headers)}")
        print(f"Content-Type: {request.headers.get('content-type')}")
        print(f"Content-Length: {request.headers.get('content-length', 'Not set')}")
        
        # Read the request body
        body = await request.body()
        print(f"Raw Body: {body}")
        print(f"Raw Body Length: {len(body)}")
        
        if body:
            try:
                # Try to decode as UTF-8
                body_str = body.decode('utf-8')
                print(f"Body as String: '{body_str}'")
                
                # Try to parse as JSON
                if request.headers.get('content-type') == 'application/json':
                    json_data = json.loads(body_str)
                    print(f"Parsed JSON: {json_data}")
                    print(f"JSON Keys: {list(json_data.keys())}")
                    print(f"JSON Values: {list(json_data.values())}")
                else:
                    print(f"Content-Type is not application/json")
                    
            except UnicodeDecodeError:
                print(f"❌ Cannot decode body as UTF-8")
            except json.JSONDecodeError as e:
                print(f"❌ Cannot parse as JSON: {e}")
        else:
            print("❌ BODY IS EMPTY!")
        
        print(f"=== END REQUEST DEBUG ===\n")
    
    # Call the next middleware/endpoint
    response = await call_next(request)
    return response

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    # allow_origins=["http://localhost:3000", "https://smithfamily.social"],
    allow_origins=["*"],

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
    