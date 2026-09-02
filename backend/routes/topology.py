from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from database import get_db
from services.topology_service import topology_service

router = APIRouter(prefix="/api/topology", tags=["Topology Validation"])

@router.get("/check", response_model=Dict[str, Any])
def run_topology_check(db: Session = Depends(get_db)):
    """Runs automated 2D, 3D vertical, and relational cadastral checks."""
    result = topology_service.run_all_checks(db)
    return result
