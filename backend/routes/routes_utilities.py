import json
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from database import get_db
from models import AccessRoute, Utility, Building

router = APIRouter(prefix="/api", tags=["Access Routes & Utilities"])

@router.get("/access-routes")
def get_access_routes(building_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(AccessRoute)
    if building_id:
        routes = query.filter(AccessRoute.building_id == building_id).all()
        if not routes:
            bldg = db.query(Building).filter(Building.id == building_id).first()
            if bldg and bldg.geometry_json:
                try:
                    geom = json.loads(bldg.geometry_json)
                    coords = geom.get("coordinates", [[]])[0] if geom.get("type") == "Polygon" else []
                    if coords and len(coords) > 0:
                        c0 = coords[0]
                        c1 = coords[len(coords)//2]
                        r1 = AccessRoute(
                            id=f"route-{building_id}-1",
                            building_id=building_id,
                            route_name=f"Main Access Gate -> Lobby -> Floor {bldg.levels or 4} Unit",
                            start_point="Security Lobby",
                            end_point="Primary Floor Unit",
                            path_points_json=json.dumps([
                                [c0[0] - 0.0001, c0[1] - 0.0001, 0.0],
                                [c0[0], c0[1], 0.0],
                                [c0[0], c0[1], bldg.height * 0.75]
                            ]),
                            distance_m=round(bldg.height + 30.0, 1),
                            route_type="STANDARD",
                            is_emergency=False
                        )
                        r2 = AccessRoute(
                            id=f"route-{building_id}-2",
                            building_id=building_id,
                            route_name="Emergency Evacuation Stairwell -> Assembly Point",
                            start_point="Roof Access Deck",
                            end_point="Safety Courtyard",
                            path_points_json=json.dumps([
                                [c1[0], c1[1], bldg.height],
                                [c1[0], c1[1], 0.0],
                                [c1[0] + 0.0002, c1[1] + 0.0002, 0.0]
                            ]),
                            distance_m=round(bldg.height + 45.0, 1),
                            route_type="EMERGENCY_EXIT",
                            is_emergency=True
                        )
                        db.add(r1)
                        db.add(r2)
                        db.commit()
                        routes = [r1, r2]
                except Exception:
                    pass
    else:
        routes = query.all()
        if not routes:
            # Generate sample routes for first building if DB is fresh
            bldg = db.query(Building).first()
            if bldg:
                return get_access_routes(building_id=bldg.id, db=db)

    results = []
    for r in routes:
        results.append({
            "id": r.id,
            "building_id": r.building_id,
            "route_name": r.route_name,
            "start_point": r.start_point,
            "end_point": r.end_point,
            "distance_m": r.distance_m,
            "route_type": r.route_type,
            "is_emergency": r.is_emergency,
            "path_points": json.loads(r.path_points_json) if r.path_points_json else []
        })

    return results

@router.get("/utilities")
def get_utilities(building_id: Optional[str] = Query(None), db: Session = Depends(get_db)):
    query = db.query(Utility)
    if building_id:
        utils = query.filter(Utility.building_id == building_id).all()
        if not utils:
            bldg = db.query(Building).filter(Building.id == building_id).first()
            if bldg and bldg.geometry_json:
                try:
                    geom = json.loads(bldg.geometry_json)
                    coords = geom.get("coordinates", [[]])[0] if geom.get("type") == "Polygon" else []
                    if coords and len(coords) > 0:
                        c0 = coords[0]
                        u1 = Utility(
                            id=f"util-w-{building_id}",
                            building_id=building_id,
                            utility_type="WATER",
                            elevation_m=-2.5,
                            geometry_json=json.dumps({"type": "LineString", "coordinates": [[c0[0]-0.0003, c0[1]-0.0003], [c0[0], c0[1]]]}),
                            status="ACTIVE",
                            owner="Municipal Water Authority",
                            diameter_mm=250.0
                        )
                        u2 = Utility(
                            id=f"util-e-{building_id}",
                            building_id=building_id,
                            utility_type="ELECTRICITY",
                            elevation_m=-1.2,
                            geometry_json=json.dumps({"type": "LineString", "coordinates": [[c0[0]-0.0002, c0[1]+0.0002], [c0[0], c0[1]]]}),
                            status="ACTIVE",
                            owner="Regional Grid Corp",
                            diameter_mm=110.0
                        )
                        u3 = Utility(
                            id=f"util-t-{building_id}",
                            building_id=building_id,
                            utility_type="TELECOM",
                            elevation_m=-0.8,
                            geometry_json=json.dumps({"type": "LineString", "coordinates": [[c0[0]+0.0002, c0[1]-0.0002], [c0[0], c0[1]]]}),
                            status="ACTIVE",
                            owner="Fiber Optical Grid",
                            diameter_mm=60.0
                        )
                        db.add(u1)
                        db.add(u2)
                        db.add(u3)
                        db.commit()
                        utils = [u1, u2, u3]
                except Exception:
                    pass
    else:
        utils = query.all()
        if not utils:
            bldg = db.query(Building).first()
            if bldg:
                return get_utilities(building_id=bldg.id, db=db)

    results = []
    for u in utils:
        results.append({
            "id": u.id,
            "building_id": u.building_id,
            "utility_type": u.utility_type,
            "elevation_m": u.elevation_m,
            "status": u.status,
            "owner": u.owner,
            "diameter_mm": u.diameter_mm,
            "geometry": json.loads(u.geometry_json) if u.geometry_json else None
        })

    return results
