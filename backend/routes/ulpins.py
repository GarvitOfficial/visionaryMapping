from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional

from database import get_db
from models import ULPINRecord, Building, Floor, SpaceUnit, AuditLog
from schemas import ULPINGenerateRequest
from services.ulpin_service import ulpin_service

router = APIRouter(prefix="/api/ulpins", tags=["ULPIN Registry"])

@router.get("")
def list_ulpins(
    search: Optional[str] = Query(None, description="Search term for ULPIN or entity ID"),
    entity_type: Optional[str] = Query(None, description="Filter by BUILDING, FLOOR, SPACE_UNIT"),
    db: Session = Depends(get_db)
):
    query = db.query(ULPINRecord)
    if search:
        query = query.filter(ULPINRecord.ulpin.contains(search) | ULPINRecord.entity_id.contains(search))
    if entity_type:
        query = query.filter(ULPINRecord.entity_type == entity_type.upper())

    records = query.all()
    
    results = []
    for r in records:
        details = {}
        if r.entity_type == "BUILDING":
            b = db.query(Building).filter(Building.id == r.entity_id).first()
            if b:
                details = {"name": b.name, "building_type": b.building_type, "source": b.source, "address": b.address}
        elif r.entity_type == "FLOOR":
            fl = db.query(Floor).filter(Floor.id == r.entity_id).first()
            if fl:
                details = {"floor_name": fl.floor_name, "elevation": fl.elevation, "status": fl.status}
        elif r.entity_type == "SPACE_UNIT":
            u = db.query(SpaceUnit).filter(SpaceUnit.id == r.entity_id).first()
            if u:
                details = {"unit_number": u.unit_number, "unit_type": u.unit_type, "owner": u.owner, "area_sqm": u.area_sqm}

        results.append({
            "ulpin": r.ulpin,
            "entity_type": r.entity_type,
            "entity_id": r.entity_id,
            "parent_ulpin": r.parent_ulpin,
            "admin_code": r.admin_code,
            "state": r.state,
            "data_category": r.data_category,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "details": details
        })

    return results


@router.get("/hierarchy/{ulpin}")
def get_ulpin_hierarchy(ulpin: str, db: Session = Depends(get_db)):
    rec = db.query(ULPINRecord).filter(ULPINRecord.ulpin == ulpin).first()
    if not rec:
        raise HTTPException(status_code=404, detail="ULPIN not found")

    # Reconstruct parent-to-child tree
    if rec.entity_type == "BUILDING":
        b = db.query(Building).filter(Building.id == rec.entity_id).first()
        floors = db.query(Floor).filter(Floor.building_id == rec.entity_id).all()
        
        children = []
        for f in floors:
            fl_ulpin_rec = db.query(ULPINRecord).filter(ULPINRecord.entity_id == f.id, ULPINRecord.entity_type == "FLOOR").first()
            fl_ulpin = fl_ulpin_rec.ulpin if fl_ulpin_rec else f.id

            units = db.query(SpaceUnit).filter(SpaceUnit.floor_id == f.id).all()
            unit_nodes = []
            for u in units:
                unit_nodes.append({
                    "label": f"Unit {u.unit_number} ({u.unit_type})",
                    "ulpin": u.ulpin,
                    "entity_type": "SPACE_UNIT",
                    "entity_id": u.id,
                    "children": []
                })

            children.append({
                "label": f"{f.floor_name} ({f.height}m elev)",
                "ulpin": fl_ulpin,
                "entity_type": "FLOOR",
                "entity_id": f.id,
                "children": unit_nodes
            })

        tree = {
            "label": f"Building: {b.name if b else rec.entity_id}",
            "ulpin": rec.ulpin,
            "entity_type": "BUILDING",
            "entity_id": rec.entity_id,
            "children": children
        }
        return tree

    return {
        "label": f"{rec.entity_type}: {rec.entity_id}",
        "ulpin": rec.ulpin,
        "entity_type": rec.entity_type,
        "entity_id": rec.entity_id,
        "children": []
    }


@router.post("/generate")
def generate_ulpin_record(req: ULPINGenerateRequest, db: Session = Depends(get_db)):
    new_ulpin = ulpin_service.generate_ulpin(
        entity_type=req.entity_type,
        entity_id=req.entity_id,
        parent_ulpin=req.parent_ulpin,
        admin_code=req.admin_code or "IND-DEL"
    )

    existing = db.query(ULPINRecord).filter(ULPINRecord.ulpin == new_ulpin).first()
    if existing:
        return {"ulpin": existing.ulpin, "status": "EXISTS", "message": "ULPIN already registered."}

    rec = ULPINRecord(
        ulpin=new_ulpin,
        entity_type=req.entity_type.upper(),
        entity_id=req.entity_id,
        parent_ulpin=req.parent_ulpin,
        admin_code=req.admin_code or "IND-DEL",
        state="ACTIVE",
        data_category="PROTOTYPE_CADASTRE"
    )
    db.add(rec)
    
    # Audit log
    log = AuditLog(
        entity_type=req.entity_type.upper(),
        entity_id=req.entity_id,
        action="GENERATE_ULPIN",
        user="Cadastral Officer",
        details_json=f'{{"generated_ulpin": "{new_ulpin}"}}'
    )
    db.add(log)
    db.commit()

    return {"ulpin": new_ulpin, "status": "CREATED", "message": "ULPIN successfully generated."}
