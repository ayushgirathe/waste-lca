"""
Live Market Price Service for Recyclable Materials
Fetches real-time commodity prices from free APIs
"""

import requests
import json
from datetime import datetime, timedelta
from typing import Dict, Optional, List
import logging

logger = logging.getLogger(__name__)

class MarketPriceService:
    """Service to fetch live market prices for recyclable materials"""
    
    def __init__(self):
        # Using multiple free API sources as fallbacks
        self.apis = {
            # Metal prices (copper, aluminum, etc.)
            "metals": {
                "url": "https://api.metals.live/v1/spot",
                "free": True,
                "mapping": {
                    "copper": "copper",
                    "aluminum": "aluminum",
                    "gold": "gold",
                    "silver": "silver",
                    "steel": "steel",
                    "lead": "lead",
                    "zinc": "zinc",
                    "nickel": "nickel",
                    "tin": "tin"
                }
            },
            # Alternative source - MetalRadar (LME prices)
            "metalradar": {
                "url": "https://api.metalradar.com/v1/prices",
                "free": True,
                "requires_key": True
            }
        }
        
        # Cache for prices to avoid rate limiting
        self.cache: Dict[str, Dict] = {}
        self.cache_expiry: Dict[str, datetime] = {}
        self.cache_duration = timedelta(minutes=5)  # Cache for 5 minutes
    
    def get_price(self, material: str) -> Optional[Dict]:
        """Get current price for a specific material"""
        material_lower = material.lower()
        
        # Check cache first
        if material_lower in self.cache and material_lower in self.cache_expiry:
            if datetime.now() < self.cache_expiry[material_lower]:
                return self.cache[material_lower]
        
        # Fetch from API
        price_data = self._fetch_from_metals_api(material_lower)
        
        if price_data:
            self.cache[material_lower] = price_data
            self.cache_expiry[material_lower] = datetime.now() + self.cache_duration
            return price_data
        
        # Fallback to local market prices
        return self._get_local_price(material_lower)
    
    def get_all_prices(self) -> Dict[str, Dict]:
        """Get prices for all recyclable materials"""
        materials = ["copper", "aluminum", "gold", "silver", "steel", 
                    "lead", "zinc", "tin", "nickel", "plastic", "lithium"]
        
        prices = {}
        for material in materials:
            price_data = self.get_price(material)
            if price_data:
                prices[material] = price_data
        
        return prices
    
    def _fetch_from_metals_api(self, material: str) -> Optional[Dict]:
        """Fetch price from Metals.live API (free, no key required)"""
        try:
            response = requests.get(self.apis["metals"]["url"], timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                
                # Find the matching metal
                for item in data:
                    item_name = item.get("name", "").lower()
                    if material in item_name or item_name in material:
                        return {
                            "price": float(item.get("price", 0)),
                            "unit": "USD/kg",
                            "change": float(item.get("change", 0)),
                            "trend": "up" if float(item.get("change", 0)) > 0 else "down",
                            "source": "Metals.live",
                            "last_updated": datetime.now().isoformat()
                        }
            
            return None
            
        except Exception as e:
            logger.error(f"Error fetching from Metals API: {e}")
            return None
    
    def _get_local_price(self, material: str) -> Dict:
        """Fallback to local/static market prices when API fails"""
        # Local market prices (USD per kg) - fallback values
        local_prices = {
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
            "nickel": 16.50
        }
        
        price = local_prices.get(material, 1.0)
        
        return {
            "price": price,
            "unit": "USD/kg",
            "change": 0,
            "trend": "stable",
            "source": "Local Database",
            "last_updated": datetime.now().isoformat()
        }

# Singleton instance
market_price_service = MarketPriceService()