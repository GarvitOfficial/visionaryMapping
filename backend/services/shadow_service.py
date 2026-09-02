import math
import datetime
from typing import Dict, Any, List
from shapely.geometry import Polygon, mapping

class ShadowService:
    def calculate_solar_position(self, lat: float, lon: float, date_str: str, time_str: str) -> Dict[str, float]:
        """
        Calculates Solar Elevation Angle and Solar Azimuth Angle using solar position equations.
        """
        try:
            dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        except ValueError:
            dt = datetime.datetime.utcnow()

        # Day of year (N)
        day_of_year = dt.timetuple().tm_yday
        
        # Fractional year in radians
        gamma = (2 * math.pi / 365) * (day_of_year - 1 + (dt.hour - 12) / 24)

        # Solar declination (radians)
        declination = 0.006918 - 0.399912 * math.cos(gamma) + 0.070257 * math.sin(gamma) \
                      - 0.006758 * math.cos(2*gamma) + 0.000907 * math.sin(2*gamma) \
                      - 0.002697 * math.cos(3*gamma) + 0.00148 * math.sin(3*gamma)

        # Equation of time (minutes)
        eqtime = 229.18 * (0.000075 + 0.001868 * math.cos(gamma) - 0.032077 * math.sin(gamma) \
                 - 0.014615 * math.cos(2*gamma) - 0.040849 * math.sin(2*gamma))

        # Solar time in minutes
        time_offset = eqtime + 4 * lon
        t_solar = dt.hour * 60 + dt.minute + time_offset
        hour_angle = math.radians((t_solar / 4) - 180) # Solar Hour Angle in radians

        lat_rad = math.radians(lat)

        # Zenith angle
        cos_zenith = math.sin(lat_rad) * math.sin(declination) + math.cos(lat_rad) * math.cos(declination) * math.cos(hour_angle)
        cos_zenith = max(-1.0, min(1.0, cos_zenith))
        zenith = math.acos(cos_zenith)
        
        elevation = 90.0 - math.degrees(zenith) # Solar altitude angle in degrees

        # Solar Azimuth Angle
        cos_azimuth = (math.sin(declination) * math.cos(lat_rad) - math.cos(declination) * math.sin(lat_rad) * math.cos(hour_angle)) / max(0.0001, math.sin(zenith))
        cos_azimuth = max(-1.0, min(1.0, cos_azimuth))
        azimuth = math.degrees(math.acos(cos_azimuth))
        if hour_angle > 0:
            azimuth = 360.0 - azimuth

        return {
            "solar_elevation_deg": round(elevation, 2),
            "solar_azimuth_deg": round(azimuth, 2),
            "is_daylight": elevation > 0
        }

    def compute_shadow_polygon(self, base_coordinates: List[List[float]], building_height_m: float, elevation_deg: float, azimuth_deg: float) -> List[List[float]]:
        """
        Projects 2D building footprint into a shadow polygon based on sun position and height.
        """
        if elevation_deg <= 0:
            return [] # Night time, no shadow

        # Shadow length ratio = H / tan(elevation)
        elevation_rad = math.radians(max(5.0, elevation_deg)) # clamp min 5 deg to prevent infinite shadow
        shadow_length_m = building_height_m / math.tan(elevation_rad)

        # Convert meters offset into rough lat/lon offset (~111,000 meters per degree)
        # Shadow direction is opposite to solar azimuth (sun is at azimuth, shadow falls at azimuth + 180)
        shadow_angle_rad = math.radians((azimuth_deg + 180) % 360)

        delta_lon = (shadow_length_m * math.sin(shadow_angle_rad)) / 111000.0
        delta_lat = (shadow_length_m * math.cos(shadow_angle_rad)) / 111000.0

        # Create extruded polygon combining original footprint and shifted points
        shifted_coords = [[pt[0] + delta_lon, pt[1] + delta_lat] for pt in base_coordinates]
        
        # Combine base and shifted coordinates into a single convex hull shadow boundary
        combined = base_coordinates[:-1] + shifted_coords
        try:
            poly = Polygon(combined).convex_hull
            return list(poly.exterior.coords)
        except Exception:
            return base_coordinates

shadow_service = ShadowService()
