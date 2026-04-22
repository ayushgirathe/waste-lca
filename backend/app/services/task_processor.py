import json
import os
from app.services.ai_service import ai_analyzer
from app.models.database import SessionLocal
from app.models.task import UploadTask

def extract_text_from_txt(file_path: str) -> str:
    """Extract text from plain text file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except Exception as e:
        print(f"Error reading text file: {e}")
        return ""

def process_upload_task(task_id: int, file_path: str, quantity_kg: float = 1000):
    """Process uploaded file with AI analysis"""
    db = SessionLocal()
    try:
        task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
        if not task:
            print(f"❌ Task {task_id} not found")
            return
        
        task.status = "processing"
        db.commit()
        print(f"🔄 Processing task {task_id}: {task.file_name}")
        
        # Check file type and extract text accordingly
        file_ext = file_path.lower()
        
        if file_ext.endswith('.txt'):
            # For text files, read directly
            text = extract_text_from_txt(file_path)
            if text:
                # Use LLM directly on the text
                materials = ai_analyzer.extract_materials_with_llm(text)
                if materials:
                    recovery = ai_analyzer.calculate_recovery_value(materials, quantity_kg)
                    task.extracted_materials = json.dumps(materials)
                    task.status = "completed"
                    db.commit()
                    print(f"✅ Task {task_id} completed from text file")
                    print(f"   📊 Found {len(materials)} materials")
                    print(f"   💰 Estimated recovery value: ${recovery['total_recovery_value_usd']:,.2f}")
                else:
                    task.status = "failed"
                    db.commit()
                    print(f"❌ Task {task_id} failed: No materials extracted")
            else:
                task.status = "failed"
                db.commit()
                print(f"❌ Task {task_id} failed: Could not read text file")
        
        elif file_ext.endswith('.pdf') or file_ext.endswith(('.png', '.jpg', '.jpeg')):
            # Use full AI analysis for PDF/images
            result = ai_analyzer.analyze_document(file_path, quantity_kg)
            
            if result['success']:
                task.extracted_materials = json.dumps(result['materials'])
                task.status = "completed"
                db.commit()
                print(f"✅ Task {task_id} completed")
                print(f"   📊 Found {len(result['materials'])} materials")
                if result['recovery_value']:
                    print(f"   💰 Estimated recovery value: ${result['recovery_value']['total_recovery_value_usd']:,.2f}")
            else:
                task.status = "failed"
                db.commit()
                print(f"❌ Task {task_id} failed: {result['error']}")
        else:
            task.status = "failed"
            db.commit()
            print(f"❌ Task {task_id} failed: Unsupported file type {file_ext}")
            
    except Exception as e:
        print(f"❌ Error processing task {task_id}: {e}")
        if db:
            task = db.query(UploadTask).filter(UploadTask.id == task_id).first()
            if task:
                task.status = "failed"
                db.commit()
    finally:
        db.close()