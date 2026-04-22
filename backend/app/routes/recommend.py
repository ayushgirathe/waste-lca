from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List, Optional
from app.services.neo4j_client import neo4j_client
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/recommend", tags=["recommend"])

# Market prices for recovered materials (USD per kg)
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
    "cobalt": 32.00,
}

class RecommendRequest(BaseModel):
    materials: List[str]
    preference: str = "cost"
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None
    waste_quantity_kg: Optional[float] = 1000

def calculate_profitability(route: dict, materials: List[str], waste_quantity_kg: float) -> dict:
    """Calculate revenue, costs, profit, and ROI for a recycling route"""
    
    # Calculate revenue from recovered materials
    total_revenue = 0
    material_breakdown = []
    
    material_count = len(materials)
    if material_count == 0:
        material_count = 1
    
    for material in materials:
        material_lower = material.lower()
        price_per_kg = MATERIAL_PRICES.get(material_lower, 1.0)
        
        # Estimated kg of this material in the waste
        estimated_kg = waste_quantity_kg / material_count
        # Recovered amount after processing
        recovery_rate = route.get("recovery", 85) / 100
        recovered_kg = estimated_kg * recovery_rate
        revenue = recovered_kg * price_per_kg
        total_revenue += revenue
        
        material_breakdown.append({
            "name": material,
            "estimated_kg": round(estimated_kg, 2),
            "recovered_kg": round(recovered_kg, 2),
            "price_per_kg_usd": price_per_kg,
            "revenue_usd": round(revenue, 2)
        })
    
    # Calculate costs
    processing_cost = route.get("total_cost_per_kg", route.get("cost", 0)) * waste_quantity_kg
    transport_cost = route.get("transport_cost_per_kg", 0) * waste_quantity_kg
    total_cost = processing_cost + transport_cost
    
    # Calculate profit
    net_profit = total_revenue - total_cost
    roi_percentage = (net_profit / total_cost) * 100 if total_cost > 0 else 0
    
    # Payback period
    payback_months = round(total_cost / net_profit, 1) if net_profit > 0 else 0
    
    return {
        "waste_quantity_kg": waste_quantity_kg,
        "revenue_usd": round(total_revenue, 2),
        "processing_cost_usd": round(processing_cost, 2),
        "transport_cost_usd": round(transport_cost, 2),
        "total_cost_usd": round(total_cost, 2),
        "net_profit_usd": round(net_profit, 2),
        "roi_percentage": round(roi_percentage, 1),
        "payback_months": payback_months,
        "is_profitable": net_profit > 0,
        "material_breakdown": material_breakdown
    }

@router.post("/")
def recommend(
    req: RecommendRequest,
    current_user: User = Depends(get_current_user)
):
    try:
        print(f"Received request: materials={req.materials}, preference={req.preference}, quantity={req.waste_quantity_kg}")
        
        # Get routes from Neo4j with location-based calculations
        routes = neo4j_client.get_recycling_routes(
            req.materials, 
            req.user_lat, 
            req.user_lng
        )
        
        if not routes:
            return {"routes": [], "message": "No routes found for given materials"}
        
        # Add profitability calculation to each route
        for route in routes:
            profitability = calculate_profitability(
                route, 
                req.materials, 
                req.waste_quantity_kg or 1000
            )
            route["profitability"] = profitability
        
        # Sort based on preference
        if req.preference == "cost":
            routes.sort(key=lambda x: x.get("total_cost_per_kg", x.get("cost", float('inf'))))
        elif req.preference == "emissions":
            routes.sort(key=lambda x: x.get("total_co2_per_kg", x.get("co2", float('inf'))))
        elif req.preference == "distance":
            routes.sort(key=lambda x: x.get("distance_km", float('inf')))
        elif req.preference == "profit":
            routes.sort(key=lambda x: x.get("profitability", {}).get("net_profit_usd", 0), reverse=True)
        elif req.preference == "roi":
            routes.sort(key=lambda x: x.get("profitability", {}).get("roi_percentage", 0), reverse=True)
        
        print(f"Returning {len(routes)} routes sorted by {req.preference}")
        return {"routes": routes}
        
    except Exception as e:
        print(f"Error in recommend endpoint: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))