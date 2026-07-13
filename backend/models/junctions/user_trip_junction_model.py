from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User_Trip_Junction(Base):
    __tablename__ = "user_trip_junction"

    user_id = Column(String, primary_key=True, index=True)
    trip_id = Column(Integer, primary_key=True, index=True)
    role = Column(String, default="participant")  # 'admin' or 'participant'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())