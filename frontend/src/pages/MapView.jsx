import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';
import { Layers, Loader2, AlertCircle, Eye, Box, Filter, Building2, Compass, MapPin, Search, Navigation } from 'lucide-react';
import { parseCadastralQuery } from '../utils/cadastreSearch';

function MapController({ currentLocation, searchTarget, onBoundsChange }) {
  const map = useMap();

  const emitBounds = useCallback(() => {
    const bounds = map.getBounds();
    onBoundsChange({
      south: bounds.getSouth(),
      west: bounds.getWest(),
      north: bounds.getNorth(),
      east: bounds.getEast()
    });
  }, [map, onBoundsChange]);

  useEffect(() => {
    if (searchTarget) {
      map.flyTo([searchTarget.lat, searchTarget.lon], 16, { animate: true, duration: 1.2 });
      setTimeout(emitBounds, 1300);
    } else if (currentLocation) {
      map.flyTo([currentLocation.lat, currentLocation.lon], 16, { animate: true, duration: 1.2 });
      setTimeout(emitBounds, 1300);
    }
  }, [currentLocation, searchTarget, map, emitBounds]);

  useMapEvents({
    moveend: () => {
      emitBounds();
    },
    zoomend: () => {
      emitBounds();
    }
  });

  return null;
}

export default function MapView({ currentLocation, onSelectBuilding, selectedBuilding, onView3D }) {
  const [geoJsonData, setGeoJsonData] = useState({ type: "FeatureCollection", features: [] });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [buildingFilter, setBuildingFilter] = useState('ALL');
  const [basemapStyle, setBasemapStyle] = useState('VOYAGER'); // Default CARTO Voyager theme
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchTarget, setSearchTarget] = useState(null);
  const [currentBounds, setCurrentBounds] = useState(null);

  // Persistent Feature Accumulator & Abort Controller for background prefetching
  const featureStoreRef = useRef(new Map());
  const abortControllerRef = useRef(null);
  const debounceTimer = useRef(null);

  const BASEMAP_URLS = {
    VOYAGER: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_2qg6_1_95ecb19ace810fd38c22c3db',
    DARK: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png?key=cb1_2qg6_1_95ecb19ace810fd38c22c3db',
    LIGHT: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png?key=cb1_2qg6_1_95ecb19ace810fd38c22c3db'
  };

  const fetchBuildings = useCallback((rawBounds) => {
    setCurrentBounds(rawBounds);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    const south = Math.min(rawBounds.south, rawBounds.north);
    const north = Math.max(rawBounds.south, rawBounds.north);
    const west = Math.min(rawBounds.west, rawBounds.east);
    const east = Math.max(rawBounds.west, rawBounds.east);

    // Cancel previous inflight network request on fast zooming
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    debounceTimer.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setLoading(true);
      setErrorMsg(null);

      try {
        const res = await axios.get('/api/buildings', {
          params: { south, west, north, east },
          signal: controller.signal
        });

        if (res.data && res.data.features && Array.isArray(res.data.features)) {
          res.data.features.forEach(feat => {
            const fid = feat.id || feat.properties?.id;
            if (fid) {
              featureStoreRef.current.set(fid, feat);
            }
          });

          setGeoJsonData({
            type: "FeatureCollection",
            features: Array.from(featureStoreRef.current.values())
          });
        }
      } catch (err) {
        const isCanceled = axios.isCancel(err) || err?.name === 'CanceledError' || err?.code === 'ERR_CANCELED' || err?.message === 'canceled';
        if (!isCanceled) {
          console.error("Realtime OSM building fetch error:", err);
          setErrorMsg("Syncing live OpenStreetMap buildings...");
          setTimeout(() => setErrorMsg(null), 3000);
        }
      } finally {
        setLoading(false);
      }
    }, 250);
  }, []);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg(null);
    try {
      // 1. Check if user pasted Smart Cadastral Location Token, Share URL, or ULPIN Code
      const parsed = parseCadastralQuery(searchQuery);
      if (parsed && parsed.isCadastral) {
        if (parsed.lat && parsed.lon) {
          setSearchTarget({ 
            lat: parsed.lat, 
            lon: parsed.lon, 
            name: `Target Location (${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°)` 
          });
          if (parsed.floor !== null && parsed.floor !== undefined) {
            setTimeout(() => {
              if (onView3D) onView3D(null, parsed.floor);
            }, 1200);
          }
          setIsSearching(false);
          return;
        } else if (parsed.query) {
          const resU = await axios.get('/api/ulpins', { params: { search: parsed.query } });
          if (resU.data && resU.data.length > 0) {
            const item = resU.data[0];
            if (item.details?.lat && item.details?.lon) {
              setSearchTarget({ lat: item.details.lat, lon: item.details.lon, name: item.details.name || item.ulpin });
              setIsSearching(false);
              return;
            }
          }
        }
      }

      // 2. Standard Nominatim Geocoding Search
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: searchQuery, format: 'json', limit: 1 }
      });
      if (res.data && res.data.length > 0) {
        const place = res.data[0];
        const lat = parseFloat(place.lat);
        const lon = parseFloat(place.lon);
        setSearchTarget({ lat, lon, name: place.display_name });
      } else {
        setErrorMsg(`No locations found matching "${searchQuery}".`);
      }
    } catch (err) {
      console.error("Nominatim search error:", err);
      setErrorMsg("Failed to geocode location.");
    } finally {
      setIsSearching(false);
    }
  };

  const handleQuickLoc = (lat, lon, queryName) => {
    setSearchQuery(queryName);
    setSearchTarget({ lat, lon, name: queryName });
  };

  const getFeatureStyle = (feature) => {
    const isSelected = selectedBuilding && (
      (selectedBuilding.properties?.id && selectedBuilding.properties.id === feature.properties.id) ||
      (selectedBuilding.id === feature.id)
    );

    const levels = feature.properties?.levels || 4;
    const bType = (feature.properties?.building_type || '').toLowerCase();
    
    let fillColor = '#3B82F6';
    if (bType === 'monument' || feature.properties?.roof_shape === 'dome') fillColor = '#F59E0B';
    else if (bType === 'tower' || levels >= 10) fillColor = '#A855F7';
    else if (bType === 'civic' || bType === 'public') fillColor = '#10B981';
    else if (bType === 'commercial' || bType === 'office') fillColor = '#0EA5E9';

    if (isSelected) {
      return {
        fillColor: '#F59E0B',
        fillOpacity: 0.9,
        color: '#FBBF24',
        weight: 4
      };
    }

    return {
      fillColor: fillColor,
      fillOpacity: basemapStyle === 'DARK' ? 0.65 : 0.55,
      color: basemapStyle === 'LIGHT' ? '#0F172A' : '#1E2E4A',
      weight: 1.5
    };
  };

  const onEachFeature = (feature, layer) => {
    layer.on({
      click: () => {
        onSelectBuilding(feature);
      },
      mouseover: (e) => {
        const l = e.target;
        if (!selectedBuilding || selectedBuilding.id !== feature.id) {
          l.setStyle({ fillOpacity: 0.85, weight: 2.5, color: '#38BDF8' });
        }
      },
      mouseout: (e) => {
        const l = e.target;
        if (!selectedBuilding || selectedBuilding.id !== feature.id) {
          l.setStyle(getFeatureStyle(feature));
        }
      }
    });

    const name = feature.properties?.name || `Building #${feature.id}`;
    const levels = feature.properties?.levels || 4;
    const height = feature.properties?.height || 14;
    const bType = feature.properties?.building_type || 'residential';

    layer.bindTooltip(`
      <div class="font-sans text-xs p-1 space-y-1">
        <div class="font-bold text-sky-300 flex items-center gap-1">
          <span>🏛️ ${name}</span>
        </div>
        <div class="text-[11px] text-slate-300 font-mono">
          <span>Levels: ${levels} Floors</span> • <span>Height: ${height}m</span>
        </div>
        <div class="text-[10px] text-slate-400 capitalize font-mono">
          Category: <strong class="text-amber-400">${bType}</strong> • Click to view in 3D
        </div>
      </div>
    `, { sticky: true });
  };

  const filteredGeoJson = {
    ...geoJsonData,
    features: (geoJsonData.features || []).filter(f => {
      // Building Type Category Filter
      const bType = (f.properties?.building_type || '').toLowerCase();
      const levels = f.properties?.levels || 4;
      if (buildingFilter === 'MONUMENTS') return bType === 'monument' || f.properties?.roof_shape === 'dome' || f.properties?.roof_shape === 'pyramid';
      if (buildingFilter === 'TOWERS') return bType === 'tower' || levels >= 8 || bType === 'commercial' || bType === 'office';
      if (buildingFilter === 'CIVIC') return bType === 'civic' || bType === 'public';
      if (buildingFilter === 'RESIDENTIAL') return bType === 'apartments' || bType === 'residential';
      return true;
    })
  };

  // Initial mount trigger to guarantee building detection & rendering immediately
  useEffect(() => {
    if (currentLocation) {
      const delta = 0.006;
      fetchBuildings({
        south: currentLocation.lat - delta,
        north: currentLocation.lat + delta,
        west: currentLocation.lon - delta,
        east: currentLocation.lon + delta
      });
    }
  }, [currentLocation, fetchBuildings]);

  return (
    <div className="relative w-full h-full bg-[#070B14] flex flex-col overflow-hidden">
      {/* Top Controls Floating Bar — z-[2000] prevents clipping */}
      <div className="absolute top-4 left-4 right-4 z-[2000] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pointer-events-none">
        
        {/* Left Side: Location Search Box & Background Sync Status */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0B1120]/95 backdrop-blur-md border border-[#1E2E4A] p-2 rounded-2xl shadow-2xl pointer-events-auto max-w-full">
          {/* Status Badge */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-[#131D31] rounded-xl border border-[#1E2E4A] shrink-0">
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 text-sky-400 animate-spin" />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
            )}
            <span className="font-bold text-xs text-white font-mono">
              {loading ? "Syncing Buildings..." : `${filteredGeoJson.features.length} Buildings Mapped`}
            </span>
          </div>

          {/* Search Input Box */}
          <form onSubmit={handleSearch} className="flex items-center gap-1.5 bg-[#131D31] border border-[#1E2E4A] rounded-xl px-3 py-1.5 focus-within:border-sky-500 transition-colors">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              placeholder="Search place e.g. Red Fort, Connaught Place, Mumbai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-xs text-slate-100 placeholder-slate-500 outline-none w-48 md:w-64"
            />
            <button
              type="submit"
              disabled={isSearching}
              className="p-1 bg-sky-500 hover:bg-sky-400 text-white rounded-lg transition-colors text-[10px] font-bold shrink-0"
            >
              {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />}
            </button>
          </form>

          {/* Quick Landmarks Shortcuts */}
          <div className="hidden lg:flex items-center gap-1 text-[10px] font-mono border-l border-[#1E2E4A] pl-2">
            <span className="text-slate-400 font-bold">Presets:</span>
            <button onClick={() => handleQuickLoc(28.6139, 77.2090, "Connaught Place Delhi")} className="px-2 py-0.5 bg-[#182642] hover:bg-sky-500/20 text-sky-300 rounded-md border border-[#1E2E4A]">Delhi</button>
            <button onClick={() => handleQuickLoc(28.6562, 77.2410, "Red Fort Delhi")} className="px-2 py-0.5 bg-[#182642] hover:bg-amber-500/20 text-amber-300 rounded-md border border-[#1E2E4A]">Red Fort</button>
            <button onClick={() => handleQuickLoc(18.9220, 72.8347, "Gateway of India Mumbai")} className="px-2 py-0.5 bg-[#182642] hover:bg-emerald-500/20 text-emerald-300 rounded-md border border-[#1E2E4A]">Mumbai</button>
          </div>
        </div>

        {/* Right Side: Building Category Filters & Theme Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-[#0B1120]/95 backdrop-blur-md border border-[#1E2E4A] p-2 rounded-2xl shadow-2xl pointer-events-auto overflow-x-auto max-w-full">
          {/* Building Category Filter Pills */}
          <div className="flex items-center gap-1 bg-[#131D31] p-1 rounded-xl border border-[#1E2E4A]">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'MONUMENTS', label: '🏛️ Monuments' },
              { id: 'TOWERS', label: '🏢 Towers' },
              { id: 'CIVIC', label: '🏛 Civic' },
              { id: 'RESIDENTIAL', label: '🏠 Housing' }
            ].map((filter) => (
              <button
                key={filter.id}
                onClick={() => setBuildingFilter(filter.id)}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all whitespace-nowrap ${
                  buildingFilter === filter.id
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* CARTO Basemap Switcher */}
          <div className="flex items-center gap-1 bg-[#131D31] p-1 rounded-xl border border-[#1E2E4A]">
            <span className="text-[10px] font-mono text-slate-400 px-1 font-bold shrink-0">THEME:</span>
            {[
              { id: 'DARK', label: 'Dark GIS' },
              { id: 'VOYAGER', label: 'Voyager' },
              { id: 'LIGHT', label: 'Light' }
            ].map((style) => (
              <button
                key={style.id}
                onClick={() => setBasemapStyle(style.id)}
                className={`px-2 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                  basemapStyle === style.id
                    ? 'bg-emerald-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="absolute top-20 right-4 z-[2500] bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-2xl backdrop-blur-md">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span className="font-semibold">{errorMsg}</span>
        </div>
      )}

      {/* Main Leaflet Map */}
      <MapContainer
        center={[currentLocation.lat, currentLocation.lon]}
        zoom={16}
        scrollWheelZoom={true}
        className="w-full h-full flex-1 z-0"
        style={{ width: '100%', height: '100%', minHeight: '100%' }}
      >
        <TileLayer
          key={basemapStyle}
          attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url={BASEMAP_URLS[basemapStyle]}
        />

        <MapController currentLocation={currentLocation} searchTarget={searchTarget} onBoundsChange={fetchBuildings} />

        {filteredGeoJson.features.length > 0 && (
          <GeoJSON
            key={`geojson-${filteredGeoJson.features.length}-${buildingFilter}-${basemapStyle}-${selectedBuilding?.id || ''}`}
            data={filteredGeoJson}
            style={getFeatureStyle}
            onEachFeature={onEachFeature}
          />
        )}
      </MapContainer>
    </div>
  );
}
