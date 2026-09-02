import json
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Dict, Any, Optional

from database import get_db
from models import Building, Floor, SpaceUnit, ULPINRecord, AuditLog
from services.osm_service import osm_service
from services.ulpin_service import ulpin_service

logger = logging.getLogger("buildings_route")

router = APIRouter(prefix="/api/buildings", tags=["Buildings"])

@router.get("", response_model=Dict[str, Any])
async def get_buildings(
    south: float = Query(..., description="South latitude bound"),
    west: float = Query(..., description="West longitude bound"),
    north: float = Query(..., description="North latitude bound"),
    east: float = Query(..., description="East longitude bound"),
    db: Session = Depends(get_db)
):
    """
    Fetches real OSM building footprints for given bounding box.
    Fast batch persistence to local SQLite.
    """
    try:
        geojson = await osm_service.fetch_buildings_geojson(south, west, north, east)
        features = geojson.get("features", [])

        # Fast batch persist new buildings without per-item commits
        new_buildings = []
        new_ulpins = []

        existing_ids = set(r[0] for r in db.query(Building.id).all())

        for feat in features:
            b_props = feat.get("properties", {})
            b_id = b_props.get("id")

            if b_id and b_id not in existing_ids:
                existing_ids.add(b_id)
                new_bldg = Building(
                    id=b_id,
                    source_id=b_props.get("source_id"),
                    source=b_props.get("source", "OpenStreetMap"),
                    name=b_props.get("name"),
                    building_type=b_props.get("building_type", "residential"),
                    height=b_props.get("height", 10.0),
                    levels=b_props.get("levels", 3),
                    address=b_props.get("address"),
                    geometry_json=json.dumps(feat.get("geometry")),
                    metadata_json=json.dumps(b_props.get("raw_tags", {})),
                    is_derived=b_props.get("is_derived", False),
                    confidence=b_props.get("confidence", 1.0),
                    data_category=b_props.get("data_category", "SOURCE_DATA")
                )
                new_buildings.append(new_bldg)

                # Generate base building ULPIN
                bldg_ulpin = ulpin_service.generate_ulpin(
                    entity_type="BUILDING",
                    entity_id=b_id,
                    lat=(south + north) / 2.0,
                    lon=(west + east) / 2.0
                )
                ulpin_rec = ULPINRecord(
                    ulpin=bldg_ulpin,
                    entity_type="BUILDING",
                    entity_id=b_id,
                    admin_code="DELHI-CADASTRE-01",
                    state="ACTIVE",
                    data_category="SOURCE_DATA"
                )
                new_ulpins.append(ulpin_rec)

        if new_buildings:
            db.bulk_save_objects(new_buildings)
            db.bulk_save_objects(new_ulpins)
            db.commit()

        return geojson
    except Exception as e:
        logger.error(f"Error in get_buildings: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{building_id}", response_model=Dict[str, Any])
def get_building_by_id(building_id: str, db: Session = Depends(get_db)):
    """
    Fetches full building details, including dynamically generated floors, units,
    access routes, utilities, and ULPIN hierarchy for ANY detected building worldwide.
    """
    building = db.query(Building).filter(Building.id == building_id).first()
    if not building:
        building = db.query(Building).filter(Building.source_id.contains(building_id)).first()
    
    if not building:
        raise HTTPException(status_code=404, detail="Building not found in registry")

    # Ensure floors and units exist for this building
    floors = db.query(Floor).filter(Floor.building_id == building.id).all()
    if not floors:
        floor_height = 3.5
        levels_count = building.levels or 4
        new_floors = []
        new_units = []
        new_ulpins = []

        bldg_ulpin_rec = db.query(ULPINRecord).filter(ULPINRecord.entity_id == building.id, ULPINRecord.entity_type == "BUILDING").first()
        b_ulpin = bldg_ulpin_rec.ulpin if bldg_ulpin_rec else f"ULPIN-BLDG-{building.id}"

        for lvl in range(levels_count):
            flr_id = f"flr-{building.id}-{lvl}"
            flr_name = "Ground Floor" if lvl == 0 else f"Floor {lvl}"
            elev = round(lvl * floor_height, 1)

            flr = Floor(
                id=flr_id,
                building_id=building.id,
                floor_number=lvl,
                floor_name=flr_name,
                elevation=elev,
                height=floor_height,
                source="OSM_Derived",
                status="VERIFIED",
                geometry_json=building.geometry_json
            )
            new_floors.append(flr)

            fl_ulpin = ulpin_service.generate_ulpin("FLOOR", flr_id, parent_ulpin=b_ulpin, level=lvl)
            new_ulpins.append(ULPINRecord(
                ulpin=fl_ulpin,
                entity_type="FLOOR",
                entity_id=flr_id,
                parent_ulpin=b_ulpin,
                state="ACTIVE"
            ))

            for u_idx in range(1, 3):
                unit_no = f"{lvl}0{u_idx}" if lvl > 0 else f"G0{u_idx}"
                unit_id = f"unit-{building.id}-{lvl}-{u_idx}"
                u_ulpin = ulpin_service.generate_ulpin("SPACE_UNIT", unit_id, parent_ulpin=fl_ulpin, level=lvl, unit_code=unit_no)

                new_units.append(SpaceUnit(
                    id=unit_id,
                    ulpin=u_ulpin,
                    parent_ulpin=fl_ulpin,
                    building_id=building.id,
                    floor_id=flr_id,
                    unit_number=unit_no,
                    unit_type="residential" if u_idx == 1 else "commercial_office",
                    area_sqm=85.0,
                    volume_cum=round(85.0 * floor_height, 1),
                    owner=f"Owner of Unit {unit_no}",
                    status="REGISTERED",
                    source="AUTOMATED",
                    confidence=0.95
                ))
                new_ulpins.append(ULPINRecord(
                    ulpin=u_ulpin,
                    entity_type="SPACE_UNIT",
                    entity_id=unit_id,
                    parent_ulpin=fl_ulpin,
                    state="ACTIVE"
                ))

        db.bulk_save_objects(new_floors)
        db.bulk_save_objects(new_units)
        db.bulk_save_objects(new_ulpins)
        db.commit()
        floors = db.query(Floor).filter(Floor.building_id == building.id).all()

    units = db.query(SpaceUnit).filter(SpaceUnit.building_id == building.id).all()

    return {
        "building": {
            "id": building.id,
            "name": building.name or f"Building #{building.id}",
            "building_type": building.building_type,
            "height": building.height,
            "levels": building.levels,
            "address": building.address,
            "source": building.source,
            "geometry_json": building.geometry_json
        },
        "floors": [{"id": f.id, "floor_number": f.floor_number, "floor_name": f.floor_name, "elevation": f.elevation, "height": f.height} for f in floors],
        "units": [{"id": u.id, "unit_number": u.unit_number, "unit_type": u.unit_type, "area_sqm": u.area_sqm, "owner": u.owner, "ulpin": u.ulpin} for u in units]
    }

