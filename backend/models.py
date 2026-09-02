import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, Text, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from database import Base

class Building(Base):
    __tablename__ = "buildings"

    id = Column(String, primary_key=True, index=True) # e.g. osm-123456 or bldg-001
    source_id = Column(String, index=True, nullable=True) # way/123456
    source = Column(String, default="OpenStreetMap")
    name = Column(String, nullable=True)
    building_type = Column(String, default="residential")
    height = Column(Float, default=10.0) # meters
    levels = Column(Integer, default=3) # number of floors
    address = Column(String, nullable=True)
    geometry_json = Column(Text) # GeoJSON geometry string
    metadata_json = Column(Text, nullable=True) # Raw tags / metadata
    
    # Provenance
    is_derived = Column(Boolean, default=False)
    confidence = Column(Float, default=1.0)
    data_category = Column(String, default="SOURCE_DATA") # SOURCE_DATA, DERIVED_DATA, VERIFIED_DATA, ESTIMATED_DATA
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    floors = relationship("Floor", back_populates="building", cascade="all, delete-orphan")
    units = relationship("SpaceUnit", back_populates="building", cascade="all, delete-orphan")
    routes = relationship("AccessRoute", back_populates="building", cascade="all, delete-orphan")
    utilities = relationship("Utility", back_populates="building", cascade="all, delete-orphan")


class Floor(Base):
    __tablename__ = "floors"

    id = Column(String, primary_key=True, index=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=False)
    floor_number = Column(Integer, nullable=False) # e.g. 0 for Ground, 1, 2, ...
    floor_name = Column(String, nullable=False) # Ground Floor, Floor 1, etc.
    elevation = Column(Float, default=0.0) # elevation relative to ground level (meters)
    height = Column(Float, default=3.5) # height of floor (meters)
    source = Column(String, default="OSM_Derived")
    status = Column(String, default="ESTIMATED") # ESTIMATED, VERIFIED, DERIVED
    geometry_json = Column(Text, nullable=True) # GeoJSON for floor polygon

    building = relationship("Building", back_populates="floors")
    units = relationship("SpaceUnit", back_populates="floor", cascade="all, delete-orphan")


class SpaceUnit(Base):
    __tablename__ = "space_units"

    id = Column(String, primary_key=True, index=True)
    ulpin = Column(String, unique=True, index=True, nullable=True)
    parent_ulpin = Column(String, index=True, nullable=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=False)
    floor_id = Column(String, ForeignKey("floors.id"), nullable=False)
    unit_number = Column(String, nullable=False) # e.g. "101", "A-201"
    unit_type = Column(String, default="apartment") # apartment, commercial, common_area, parking, utility
    area_sqm = Column(Float, default=0.0)
    volume_cum = Column(Float, default=0.0)
    owner = Column(String, default="Unregistered / Prototype")
    status = Column(String, default="PROTOTYPE")
    source = Column(String, default="DERIVED")
    confidence = Column(Float, default=0.85)
    geometry_json = Column(Text, nullable=True)

    building = relationship("Building", back_populates="units")
    floor = relationship("Floor", back_populates="units")


class ULPINRecord(Base):
    __tablename__ = "ulpin_records"

    ulpin = Column(String, primary_key=True, index=True)
    entity_type = Column(String, nullable=False) # PARCEL, BUILDING, FLOOR, SPACE_UNIT
    entity_id = Column(String, nullable=False)
    parent_ulpin = Column(String, nullable=True, index=True)
    admin_code = Column(String, default="IND-DEL")
    parcel_code = Column(String, default="PCL-001")
    state = Column(String, default="ACTIVE")
    data_category = Column(String, default="PROTOTYPE_CADASTRE")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AccessRoute(Base):
    __tablename__ = "access_routes"

    id = Column(String, primary_key=True, index=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=False)
    route_name = Column(String, nullable=False) # e.g. "Main Entrance -> Elevator 1 -> Floor 3 -> Unit 302"
    start_point = Column(String, default="Main Gate")
    end_point = Column(String, default="Unit Entrance")
    path_points_json = Column(Text) # JSON array of coordinates [lat, lon, z]
    distance_m = Column(Float, default=0.0)
    route_type = Column(String, default="STANDARD") # STANDARD, EMERGENCY_EXIT, ACCESSIBLE
    is_emergency = Column(Boolean, default=False)

    building = relationship("Building", back_populates="routes")


class Utility(Base):
    __tablename__ = "utilities"

    id = Column(String, primary_key=True, index=True)
    building_id = Column(String, ForeignKey("buildings.id"), nullable=True)
    utility_type = Column(String, nullable=False) # WATER, ELECTRICITY, SEWER, GAS, TELECOM, DRAINAGE
    elevation_m = Column(Float, default=-1.5) # depth under ground or elevation in building
    geometry_json = Column(Text) # GeoJSON LineString / Point / Polygon
    status = Column(String, default="ACTIVE")
    owner = Column(String, default="Municipal Board")
    diameter_mm = Column(Float, default=150.0)

    building = relationship("Building", back_populates="utilities")


class ValidationIssue(Base):
    __tablename__ = "validation_issues"

    id = Column(String, primary_key=True, index=True)
    issue_type = Column(String, nullable=False) # SELF_INTERSECTION, OVERLAPPING_VOLUME, ORPHAN_FLOOR, DUP_ULPIN, etc.
    severity = Column(String, default="WARNING") # ERROR, WARNING, INFO
    category = Column(String, default="TOPOLOGY_2D") # TOPOLOGY_2D, TOPOLOGY_3D, RELATIONAL
    entity_type = Column(String, nullable=False) # BUILDING, FLOOR, SPACE_UNIT, ULPIN
    entity_id = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    geometry_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    entity_type = Column(String, nullable=False)
    entity_id = Column(String, nullable=False)
    action = Column(String, nullable=False) # CREATE, UPDATE, DELETE, INGEST_OSM, GENERATE_ULPIN
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    user = Column(String, default="System Admin")
    details_json = Column(Text, nullable=True)
