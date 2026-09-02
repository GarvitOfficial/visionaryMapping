import React, { useState, useEffect } from 'react';
import { Search, MapPin, ShieldCheck, Clock, Globe, Compass, ChevronDown } from 'lucide-react';

import axios from 'axios';

const LOCATION_PRESETS = [
  { name: 'Delhi (Connaught Place)', lat: 28.6139, lon: 77.2090, tag: 'IN-DEL' },
  { name: 'Mumbai (BKC Sector)', lat: 19.0657, lon: 72.8687, tag: 'IN-MUM' },
  { name: 'Bengaluru (MG Road)', lat: 12.9756, lon: 77.6067, tag: 'IN-BLR' },
  { name: 'Tokyo (Shinjuku)', lat: 35.6895, lon: 139.6917, tag: 'JP-TYO' },
  { name: 'London (City Center)', lat: 51.5074, lon: -0.1278, tag: 'UK-LDN' },
  { name: 'New York (Manhattan)', lat: 40.7128, lon: -74.0060, tag: 'US-NYC' },
  { name: 'Paris (Center)', lat: 48.8566, lon: 2.3522, tag: 'FR-PAR' },
  { name: 'Dubai (Burj Area)', lat: 25.1972, lon: 55.2744, tag: 'AE-DXB' },
  { name: 'Singapore (Marina Bay)', lat: 1.2834, lon: 103.8580, tag: 'SG-SIN' },
  { name: 'Sydney (CBD)', lat: -33.8688, lon: 151.2093, tag: 'AU-SYD' },
  { name: 'Berlin (Mitte)', lat: 52.5200, lon: 13.4050, tag: 'DE-BER' },
  { name: 'San Francisco (Financial)', lat: 37.7749, lon: -122.4194, tag: 'US-SFO' },
  { name: 'Toronto (Downtown)', lat: 43.6532, lon: -79.3832, tag: 'CA-YYZ' }
];

import { parseCadastralQuery } from '../utils/cadastreSearch';

export default function Header({ activeTab, onSelectLocation, viewportBounds, onShareLocation }) {
  const [timeString, setTimeString] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setTimeString(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleGlobalSearch = async (e) => {
    if (e) e.preventDefault();
    if (!headerSearch.trim()) return;
    setIsSearching(true);
    try {
      // 1. Check if user pasted a Smart Cadastral Location Token, Share URL, or ULPIN
      const parsed = parseCadastralQuery(headerSearch);
      if (parsed && parsed.isCadastral) {
        if (parsed.lat && parsed.lon) {
          onSelectLocation(parsed.lat, parsed.lon, `Cadastral Target (${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°)`, parsed.floor);
          setHeaderSearch('');
          setIsSearching(false);
          return;
        } else if (parsed.query) {
          // ULPIN Code search query via backend
          const resU = await axios.get('/api/ulpins', { params: { search: parsed.query } });
          if (resU.data && resU.data.length > 0) {
            const item = resU.data[0];
            if (item.details?.lat && item.details?.lon) {
              onSelectLocation(item.details.lat, item.details.lon, item.details.name || item.ulpin, parsed.floor);
              setHeaderSearch('');
              setIsSearching(false);
              return;
            }
          }
        }
      }

      // 2. Standard Nominatim Geocoding Search
      const res = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: headerSearch, format: 'json', limit: 1 }
      });
      if (res.data && res.data.length > 0) {
        const place = res.data[0];
        onSelectLocation(parseFloat(place.lat), parseFloat(place.lon), place.display_name);
        setHeaderSearch('');
      }
    } catch (err) {
      console.error("Header geocoding error:", err);
    } finally {
      setIsSearching(false);
    }
  };

  const titles = {
    dashboard: 'Cadastral Dashboard & System Analytics',
    map: 'Interactive Spatial Map View — OSM Building Ingestion',
    viewer3d: '3D Building Extrusion & Vertical Space Delineation',
    registry: 'ULPIN (Unique Land Parcel Identification) Registry',
    routes: 'Building Access & Emergency Navigation Network',
    utilities: 'Underground & Vertical Utility Infrastructure',
    topology: 'Topology Validation & Spatial Quality Reports',
    shadow: 'Solar Sunlight Position & Shadow Analysis'
  };

  return (
    <header className="h-16 bg-[#070B14]/90 backdrop-blur border-b border-[#1E2E4A]/80 px-6 flex items-center justify-between text-slate-100 z-10 shadow-lg">
      {/* Active Module Title */}
      <div className="flex items-center gap-3">
        <div>
          <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            {titles[activeTab] || '3D Cadastral GIS'}
          </h2>
          <p className="text-[11px] text-sky-400/90 font-mono">Real-Time OpenStreetMap Overpass Spatial Engine</p>
        </div>
      </div>

      {/* Right Controls Bar */}
      <div className="flex items-center gap-3">
        {/* Global Instant Location Search Bar */}
        <form onSubmit={handleGlobalSearch} className="relative hidden lg:flex items-center bg-[#131D31] hover:bg-[#182642] px-3 py-1.5 rounded-xl border border-[#1E2E4A] transition-colors text-xs">
          <Search className="w-3.5 h-3.5 text-sky-400 mr-2 shrink-0" />
          <input 
            type="text"
            placeholder="Search any place worldwide..."
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            className="bg-transparent text-slate-200 placeholder-slate-400 outline-none w-44 font-medium"
          />
          {isSearching && <span className="text-[10px] text-sky-400 animate-pulse ml-1">Go...</span>}
        </form>

        {/* City Location Select Dropdown */}
        <div className="relative flex items-center bg-[#131D31] hover:bg-[#182642] px-3 py-1.5 rounded-xl border border-[#1E2E4A] transition-colors group cursor-pointer text-xs">
          <MapPin className="w-3.5 h-3.5 text-sky-400 mr-2 shrink-0" />
          <select 
            onChange={(e) => {
              const preset = LOCATION_PRESETS[e.target.value];
              if (preset) onSelectLocation(preset.lat, preset.lon, preset.name);
            }}
            className="bg-transparent text-slate-200 font-medium outline-none cursor-pointer pr-6 appearance-none"
          >
            {LOCATION_PRESETS.map((loc, idx) => (
              <option key={idx} value={idx} className="bg-[#0D1527] text-slate-200">
                📍 {loc.name}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2 pointer-events-none group-hover:text-sky-400 transition-colors" />
        </div>

        {/* Live BBOX Readout */}
        {viewportBounds && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-[#131D31] rounded-xl border border-[#1E2E4A] font-mono text-[11px] text-slate-300">
            <Compass className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-slate-500">BBOX:</span>
            <span className="text-sky-300 font-semibold">
              {viewportBounds.south.toFixed(3)}, {viewportBounds.west.toFixed(3)} → {viewportBounds.north.toFixed(3)}, {viewportBounds.east.toFixed(3)}
            </span>
          </div>
        )}

        {/* System Time Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-[#131D31] rounded-xl border border-[#1E2E4A] text-slate-300 font-mono text-[11px]">
          <Clock className="w-3.5 h-3.5 text-amber-400" />
          <span>{timeString || '12:00:00'} UTC</span>
        </div>

        {/* Reference Data Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-mono font-semibold shadow-sm shadow-emerald-500/10">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>REFERENCE CADASTRE</span>
        </div>
      </div>
    </header>
  );
}
