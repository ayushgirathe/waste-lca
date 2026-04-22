from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.models.database import Base

class UploadTask(Base):
    __tablename__ = "upload_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    file_name = Column(String)
    file_path = Column(String)
    status = Column(String, default="pending")
    extracted_materials = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
