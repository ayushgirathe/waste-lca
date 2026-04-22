from fastapi import APIRouter, Depends, HTTPException
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, List, Optional
from app.models.database import SessionLocal
from app.models.user import User
from app.models.task import UploadTask
from app.routes.auth import get_current_user
import json

router = APIRouter(prefix="/analytics", tags=["analytics"])

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Material market prices (USD per kg)
MATERIAL_PRICES = {
    "copper": 8.95,
    "aluminum": 2.35,
    "gold": 58200,
    "silver": 740,
    "steel": 0.52,
    "plastic": 0.35,
    "lithium": 12.50,
    "lead": 2.15,
    "zinc": 2.85,
    "tin": 28.50,
    "nickel": 16.50,
}

# CO2 savings per kg of material recycled
CO2_SAVINGS = {
    "copper": 3.5,
    "aluminum": 8.2,
    "steel": 1.8,
    "plastic": 2.5,
    "gold": 0.5,
    "silver": 0.8,
    "lead": 2.0,
    "zinc": 2.2,
    "tin": 1.5,
    "lithium": 4.0,
    "nickel": 3.0,
}

# Water savings per kg of material recycled
WATER_SAVINGS = {
    "copper": 150,
    "aluminum": 200,
    "steel": 100,
    "plastic": 180,
    "gold": 300,
    "silver": 250,
    "lead": 120,
    "zinc": 130,
    "tin": 110,
    "lithium": 250,
    "nickel": 160,
}

@router.get("/stats")
def get_analytics_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get real analytics stats from user's uploaded tasks"""
    
    # Get all tasks for this user
    tasks = db.query(UploadTask).filter(
        UploadTask.user_id == current_user.id
    ).order_by(UploadTask.created_at.desc()).all()
    
    completed_tasks = [t for t in tasks if t.status == "completed"]
    
    # Calculate real stats
    total_waste_kg = 0
    total_co2_saved = 0
    total_water_saved = 0
    total_material_value = 0
    total_materials_count = 0
    material_breakdown = {}
    
    for task in completed_tasks:
        if task.extracted_materials:
            try:
                materials = json.loads(task.extracted_materials)
                # Assume each report represents 100kg of waste
                waste_kg = 100
                total_waste_kg += waste_kg
                
                for material in materials:
                    name = material.get("name", "").lower()
                    percentage = material.get("percentage", 0)
                    weight_kg = waste_kg * (percentage / 100)
                    
                    total_materials_count += 1
                    
                    if name in material_breakdown:
                        material_breakdown[name] += percentage
                    else:
                        material_breakdown[name] = percentage
                    
                    co2_factor = CO2_SAVINGS.get(name, 1.5)
                    total_co2_saved += weight_kg * co2_factor
                    
                    water_factor = WATER_SAVINGS.get(name, 100)
                    total_water_saved += weight_kg * water_factor
                    
                    price = MATERIAL_PRICES.get(name, 1.0)
                    total_material_value += weight_kg * price
                    
            except json.JSONDecodeError:
                continue
    
    # Monthly trend data
    monthly_data = {}
    for task in tasks:
        if task.status == "completed":
            month = task.created_at.strftime("%Y-%m")
            if month not in monthly_data:
                monthly_data[month] = {"waste": 0, "value": 0, "count": 0}
            monthly_data[month]["count"] += 1
            monthly_data[month]["waste"] += 100
    
    monthly_trend = [
        {
            "month": datetime.strptime(m, "%Y-%m").strftime("%b %Y"),
            "waste": data["waste"],
            "count": data["count"]
        }
        for m, data in sorted(monthly_data.items())
    ][-6:]
    
    # Format material breakdown
    total_percentage = sum(material_breakdown.values())
    pie_chart_data = [
        {
            "name": name.capitalize(),
            "value": round((value / total_percentage) * 100, 1) if total_percentage > 0 else 0
        }
        for name, value in material_breakdown.items()
    ][:6]
    
    return {
        "success": True,
        "stats": {
            "total_waste_kg": round(total_waste_kg, 2),
            "total_co2_saved": round(total_co2_saved, 2),
            "total_water_saved": round(total_water_saved, 2),
            "total_material_value": round(total_material_value, 2),
            "total_reports": len(completed_tasks),
            "total_materials": total_materials_count,
            "recovery_rate": 92
        },
        "monthly_trend": monthly_trend,
        "material_breakdown": pie_chart_data,
        "recent_tasks": [
            {
                "id": t.id,
                "file_name": t.file_name,
                "status": t.status,
                "created_at": t.created_at.isoformat(),
                "materials": json.loads(t.extracted_materials) if t.extracted_materials else []
            }
            for t in tasks[:10]
        ]
    }

@router.get("/health")
def health_check():
    return {"status": "ok"}