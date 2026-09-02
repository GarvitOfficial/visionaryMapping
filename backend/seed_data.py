import json
import datetime
from database import engine, SessionLocal, Base
from models import Building, Floor, SpaceUnit, ULPINRecord, AccessRoute, Utility, ValidationIssue, AuditLog
from services.ulpin_service import ulpin_service

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    if db.query(Building).first():
        print("Database already contains records. Skipping seed.")
        db.close()
        return

    print("Seeding initial 3D ULPIN Cadastre dataset...")

    # 1. Sample Buildings in Delhi GIS Sector
    b1_id = "osm-delhi-001"
    b1_coords = [
        [77.2085, 28.6135],
        [77.2095, 28.6135],
        [77.2095, 28.6143],
        [77.2085, 28.6143],
        [77.2085, 28.6135]
    ]

    bldg1 = Building(
        id=b1_id,
        source_id="way/987654321",
        source="OpenStreetMap",
        name="Connaught Heights Vertical Tower A",
        building_type="apartments",
        height=28.0,
        levels=8,
        address="Connaught Place, Sector 1, New Delhi, 110001",
        geometry_json=json.dumps({"type": "Polygon", "coordinates": [b1_coords]}),
        metadata_json=json.dumps({"building": "apartments", "building:levels": "8", "architect": "Central CPWD"}),
        is_derived=False,
        confidence=1.0,
        data_category="SOURCE_DATA"
    )
    db.add(bldg1)
    db.commit()

    b1_ulpin = ulpin_service.generate_ulpin("BUILDING", b1_id, lat=28.6139, lon=77.2090)
    db.add(ULPINRecord(
        ulpin=b1_ulpin,
        entity_type="BUILDING",
        entity_id=b1_id,
        admin_code="IND-DEL",
        parcel_code="PCL-DEL-101",
        state="ACTIVE",
        data_category="PROTOTYPE_CADASTRE"
    ))
    db.commit()

    # Create 8 floors for Building 1
    floor_height = 3.5
    for lvl in range(8):
        flr_name = "Ground Floor" if lvl == 0 else f"Floor {lvl}"
        flr_id = f"flr-{b1_id}-{lvl}"
        elev = round(lvl * floor_height, 1)

        db.add(Floor(
            id=flr_id,
            building_id=b1_id,
            floor_number=lvl,
            floor_name=flr_name,
            elevation=elev,
            height=floor_height,
            source="OSM_Derived",
            status="ESTIMATED",
            geometry_json=bldg1.geometry_json
        ))
        
        flr_ulpin = ulpin_service.generate_ulpin("FLOOR", flr_id, parent_ulpin=b1_ulpin, level=lvl)
        db.add(ULPINRecord(
            ulpin=flr_ulpin,
            entity_type="FLOOR",
            entity_id=flr_id,
            parent_ulpin=b1_ulpin,
            state="ACTIVE"
        ))
        db.commit()

        # Create Units
        for u_idx in range(1, 3):
            unit_no = f"{lvl}0{u_idx}" if lvl > 0 else f"G0{u_idx}"
            unit_id = f"unit-{b1_id}-{lvl}-{u_idx}"
            u_ulpin = ulpin_service.generate_ulpin("SPACE_UNIT", unit_id, parent_ulpin=flr_ulpin, level=lvl, unit_code=unit_no)

            db.add(SpaceUnit(
                id=unit_id,
                ulpin=u_ulpin,
                parent_ulpin=flr_ulpin,
                building_id=b1_id,
                floor_id=flr_id,
                unit_number=unit_no,
                unit_type="residential" if u_idx == 1 else "commercial_office",
                area_sqm=95.5,
                volume_cum=round(95.5 * floor_height, 1),
                owner=f"Owner of Unit {unit_no}",
                status="REGISTERED_PROTOTYPE",
                source="DERIVED",
                confidence=0.90
            ))
            db.add(ULPINRecord(
                ulpin=u_ulpin,
                entity_type="SPACE_UNIT",
                entity_id=unit_id,
                parent_ulpin=flr_ulpin,
                state="ACTIVE"
            ))
            db.commit()

    # 2. Access Routes for Building 1
    db.add(AccessRoute(
        id="route-001",
        building_id=b1_id,
        route_name="Main Gate -> Elevator A -> Floor 5 -> Unit 501",
        start_point="Main Security Gate",
        end_point="Unit 501 Door",
        path_points_json=json.dumps([
            [77.2085, 28.6135, 0.0],
            [77.2090, 28.6138, 0.0],
            [77.2090, 28.6138, 17.5],
            [77.2092, 28.6140, 17.5]
        ]),
        distance_m=42.5,
        route_type="STANDARD",
        is_emergency=False
    ))
    db.add(AccessRoute(
        id="route-002",
        building_id=b1_id,
        route_name="Emergency Exit Staircase B -> Courtyard Assembly Point",
        start_point="Floor 8 Corridor",
        end_point="Assembly Area",
        path_points_json=json.dumps([
            [77.2095, 28.6143, 28.0],
            [77.2095, 28.6143, 0.0],
            [77.2098, 28.6145, 0.0]
        ]),
        distance_m=58.0,
        route_type="EMERGENCY_EXIT",
        is_emergency=True
    ))

    # 3. Utilities for Building 1
    db.add(Utility(
        id="util-water-01",
        building_id=b1_id,
        utility_type="WATER",
        elevation_m=-2.0,
        geometry_json=json.dumps({
            "type": "LineString",
            "coordinates": [[77.2080, 28.6130], [77.2090, 28.6138], [77.2090, 28.6145]]
        }),
        status="ACTIVE",
        owner="Delhi Jal Board (DJB)",
        diameter_mm=200.0
    ))
    db.add(Utility(
        id="util-power-01",
        building_id=b1_id,
        utility_type="ELECTRICITY",
        elevation_m=-1.0,
        geometry_json=json.dumps({
            "type": "LineString",
            "coordinates": [[77.2075, 28.6132], [77.2088, 28.6137]]
        }),
        status="ACTIVE",
        owner="BSES Rajdhani Power",
        diameter_mm=90.0
    ))
    db.add(Utility(
        id="util-telecom-01",
        building_id=b1_id,
        utility_type="TELECOM",
        elevation_m=-0.5,
        geometry_json=json.dumps({
            "type": "LineString",
            "coordinates": [[77.2082, 28.6133], [77.2091, 28.6139]]
        }),
        status="ACTIVE",
        owner="MTNL Fiber Optical Network",
        diameter_mm=50.0
    ))

    # 4. Audit Log
    db.add(AuditLog(
        entity_type="SYSTEM",
        entity_id="SYS-INIT",
        action="INITIALIZE_CADASTRE",
        user="System Administrator",
        details_json=json.dumps({"message": "Initial 3D Cadastre environment provisioned."})
    ))

    db.commit()
    db.close()
    print("Database seeding completed successfully.")

if __name__ == "__main__":
    seed_database()
