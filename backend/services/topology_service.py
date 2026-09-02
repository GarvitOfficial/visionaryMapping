import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from shapely.geometry import shape, Polygon
from models import Building, Floor, SpaceUnit, ULPINRecord, ValidationIssue

class TopologyService:
    def run_all_checks(self, db: Session) -> Dict[str, Any]:
        issues: List[Dict[str, Any]] = []
        
        buildings = db.query(Building).all()
        floors = db.query(Floor).all()
        units = db.query(SpaceUnit).all()
        ulpins = db.query(ULPINRecord).all()

        # ----------------------------------------------------
        # 1. 2D Geometry Validation Checks
        # ----------------------------------------------------
        building_shapes: Dict[str, Polygon] = {}
        for b in buildings:
            if not b.geometry_json:
                issues.append({
                    "id": f"issue-geom-missing-{b.id}",
                    "issue_type": "MISSING_GEOMETRY",
                    "severity": "ERROR",
                    "category": "TOPOLOGY_2D",
                    "entity_type": "BUILDING",
                    "entity_id": b.id,
                    "description": f"Building '{b.name or b.id}' is missing geometry data."
                })
                continue

            try:
                geom_dict = json.loads(b.geometry_json)
                poly = shape(geom_dict)
                
                if not poly.is_valid:
                    issues.append({
                        "id": f"issue-self-intersect-{b.id}",
                        "issue_type": "SELF_INTERSECTION",
                        "severity": "ERROR",
                        "category": "TOPOLOGY_2D",
                        "entity_type": "BUILDING",
                        "entity_id": b.id,
                        "description": f"Building '{b.name or b.id}' has self-intersecting or invalid 2D boundary polygon."
                    })
                
                if poly.area <= 0.0:
                    issues.append({
                        "id": f"issue-zero-area-{b.id}",
                        "issue_type": "INVALID_POLYGON",
                        "severity": "ERROR",
                        "category": "TOPOLOGY_2D",
                        "entity_type": "BUILDING",
                        "entity_id": b.id,
                        "description": f"Building '{b.name or b.id}' has zero footprint area."
                    })

                building_shapes[b.id] = poly
            except Exception as e:
                issues.append({
                    "id": f"issue-parse-fail-{b.id}",
                    "issue_type": "MALFORMED_GEOMETRY",
                    "severity": "ERROR",
                    "category": "TOPOLOGY_2D",
                    "entity_type": "BUILDING",
                    "entity_id": b.id,
                    "description": f"Building '{b.name or b.id}' geometry parsing error: {e}"
                })

        # Check Duplicate Footprints
        bldg_ids = list(building_shapes.keys())
        for i in range(len(bldg_ids)):
            for j in range(i + 1, len(bldg_ids)):
                id1, id2 = bldg_ids[i], bldg_ids[j]
                p1, p2 = building_shapes[id1], building_shapes[id2]
                if p1.equals(p2):
                    issues.append({
                        "id": f"issue-dup-geom-{id1}-{id2}",
                        "issue_type": "DUPLICATE_GEOMETRY",
                        "severity": "WARNING",
                        "category": "TOPOLOGY_2D",
                        "entity_type": "BUILDING",
                        "entity_id": id1,
                        "description": f"Building footprint '{id1}' is identical in 2D geometry to building '{id2}'."
                    })

        # ----------------------------------------------------
        # 2. 3D Volume & Vertical Extent Checks
        # ----------------------------------------------------
        for b in buildings:
            if b.height <= 0.0:
                issues.append({
                    "id": f"issue-invalid-height-{b.id}",
                    "issue_type": "INVALID_VERTICAL_EXTENT",
                    "severity": "ERROR",
                    "category": "TOPOLOGY_3D",
                    "entity_type": "BUILDING",
                    "entity_id": b.id,
                    "description": f"Building '{b.name or b.id}' has non-positive height ({b.height}m)."
                })

            if b.levels <= 0:
                issues.append({
                    "id": f"issue-invalid-levels-{b.id}",
                    "issue_type": "INVALID_VERTICAL_EXTENT",
                    "severity": "WARNING",
                    "category": "TOPOLOGY_3D",
                    "entity_type": "BUILDING",
                    "entity_id": b.id,
                    "description": f"Building '{b.name or b.id}' has 0 levels registered."
                })

            # Verify total floor elevation height does not exceed building height
            b_floors = [f for f in floors if f.building_id == b.id]
            max_floor_elev = max([f.elevation + f.height for f in b_floors], default=0.0)
            if max_floor_elev > b.height + 0.5: # 0.5m tolerance
                issues.append({
                    "id": f"issue-floor-exceeds-building-{b.id}",
                    "issue_type": "VERTICAL_EXTENT_OVERRUN",
                    "severity": "WARNING",
                    "category": "TOPOLOGY_3D",
                    "entity_type": "BUILDING",
                    "entity_id": b.id,
                    "description": f"Combined floor elevation stack ({max_floor_elev:.1f}m) exceeds declared building height ({b.height:.1f}m)."
                })

        # ----------------------------------------------------
        # 3. Relational & ULPIN Integrity Checks
        # ----------------------------------------------------
        bldg_id_set = set(b.id for b in buildings)
        floor_id_set = set(f.id for f in floors)

        for f in floors:
            if f.building_id not in bldg_id_set:
                issues.append({
                    "id": f"issue-orphan-floor-{f.id}",
                    "issue_type": "ORPHAN_FLOOR",
                    "severity": "ERROR",
                    "category": "RELATIONAL",
                    "entity_type": "FLOOR",
                    "entity_id": f.id,
                    "description": f"Floor '{f.floor_name}' references missing parent building '{f.building_id}'."
                })

        for u in units:
            if u.building_id not in bldg_id_set:
                issues.append({
                    "id": f"issue-orphan-unit-bldg-{u.id}",
                    "issue_type": "ORPHAN_SPACE",
                    "severity": "ERROR",
                    "category": "RELATIONAL",
                    "entity_type": "SPACE_UNIT",
                    "entity_id": u.id,
                    "description": f"Unit '{u.unit_number}' references missing parent building '{u.building_id}'."
                })
            if u.floor_id not in floor_id_set:
                issues.append({
                    "id": f"issue-orphan-unit-flr-{u.id}",
                    "issue_type": "ORPHAN_SPACE",
                    "severity": "ERROR",
                    "category": "RELATIONAL",
                    "entity_type": "SPACE_UNIT",
                    "entity_id": u.id,
                    "description": f"Unit '{u.unit_number}' references missing parent floor '{u.floor_id}'."
                })

        # Duplicate ULPIN check
        seen_ulpins = set()
        for rec in ulpins:
            if rec.ulpin in seen_ulpins:
                issues.append({
                    "id": f"issue-dup-ulpin-{rec.ulpin}",
                    "issue_type": "DUPLICATE_ULPIN",
                    "severity": "ERROR",
                    "category": "RELATIONAL",
                    "entity_type": rec.entity_type,
                    "entity_id": rec.entity_id,
                    "description": f"Duplicate ULPIN detected: '{rec.ulpin}'."
                })
            seen_ulpins.add(rec.ulpin)

        errors_cnt = sum(1 for i in issues if i["severity"] == "ERROR")
        warnings_cnt = sum(1 for i in issues if i["severity"] == "WARNING")

        return {
            "total_issues": len(issues),
            "errors_count": errors_cnt,
            "warnings_count": warnings_cnt,
            "valid_status": (errors_cnt == 0),
            "issues": issues
        }

topology_service = TopologyService()
