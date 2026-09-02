from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from seed_data import seed_database

from routes.buildings import router as buildings_router
from routes.ulpins import router as ulpins_router
from routes.topology import router as topology_router
from routes.shadow import router as shadow_router
from routes.routes_utilities import router as routes_utilities_router

# Create DB tables
Base.metadata.create_all(bind=engine)
# Seed initial database
seed_database()

app = FastAPI(
    title="3D ULPIN / Cadastre System API",
    description="Backend API service for 3D ULPIN vertical property mapping, OpenStreetMap Overpass building retrieval, topology validation, and solar shadow analysis.",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount router endpoints
app.include_router(buildings_router)
app.include_router(ulpins_router)
app.include_router(topology_router)
app.include_router(shadow_router)
app.include_router(routes_utilities_router)

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "service": "3D ULPIN Cadastre Engine",
        "data_sources": ["OpenStreetMap Overpass API", "SQLite Spatial Registry"]
    }
