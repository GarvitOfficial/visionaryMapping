export function parseCadastralQuery(queryStr) {
  if (!queryStr || typeof queryStr !== 'string') return null;
  const str = queryStr.trim();

  // 1. Check Web URL format (e.g., http://localhost:5173/?lat=28.6139&lon=77.2090&floor=4...)
  if (str.includes('lat=') && str.includes('lon=')) {
    try {
      const urlStr = str.startsWith('http') ? str : `http://dummy.com/${str.startsWith('?') ? str : '?' + str}`;
      const url = new URL(urlStr);
      const lat = parseFloat(url.searchParams.get('lat'));
      const lon = parseFloat(url.searchParams.get('lon'));
      const floorStr = url.searchParams.get('floor');
      const floor = floorStr !== null && floorStr !== undefined ? parseInt(floorStr) : null;
      const ulpin = url.searchParams.get('ulpin');
      const bldg = url.searchParams.get('bldg');

      if (!isNaN(lat) && !isNaN(lon)) {
        return { isCadastral: true, type: 'URL', lat, lon, floor, ulpin, bldg };
      }
    } catch (e) {
      console.error("URL parse error:", e);
    }
  }

  // 2. Check 3-Element / 2-Element Smart Token formats:
  // e.g., "28.613900, 77.209000, Floor 4", "28.613900, 77.209000, L4", "28.613900, 77.209000, 14m", "28.613900,77.209000@L4", "28.613900, 77.209000"
  const coordRegex = /(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)(?:[,\s@]+(?:L|Floor\s*)?(\d+(?:\.\d+)?)(?:m)?)?/i;
  const match = str.match(coordRegex);
  if (match) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    let floor = null;

    if (match[3] !== undefined) {
      const elem3 = parseFloat(match[3]);
      // If 3rd element is a height like 14m or elevation > 20, convert to floor level index
      if (str.toLowerCase().includes('m') && elem3 > 10) {
        floor = Math.round(elem3 / 3.5);
      } else {
        floor = Math.round(elem3);
      }
    }

    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      return { isCadastral: true, type: 'TOKEN', lat, lon, floor };
    }
  }

  // 3. Check ULPIN Identifier Code (e.g., ULPIN-IND-DEL-B286139772090-L04)
  if (str.toUpperCase().includes('ULPIN')) {
    const levelMatch = str.match(/-L(\d+)/i);
    const floor = levelMatch ? parseInt(levelMatch[1]) : null;
    
    // Try to extract embedded lat/lon numbers from ULPIN code if structured (e.g. B286139772090 -> 28.6139, 77.2090)
    const ulpinCoordsMatch = str.match(/B(\d{5})(\d{6})/i);
    if (ulpinCoordsMatch) {
      const lat = parseFloat(ulpinCoordsMatch[1]) / 1000.0;
      const lon = parseFloat(ulpinCoordsMatch[2]) / 10000.0;
      if (!isNaN(lat) && !isNaN(lon)) {
        return { isCadastral: true, type: 'ULPIN', lat, lon, floor, ulpin: str };
      }
    }

    return { isCadastral: true, type: 'ULPIN_SEARCH', query: str, floor };
  }

  return { isCadastral: false };
}
