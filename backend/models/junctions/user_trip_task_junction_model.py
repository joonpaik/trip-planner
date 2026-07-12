from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.sql import func
from database import Base

class User_Trip_Task_Junction(Base):
    __tablename__ = "user_trip_task_junction"

    user_id = Column(String, primary_key=True, index=True)
    trip_id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, primary_key=True, index=True)
    assigned_at = Column(DateTime(timezone=True), index=True)
    cost_amount = Column(Numeric(10, 2))
    cost_percentage = Column(Numeric(5, 2))