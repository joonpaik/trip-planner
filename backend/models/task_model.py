from sqlalchemy import Column, Integer, String, Boolean, DateTime, Numeric
from sqlalchemy.sql import func
from database import Base

class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True)
    status = Column(Integer, index=True)
    deadline = Column(DateTime(timezone=True), index=True)
    trip_id = Column(Integer, index=True)
    total_cost = Column(Numeric(10, 2))
    cost_split_type = Column(String)  # 'direct' or 'percentage'
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())