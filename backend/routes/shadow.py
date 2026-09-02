import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from database import get_db
from models import Building
from schemas import SolarShadowRequest
from services.shadow_service import shadow_service

router = APIRouter(prefix="/api/shadow", tags=["Shadow & Sunlight Analysis"])

@router.post("/calculate")
def calculate_shadow(req: SolarShadowRequest, db: Session = Depends(get_db)):
    solar_info = shadow_service.calculate_solar_position(
        lat=req.latitude,
        lon=req.longitude,
        date_str=req.date_str,
        time_str=req.time_str
    )

    shadow_features = []

    if req.building_id:
        buildings = db.query(Building).filter(Building.id == req.building_id).all()
    else:
        buildings = db.query(Building).limit(20).all()

    for b in buildings:
        if not b.geometry_json:
            continue
        try:
            geom = json.loads(b.geometry_json)
            if geom.get("type") == "Polygon":
                coords = geom.get("coordinates", [[]])[0]
                shadow_coords = shadow_service.compute_shadow_polygon(
                    base_coordinates=coords,
                    building_height_m=b.height,
                    elevation_deg=solar_info["solar_elevation_deg"],
                    azimuth_deg=solar_info["solar_azimuth_deg"]
                )
                
                shadow_features.append({
                    "type": "Feature",
                    "id": f"shadow-{b.id}",
                    "geometry": {
                        "type": "Polygon",
                        "coordinates": [shadow_coords] if shadow_coords else []
                    },
                    "properties": {
                        "building_id": b.id,
                        "building_name": b.name,
                        "building_height": b.height,
                        "solar_elevation": solar_info["solar_elevation_deg"],
                        "solar_azimuth": solar_info["solar_azimuth_deg"]
                    }
                })
        except Exception:
            pass

    return {
        "solar": solar_info,
        "location": {"latitude": req.latitude, "longitude": req.longitude},
        "datetime": f"{req.date_str} {req.time_str}",
        "shadow_geojson": {
            "type": "FeatureCollection",
            "features": shadow_features
        }
    }
