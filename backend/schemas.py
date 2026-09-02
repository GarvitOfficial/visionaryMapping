from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

class BuildingMetadataSchema(BaseModel):
    id: str
    source_id: Optional[str] = None
    source: str = "OpenStreetMap"
    name: Optional[str] = None
    building_type: str = "residential"
    height: float = 10.0
    levels: int = 3
    address: Optional[str] = None
    is_derived: bool = False
    confidence: float = 1.0
    data_category: str = "SOURCE_DATA"
    raw_tags: Optional[Dict[str, Any]] = None

class GeoJSONGeometrySchema(BaseModel):
    type: str
    coordinates: Any

class GeoJSONFeatureSchema(BaseModel):
    type: str = "Feature"
    id: str
    geometry: GeoJSONGeometrySchema
    properties: Dict[str, Any]

class GeoJSONFeatureCollectionSchema(BaseModel):
    type: str = "FeatureCollection"
    features: List[GeoJSONFeatureSchema]

class ULPINGenerateRequest(BaseModel):
    entity_type: str # BUILDING, FLOOR, SPACE_UNIT
    entity_id: str
    parent_ulpin: Optional[str] = None
    admin_code: Optional[str] = "IND-DEL"

class SolarShadowRequest(BaseModel):
    latitude: float = 28.6139
    longitude: float = 77.2090
    date_str: str = "2026-09-01" # YYYY-MM-DD
    time_str: str = "14:00" # HH:MM (Local or UTC)
    building_id: Optional[str] = None

class TopologyCheckResultSchema(BaseModel):
    total_issues: int
    errors_count: int
    warnings_count: int
    valid_status: bool
    issues: List[Dict[str, Any]]
