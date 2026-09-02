import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import PropertyPanel from './components/PropertyPanel';
import ShareModal from './components/ShareModal';

import Dashboard from './pages/Dashboard';
import MapView from './pages/MapView';
import Viewer3D from './pages/Viewer3D';
import UlpinRegistry from './pages/UlpinRegistry';
import AccessRoutes from './pages/AccessRoutes';
import UtilitiesView from './pages/UtilitiesView';
import ChecksReports from './pages/ChecksReports';
import ShadowAnalysis from './pages/ShadowAnalysis';
import { parseCadastralQuery } from './utils/cadastreSearch';
import axios from 'axios';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [currentLocation, setCurrentLocation] = useState({
    name: 'Delhi (Connaught Place)',
    lat: 28.6139,
    lon: 77.2090
  });
  const [selectedBuilding, setSelectedBuilding] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState(null);
  const [viewportBounds, setViewportBounds] = useState(null);
  const [shareModalConfig, setShareModalConfig] = useState(null); // { building, floor, lat, lon }
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Check URL parameters on initial load (e.g. ?lat=28.6139&lon=77.2090&floor=4)
  useEffect(() => {
    const search = window.location.search;
    if (search) {
      const parsed = parseCadastralQuery(search);
      if (parsed && parsed.isCadastral) {
        if (parsed.lat && parsed.lon) {
          setCurrentLocation({
            lat: parsed.lat,
            lon: parsed.lon,
            name: `Coordinates (${parsed.lat.toFixed(4)}°, ${parsed.lon.toFixed(4)}°)`
          });
        }
        if (parsed.floor !== null && parsed.floor !== undefined) {
          setSelectedFloor(parsed.floor);
          setActiveTab('viewer3d');
        } else {
          setActiveTab('map');
        }
        showToast(`📍 Loaded Shared 3D Cadastral Location (Floor ${parsed.floor ?? 'All'})`);
      }
    }
  }, []);

  const handleSelectLocation = async (lat, lon, name, targetFloor = null) => {
    setCurrentLocation({ lat, lon, name: name || `${lat.toFixed(4)}, ${lon.toFixed(4)}` });

    // Fetch and select building at target coordinates
    try {
      const res = await axios.get('/api/buildings', {
        params: { south: lat - 0.004, west: lon - 0.004, north: lat + 0.004, east: lon + 0.004 }
      });
      if (res.data?.features?.length > 0) {
        setSelectedBuilding(res.data.features[0]);
      }
    } catch (err) {
      console.error("Auto building fetch error:", err);
    }

    if (targetFloor !== null && targetFloor !== undefined) {
      setSelectedFloor(targetFloor);
      setActiveTab('viewer3d');
      showToast(`🎯 Redirected to 3D Viewer for Floor ${targetFloor} (${lat.toFixed(6)}° N, ${lon.toFixed(6)}° E)`);
    } else {
      setActiveTab('map');
    }
  };

  const handleView3D = (bldg, floor = null) => {
    if (bldg) setSelectedBuilding(bldg);
    if (floor !== null && floor !== undefined) setSelectedFloor(floor);
    setActiveTab('viewer3d');
  };

  const handleShareLocation = (bldg, floor = null) => {
    const targetBldg = bldg || selectedBuilding;
    const bProps = targetBldg?.properties || targetBldg || {};
    const lat = currentLocation.lat || bProps.lat || 28.6139;
    const lon = currentLocation.lon || bProps.lon || 77.2090;
    const flr = floor !== null && floor !== undefined ? floor : (selectedFloor !== null ? selectedFloor : 0);

    setShareModalConfig({
      building: targetBldg,
      floor: flr,
      lat,
      lon
    });
  };

  return (
    <div className="flex h-full w-full bg-[#0A0F1D] text-slate-100 overflow-hidden relative">
      {/* Left Navigation Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        systemStats={{ topologyIssues: 2 }}
      />

      {/* Main Right Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden min-w-0">
        {/* Top Header Bar */}
        <Header 
          activeTab={activeTab}
          onSelectLocation={handleSelectLocation}
          viewportBounds={viewportBounds}
          onShareLocation={handleShareLocation}
        />

        {/* View Content & Optional Property Panel */}
        <div className="flex-1 flex overflow-hidden relative">
          <main className="flex-1 overflow-hidden relative bg-[#0A0F1D]">
            {activeTab === 'dashboard' && (
              <Dashboard 
                setActiveTab={setActiveTab}
                onSelectBuilding={(b) => setSelectedBuilding(b)}
              />
            )}
            {activeTab === 'map' && (
              <MapView 
                currentLocation={currentLocation}
                onSelectBuilding={(b) => setSelectedBuilding(b)}
                selectedBuilding={selectedBuilding}
                onView3D={handleView3D}
              />
            )}
            {activeTab === 'viewer3d' && (
              <Viewer3D 
                selectedBuilding={selectedBuilding}
                initialFloor={selectedFloor}
                onShareLocation={handleShareLocation}
              />
            )}
            {activeTab === 'registry' && (
              <UlpinRegistry 
                onViewBuilding={(b) => setSelectedBuilding(b)}
              />
            )}
            {activeTab === 'routes' && (
              <AccessRoutes />
            )}
            {activeTab === 'utilities' && (
              <UtilitiesView />
            )}
            {activeTab === 'topology' && (
              <ChecksReports />
            )}
            {activeTab === 'shadow' && (
              <ShadowAnalysis currentLocation={currentLocation} />
            )}
          </main>

          {/* Right Side Property Details Panel */}
          {selectedBuilding && (activeTab === 'map' || activeTab === 'viewer3d') && (
            <PropertyPanel 
              selectedBuilding={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
              onView3D={handleView3D}
              onShareLocation={handleShareLocation}
            />
          )}
        </div>
      </div>

      {/* Share Location Modal */}
      {shareModalConfig && (
        <ShareModal 
          building={shareModalConfig.building}
          floor={shareModalConfig.floor}
          lat={shareModalConfig.lat}
          lon={shareModalConfig.lon}
          onClose={() => setShareModalConfig(null)}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0B1120] border border-sky-500/50 px-4 py-3 rounded-2xl shadow-2xl text-xs font-mono text-sky-300 flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
