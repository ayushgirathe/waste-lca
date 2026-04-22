from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
from app.services.blockchain_service import blockchain_service
from app.routes.auth import get_current_user
from app.models.user import User
from app.models.database import SessionLocal
from app.models.task import UploadTask
import os
import shutil
from datetime import datetime

router = APIRouter(prefix="/blockchain", tags=["blockchain"])

class VerifyRequest(BaseModel):
    file_hash: str

@router.post("/record")
async def record_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload and record a document on the blockchain"""
    
    # Save file temporarily
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # Calculate hash
    file_hash = blockchain_service.calculate_file_hash(temp_path)
    
    # Record on blockchain
    result = blockchain_service.record_on_blockchain(
        file_hash=file_hash,
        file_name=file.filename,
        user_email=current_user.email,
        metadata={
            "size": os.path.getsize(temp_path),
            "timestamp": datetime.now().isoformat()
        }
    )
    
    # Generate QR code
    qr_code = blockchain_service.generate_qr_code(file_hash, file.filename)
    result["qr_code"] = qr_code
    result["verification_url"] = f"/verify?hash={file_hash}"
    
    # Clean up
    os.remove(temp_path)
    
    return result

@router.post("/verify")
def verify_document(request: VerifyRequest, current_user: User = Depends(get_current_user)):
    """Verify a document using its hash"""
    result = blockchain_service.verify_document(request.file_hash)
    return result

@router.get("/task/{task_id}")
def verify_task(task_id: int, current_user: User = Depends(get_current_user)):
    """Verify a specific uploaded task"""
    db = SessionLocal()
    try:
        task = db.query(UploadTask).filter(
            UploadTask.id == task_id,
            UploadTask.user_id == current_user.id
        ).first()
        
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Calculate hash of the uploaded file
        if os.path.exists(task.file_path):
            file_hash = blockchain_service.calculate_file_hash(task.file_path)
            verification = blockchain_service.verify_document(file_hash)
            
            if verification["verified"]:
                # Generate QR code for verification
                qr_code = blockchain_service.generate_qr_code(file_hash, task.file_name)
                verification["qr_code"] = qr_code
                verification["file_hash"] = file_hash
                verification["file_name"] = task.file_name
            
            return verification
        else:
            return {"verified": False, "error": "File not found"}
    finally:
        db.close()

@router.get("/records")
def get_all_records(current_user: User = Depends(get_current_user)):
    """Get all blockchain records (admin only)"""
    # In production, add admin check
    records = blockchain_service.get_all_records()
    return {"records": records, "count": len(records)}