from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, Numeric
from sqlalchemy.sql import func
from database import Base

class Trip(Base):
    __tablename__ = "trips"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, unique=True, index=True)
    description = Column(String, unique=True, index=True)
    location = Column("locations", JSON, index=True)  # List of locations
    # location, flights, accomodations
    status = Column(String, index=True)
    start_date = Column(DateTime(timezone=True), index=True)
    end_date = Column(DateTime(timezone=True), index=True)
    budget = Column(Numeric(10, 2))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())