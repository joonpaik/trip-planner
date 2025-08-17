from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import socketio
from database import engine, Base
# from models import 
from routes import auth, posts, users, messages
import os

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
# app.include_router(auth.router, prefix="/auth", tags=["Authentication"])
# app.include_router(posts.router, prefix="/posts", tags=["Posts"])
# app.include_router(users.router, prefix="/users", tags=["Users"])
# app.include_router(messages.router, prefix="/messages", tags=["Messages"])

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "Family Social Network API"}

@app.get("/")
async def root():
    return {"message": "Family Social Network API", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)