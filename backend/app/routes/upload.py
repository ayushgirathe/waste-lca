import threading
import os
import uuid
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session
from app.models.database import SessionLocal
from app.models.user import User
from app.models.task import UploadTask
from app.routes.auth import get_current_user
from app.services.task_processor import process_upload_task

router = APIRouter(prefix="/upload", tags=["upload"])

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.post("/process/{task_id}")
def process_task_manually(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger processing for a task (for debugging)"""
    task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Start processing in background
    thread = threading.Thread(target=process_upload_task, args=(task.id, task.file_path))
    thread.daemon = True
    thread.start()
    
    return {"message": f"Processing started for task {task_id}"}

@router.post("/")
async def upload_file(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Save file
    file_ext = file.filename.split(".")[-1]
    unique_name = f"{uuid.uuid4()}.{file_ext}"
    file_path = os.path.join(UPLOAD_DIR, unique_name)
    
    content = await file.read()
    with open(file_path, "wb") as f:
        f.write(content)
    
    # Create task in DB
    task = UploadTask(
        user_id=current_user.id,
        file_name=file.filename,
        file_path=file_path,
        status="pending"
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    
    # Start background processing
    thread = threading.Thread(target=process_upload_task, args=(task.id, file_path))
    thread.daemon = True
    thread.start()
    
    return {"task_id": task.id, "status": "pending", "message": "File uploaded, processing started"}


@router.get("/tasks")
def get_tasks(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all upload tasks for the current user"""
    tasks = db.query(UploadTask).filter(UploadTask.user_id == current_user.id).order_by(UploadTask.created_at.desc()).all()
    
    return [
        {
            "id": t.id,
            "file_name": t.file_name,
            "status": t.status,
            "extracted_materials": t.extracted_materials,
            "created_at": t.created_at.isoformat() if t.created_at else None
        }
        for t in tasks
    ]
@router.get("/materials/{task_id}")
def get_task_materials(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get extracted materials for a specific task"""
    task = db.query(UploadTask).filter(
        UploadTask.id == task_id,
        UploadTask.user_id == current_user.id
    ).first()
    
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    materials = json.loads(task.extracted_materials) if task.extracted_materials else []
    
    return {
        "task_id": task.id,
        "file_name": task.file_name,
        "status": task.status,
        "materials": materials,
        "created_at": task.created_at.isoformat() if task.created_at else None
    }