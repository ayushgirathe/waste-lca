from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from app.routes.auth import get_current_user
from app.models.user import User

router = APIRouter(prefix="/market-prices", tags=["market-prices"])

# USD to INR conversion rate
USD_TO_INR = 93.78

# Local market prices (USD per kg)
LOCAL_PRICES_USD = {
    "copper": {"price": 8.95, "unit": "USD/kg", "change": 2.3, "trend": "up", "source": "LME"},
    "aluminum": {"price": 2.35, "unit": "USD/kg", "change": -0.8, "trend": "down", "source": "LME"},
    "gold": {"price": 58200, "unit": "USD/kg", "change": -0.5, "trend": "down", "source": "LBMA"},
    "silver": {"price": 740, "unit": "USD/kg", "change": 1.2, "trend": "up", "source": "LBMA"},
    "steel": {"price": 0.52, "unit": "USD/kg", "change": 0.3, "trend": "up", "source": "SBB"},
    "plastic": {"price": 0.35, "unit": "USD/kg", "change": -1.2, "trend": "down", "source": "Recyclet"},
    "lithium": {"price": 12.50, "unit": "USD/kg", "change": -3.5, "trend": "down", "source": "Fastmarkets"},
    "lead": {"price": 2.15, "unit": "USD/kg", "change": 0.5, "trend": "up", "source": "LME"},
    "zinc": {"price": 2.85, "unit": "USD/kg", "change": 1.1, "trend": "up", "source": "LME"},
    "tin": {"price": 28.50, "unit": "USD/kg", "change": 2.8, "trend": "up", "source": "LME"},
    "nickel": {"price": 16.50, "unit": "USD/kg", "change": -2.1, "trend": "down", "source": "LME"},
    "cobalt": {"price": 32.00, "unit": "USD/kg", "change": 5.2, "trend": "up", "source": "Fastmarkets"},
}

def convert_to_inr(price_usd: float) -> float:
    return round(price_usd * USD_TO_INR, 2)

def get_prices_in_currency(currency: str = "INR"):
    prices = {}
    for material, data in LOCAL_PRICES_USD.items():
        if currency.upper() == "INR":
            prices[material] = {
                "price": convert_to_inr(data["price"]),
                "unit": "₹/kg",
                "price_usd": data["price"],
                "change": data["change"],
                "trend": data["trend"],
                "source": data["source"],
                "exchange_rate": USD_TO_INR
            }
        else:
            prices[material] = {
                "price": data["price"],
                "unit": "USD/kg",
                "change": data["change"],
                "trend": data["trend"],
                "source": data["source"]
            }
    return prices

@router.get("/")
async def get_all_prices(
    currency: str = Query("INR", description="Currency: INR or USD"),
    current_user: User = Depends(get_current_user)
):
    prices = get_prices_in_currency(currency)
    return {
        "success": True,
        "prices": prices,
        "currency": currency.upper(),
        "exchange_rate": USD_TO_INR if currency.upper() == "INR" else None,
        "last_updated": datetime.now().isoformat(),
        "source": "LME + Local Database"
    }

@router.get("/exchange-rate")
async def get_exchange_rate(current_user: User = Depends(get_current_user)):
    """Get current USD to INR exchange rate"""
    return {
        "usd_to_inr": USD_TO_INR,
        "last_updated": datetime.now().isoformat()
    }

@router.get("/{material}")
async def get_material_price(
    material: str,
    currency: str = Query("INR", description="Currency: INR or USD"),
    current_user: User = Depends(get_current_user)
):
    material_lower = material.lower()
    if material_lower not in LOCAL_PRICES_USD:
        raise HTTPException(status_code=404, detail=f"Material '{material}' not found")
    
    data = LOCAL_PRICES_USD[material_lower]
    
    if currency.upper() == "INR":
        return {
            "name": material,
            "price": convert_to_inr(data["price"]),
            "unit": "₹/kg",
            "price_usd": data["price"],
            "change": data["change"],
            "trend": data["trend"],
            "source": data["source"],
            "exchange_rate": USD_TO_INR,
            "last_updated": datetime.now().isoformat()
        }
    else:
        return {
            "name": material,
            "price": data["price"],
            "unit": "USD/kg",
            "change": data["change"],
            "trend": data["trend"],
            "source": data["source"],
            "last_updated": datetime.now().isoformat()
        }

@router.post("/refresh")
async def refresh_prices(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "message": "Prices refreshed",
        "prices": get_prices_in_currency("INR"),
        "exchange_rate": USD_TO_INR,
        "last_updated": datetime.now().isoformat()
    }