from database import engine, Base
from sqlalchemy import Column, Integer, String, TIMESTAMP as TimeStamp


class UserTasks(Base):
    __tablename__ = "user_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_correlation_id = Column(Integer, index=True)
    title = Column(String, index=True)
    description = Column(String, index=True)
    priority = Column(Integer, index=True)
    deadline = Column(TimeStamp, index=True)
    status = Column(Integer, index=True)
    created_timestamp = Column(TimeStamp, index=True)
    last_modified_timestamp = Column(TimeStamp, index=True)
