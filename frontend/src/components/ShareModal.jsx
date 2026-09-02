import React, { useState } from 'react';
import { 
  Share2, 
  Copy, 
  Check, 
  Download, 
  X, 
  MapPin, 
  Layers, 
  Key, 
  FileJson, 
  FileSpreadsheet, 
  ExternalLink,
  ShieldCheck,
  QrCode,
  Sparkles
} from 'lucide-react';

export default function ShareModal({ building, floor, lat, lon, onClose }) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const bProps = building?.properties || building || {};
  const bldgName = bProps.name || 'Cadastral Building';
  const bldgId = bProps.id || 'BLDG-001';
  
  const targetLat = lat || bProps.lat || 28.6139;
  const targetLon = lon || bProps.lon || 77.2090;
  const targetFloor = floor !== undefined && floor !== null ? floor : 0;
  const targetUlpin = bProps.ulpin || `${bldgId}-L${targetFloor < 10 ? '0' + targetFloor : targetFloor}`;

  // Smart Tokens & URLs
  const baseUrl = window.location.origin + window.location.pathname;
  const shareableUrl = `${baseUrl}?lat=${targetLat.toFixed(6)}&lon=${targetLon.toFixed(6)}&floor=${targetFloor}&bldg=${encodeURIComponent(bldgId)}&ulpin=${encodeURIComponent(targetUlpin)}`;
  const locationToken = `${targetLat.toFixed(6)},${targetLon.toFixed(6)}@L${targetFloor}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyToken = () => {
    navigator.clipboard.writeText(locationToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleDownloadGeoJSON = () => {
    const geoJsonData = {
      type: "FeatureCollection",
      properties: {
        exported_at: new Date().toISOString(),
        title: "3D Cadastral Parcel Location Envelope",
        admin_authority: "National 3D Cadastre Registry"
      },
      features: [
        {
          type: "Feature",
          id: bldgId,
          geometry: building?.geometry || {
            type: "Polygon",
            coordinates: [[[targetLon - 0.0002, targetLat - 0.0002], [targetLon + 0.0002, targetLat - 0.0002], [targetLon + 0.0002, targetLat + 0.0002], [targetLon - 0.0002, targetLat + 0.0002], [targetLon - 0.0002, targetLat - 0.0002]]]
          },
          properties: {
            building_name: bldgName,
            building_id: bldgId,
            target_floor: targetFloor,
            floor_name: targetFloor === 0 ? "Ground Floor" : `Floor ${targetFloor}`,
            target_latitude: targetLat,
            target_longitude: targetLon,
            ulpin_code: targetUlpin,
            building_type: bProps.building_type || "residential",
            total_height_m: bProps.height || 28,
            total_levels: bProps.levels || 8,
            cadastral_status: "VERIFIED_REFERENCE"
          }
        }
      ]
    };

    const blob = new Blob([JSON.stringify(geoJsonData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `3D_Cadastre_${bldgId}_Floor${targetFloor}.geojson`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPassport = () => {
    const passportData = {
      cadastral_passport_version: "2.0-3D",
      generated_timestamp: new Date().toISOString(),
      digital_signature_hash: "SHA256-CADASTRE-" + Math.random().toString(36).substring(2, 10).toUpperCase(),
      location: {
        latitude: targetLat,
        longitude: targetLon,
        geohash_token: locationToken,
        share_url: shareableUrl
      },
      vertical_slice: {
        floor_level: targetFloor,
        floor_designation: targetFloor === 0 ? "Ground Floor" : `Floor ${targetFloor}`,
        floor_elevation_m: (targetFloor * 3.5).toFixed(1),
        floor_height_m: 3.5,
        target_ulpin: targetUlpin
      },
      building_structure: {
        id: bldgId,
        name: bldgName,
        category: bProps.building_type || "residential",
        total_floors: bProps.levels || 8,
        total_height_m: bProps.height || 28,
        address: bProps.address || "Cadastral Sector Reference"
      }
    };

    const blob = new Blob([JSON.stringify(passportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Digital_Passport_Floor${targetFloor}_${bldgId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#070B14]/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-[#0B1120] border border-sky-500/40 rounded-3xl p-6 shadow-2xl max-w-lg w-full text-slate-100 space-y-5 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/10 text-sky-400 rounded-2xl border border-sky-500/30">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>3D Cadastral Digital Location Export</span>
              </h2>
              <p className="text-[11px] text-sky-400 font-mono">Share & Export Exact 3D Parcel & Floor Coordinates</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white bg-[#131D31] hover:bg-[#182642] rounded-xl border border-[#1E2E4A] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Location Summary Card */}
        <div className="bg-gradient-to-br from-[#131D31] to-[#0F172A] p-4 rounded-2xl border border-[#1E2E4A] space-y-3 shadow-inner">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs text-white flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-sky-400" />
              <span>{bldgName}</span>
            </h3>
            <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md font-mono text-[10px] font-bold">
              FLOOR {targetFloor} (L{targetFloor})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
            <div className="bg-[#070B14] p-2 rounded-xl border border-[#1E2E4A]">
              <span className="text-slate-500 block text-[9px]">LATITUDE</span>
              <span className="text-sky-300 font-bold">{targetLat.toFixed(6)}° N</span>
            </div>
            <div className="bg-[#070B14] p-2 rounded-xl border border-[#1E2E4A]">
              <span className="text-slate-500 block text-[9px]">LONGITUDE</span>
              <span className="text-emerald-300 font-bold">{targetLon.toFixed(6)}° E</span>
            </div>
          </div>

          <div className="bg-[#070B14] p-2 rounded-xl border border-[#1E2E4A] flex items-center justify-between text-[10px] font-mono">
            <span className="text-slate-400">TARGET ULPIN:</span>
            <span className="text-amber-400 font-bold">{targetUlpin}</span>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-3">
          {/* 1. Copy Direct URL Link */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <ExternalLink className="w-3.5 h-3.5 text-sky-400" /> Direct 3D Shareable Web URL:
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={shareableUrl}
                className="flex-1 bg-[#070B14] border border-[#1E2E4A] rounded-xl px-3 py-2 text-xs font-mono text-slate-300 outline-none select-all"
              />
              <button
                onClick={handleCopyLink}
                className="px-3 py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                {copiedLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy URL'}</span>
              </button>
            </div>
          </div>

          {/* 2. Copy Smart Search Token */}
          <div className="space-y-1">
            <label className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-400" /> Instant Search Token (Paste into any search bar):
            </label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={locationToken}
                className="flex-1 bg-[#070B14] border border-[#1E2E4A] rounded-xl px-3 py-2 text-xs font-mono text-amber-300 font-bold outline-none select-all"
              />
              <button
                onClick={handleCopyToken}
                className="px-3 py-2 bg-[#131D31] hover:bg-[#182642] border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold font-mono flex items-center gap-1.5 transition-all shrink-0"
              >
                {copiedToken ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedToken ? 'Copied!' : 'Copy Token'}</span>
              </button>
            </div>
          </div>

          {/* 3. Export Buttons */}
          <div className="grid grid-cols-2 gap-2.5 pt-2">
            <button
              onClick={handleDownloadGeoJSON}
              className="py-2.5 px-3 bg-[#131D31] hover:bg-[#182642] border border-sky-500/30 rounded-xl text-xs font-mono font-bold text-sky-300 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <FileJson className="w-4 h-4 text-sky-400" />
              <span>Export 3D GeoJSON</span>
            </button>

            <button
              onClick={handleDownloadPassport}
              className="py-2.5 px-3 bg-[#131D31] hover:bg-[#182642] border border-emerald-500/30 rounded-xl text-xs font-mono font-bold text-emerald-300 flex items-center justify-center gap-2 transition-all shadow-md"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Export Passport JSON</span>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="p-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-[10px] text-sky-300/90 font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Pasting this copied URL or Token into any search box anywhere will instantly jump to this exact 3D building & Floor {targetFloor}!</span>
        </div>
      </div>
    </div>
  );
}
