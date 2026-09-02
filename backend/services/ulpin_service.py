import hashlib
from typing import Dict, Any, Optional

class ULPINService:
    def generate_ulpin(
        self,
        entity_type: str, # PARCEL, BUILDING, FLOOR, SPACE_UNIT
        entity_id: str,
        parent_ulpin: Optional[str] = None,
        admin_code: str = "IND-DEL",
        lat: float = 28.6139,
        lon: float = 77.2090,
        level: int = 0,
        unit_code: str = "000"
    ) -> str:
        """
        Generates a deterministic unique vertical cadastral property identifier (ULPIN).
        Format: ULPIN-{ADMIN_CODE}-{GEO_HASH}-{ENTITY_TYPE_PREFIX}-{ID_HASH}
        """
        entity_prefix = {
            "PARCEL": "PCL",
            "BUILDING": "BLD",
            "FLOOR": "FLR",
            "SPACE_UNIT": "UNT"
        }.get(entity_type.upper(), "ENT")

        # Round lat/lon to ~11m grid resolution
        lat_grid = int(lat * 10000)
        lon_grid = int(lon * 10000)

        seed = f"{admin_code}:{lat_grid}:{lon_grid}:{entity_type}:{entity_id}:{parent_ulpin or ''}:{level}:{unit_code}"
        digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()[:8].upper()

        if entity_type.upper() == "BUILDING":
            return f"ULPIN-{admin_code}-B{lat_grid}{lon_grid}-{digest}"
        elif entity_type.upper() == "FLOOR":
            parent_base = parent_ulpin if parent_ulpin else f"ULPIN-{admin_code}-B{lat_grid}{lon_grid}"
            return f"{parent_base}-L{level:02d}"
        elif entity_type.upper() == "SPACE_UNIT":
            parent_base = parent_ulpin if parent_ulpin else f"ULPIN-{admin_code}-B{lat_grid}{lon_grid}-L{level:02d}"
            return f"{parent_base}-U{unit_code}"
        else:
            return f"ULPIN-{admin_code}-{entity_prefix}-{digest}"

ulpin_service = ULPINService()
