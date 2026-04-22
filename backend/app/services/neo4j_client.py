from neo4j import GraphDatabase
from app.config import settings
from math import radians, sin, cos, sqrt, atan2

class Neo4jClient:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )

    def close(self):
        self.driver.close()

    def calculate_distance(self, lat1: float, lng1: float, lat2: float, lng2: float) -> float:
        """Calculate distance between two points in km using Haversine formula"""
        if not lat1 or not lng1 or not lat2 or not lng2:
            return 0
        R = 6371  # Earth's radius in km
        
        lat1_rad = radians(lat1)
        lat2_rad = radians(lat2)
        delta_lat = radians(lat2 - lat1)
        delta_lng = radians(lng2 - lng1)
        
        a = sin(delta_lat / 2) ** 2 + cos(lat1_rad) * cos(lat2_rad) * sin(delta_lng / 2) ** 2
        c = 2 * atan2(sqrt(a), sqrt(1 - a))
        
        return R * c

    def get_recycling_routes(self, materials: list, user_lat: float = None, user_lng: float = None):
        """Get recycling routes with optional location-based calculations"""
        if not materials:
            return []
        
        # Transport emission factors (kg CO2 per ton-km)
        TRUCK_EMISSION_PER_TON_KM = 0.062  # kg CO2 per ton-km
        TRUCK_COST_PER_TON_KM = 0.15  # USD per ton-km
        
        with self.driver.session() as session:
            query = """
            UNWIND $materials AS material_name
            MATCH (m:Material {name: material_name})
            OPTIONAL MATCH (m)<-[:PROCESS_FOR_MATERIAL]-(p:RecyclingProcess)
            OPTIONAL MATCH (p)<-[:VENDOR_PROCESSES]-(v:Vendor)
            OPTIONAL MATCH (i:Incentive)-[:OFFERS_INCENTIVE]->(p)
            RETURN DISTINCT 
                   v.name AS vendor, 
                   v.lat AS vendor_lat,
                   v.lng AS vendor_lng,
                   v.city AS city,
                   v.state AS state,
                   p.type AS process, 
                   COALESCE(p.opex_usd_per_kg, 0) AS processing_cost,
                   COALESCE(p.co2_per_kg, 0) AS processing_co2,
                   COALESCE(p.water_l_per_kg, 0) AS water,
                   COALESCE(p.recovery_rate, 0) AS recovery,
                   i.name AS incentive
            """
            result = session.run(query, materials=materials)
            
            records = []
            for record in result:
                if record.get("vendor"):
                    route = {
                        "vendor": record.get("vendor"),
                        "city": record.get("city"),
                        "state": record.get("state"),
                        "process": record.get("process"),
                        "processing_cost": float(record.get("processing_cost") or 0),
                        "processing_co2": float(record.get("processing_co2") or 0),
                        "water": float(record.get("water") or 0),
                        "recovery": float(record.get("recovery") or 0),
                        "incentive": record.get("incentive")
                    }
                    
                    # Calculate transport impact if user location is provided
                    if user_lat and user_lng and record.get("vendor_lat") and record.get("vendor_lng"):
                        distance = self.calculate_distance(
                            user_lat, user_lng,
                            record.get("vendor_lat"), record.get("vendor_lng")
                        )
                        
                        # For 1 ton (1000 kg) of waste
                        weight_ton = 1
                        
                        # Transport emissions (kg CO2)
                        transport_co2 = distance * TRUCK_EMISSION_PER_TON_KM * weight_ton
                        
                        # Transport cost (USD)
                        transport_cost = distance * TRUCK_COST_PER_TON_KM * weight_ton
                        
                        # Convert to per kg
                        route["distance_km"] = round(distance, 1)
                        route["transport_co2_per_kg"] = round(transport_co2 / 1000, 4)
                        route["transport_cost_per_kg"] = round(transport_cost / 1000, 4)
                        route["total_cost_per_kg"] = round(route["processing_cost"] + route["transport_cost_per_kg"], 4)
                        route["total_co2_per_kg"] = round(route["processing_co2"] + route["transport_co2_per_kg"], 4)
                    else:
                        route["distance_km"] = None
                        route["transport_co2_per_kg"] = 0
                        route["transport_cost_per_kg"] = 0
                        route["total_cost_per_kg"] = route["processing_cost"]
                        route["total_co2_per_kg"] = route["processing_co2"]
                    
                    records.append(route)
            
            return records

# Create singleton instance
neo4j_client = Neo4jClient()