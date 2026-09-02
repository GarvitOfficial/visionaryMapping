import sys
import os
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.ulpin_service import ulpin_service
from services.shadow_service import shadow_service
from services.osm_service import osm_service

class TestCadastreServices(unittest.TestCase):
    def test_ulpin_generation(self):
        bldg_ulpin = ulpin_service.generate_ulpin("BUILDING", "bldg-test-101", lat=28.6139, lon=77.2090)
        self.assertTrue(bldg_ulpin.startswith("ULPIN-IND-DEL-B286139772090-"))
        
        flr_ulpin = ulpin_service.generate_ulpin("FLOOR", "flr-test-1", parent_ulpin=bldg_ulpin, level=3)
        self.assertEqual(flr_ulpin, f"{bldg_ulpin}-L03")

        unit_ulpin = ulpin_service.generate_ulpin("SPACE_UNIT", "unit-test-1", parent_ulpin=flr_ulpin, level=3, unit_code="301")
        self.assertEqual(unit_ulpin, f"{flr_ulpin}-U301")

    def test_solar_position(self):
        solar = shadow_service.calculate_solar_position(28.6139, 77.2090, "2026-09-01", "13:00")
        self.assertIn("solar_elevation_deg", solar)
        self.assertIn("solar_azimuth_deg", solar)
        self.assertIsInstance(solar["solar_elevation_deg"], float)

    def test_bbox_validation(self):
        valid, msg = osm_service.validate_bbox(28.50, 77.10, 28.52, 77.12)
        self.assertTrue(valid)

        invalid, msg = osm_service.validate_bbox(10.0, 70.0, 40.0, 90.0) # Too large
        self.assertFalse(invalid)

if __name__ == "__main__":
    unittest.main()
