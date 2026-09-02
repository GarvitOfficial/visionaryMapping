import logging
from typing import Dict, Any, List

logger = logging.getLogger("ai_pipeline")

class AIPipelineInterface:
    """
    Interface specification for future AI/ML automated cadastre features:
    - Drone photogrammetry building extraction
    - Floor segmentation from point clouds / building facades
    - Change detection between live satellite/drone imagery and OSM baseline
    """

    async def run_building_extraction_from_imagery(self, image_url: str, bbox: List[float]) -> Dict[str, Any]:
        """Stub interface for AI Building Extraction model (e.g. Mask R-CNN / Segment Anything GIS)."""
        logger.info(f"AI Pipeline: Simulating building extraction for imagery {image_url}")
        return {
            "status": "READY_FOR_MODEL",
            "model_version": "AI-Cadastre-Extractor-v1.0",
            "detected_buildings_count": 0,
            "confidence_score": 0.92
        }

    async def detect_cadastral_changes(self, osm_geojson: Dict[str, Any], drone_geojson: Dict[str, Any]) -> Dict[str, Any]:
        """Stub interface for cadastral change detection comparing reference OSM vs high-res survey."""
        return {
            "status": "COMPARED",
            "new_structures_detected": 0,
            "demolished_structures_detected": 0,
            "height_discrepancies": []
        }

ai_pipeline = AIPipelineInterface()
