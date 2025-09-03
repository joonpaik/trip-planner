from sqlalchemy import Column, Integer, String, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base

class User_Trip_Task_Junction(Base):
    __tablename__ = "user_trip_task_junction"

    user_id = Column(String, index=True)
    trip_id = Column(Integer, index=True)
    task_id = Column(Integer, index=True)
    assigned_at = Column(DateTime(timezone=True), index=True)