import React, { useState, useEffect } from 'react';
import { 
  Building, 
  Layers, 
  Box, 
  Key, 
  ShieldCheck, 
  X,
  Copy,
  Check,
  Info,
  ExternalLink,
  Tag,
  Share2
} from 'lucide-react';
import axios from 'axios';

export default function PropertyPanel({ selectedBuilding, onClose, onView3D }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'floors' | 'units'
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!selectedBuilding) return;
    const fetchDetails = async () => {
      setLoading(true);
      try {
        const bId = selectedBuilding.properties?.id || selectedBuilding.id;
        const res = await axios.get(`/api/buildings/${bId}`);
        setDetails(res.data);
      } catch (err) {
        console.error("Failed to load building details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchDetails();
  }, [selectedBuilding]);

  if (!selectedBuilding) return null;

  const props = selectedBuilding.properties || selectedBuilding;
  const buildingData = details?.building || props;
  const targetUlpin = buildingData.ulpin || props.ulpin || 'ULPIN-IND-DEL-B286139772090-PROTOTYPE';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(targetUlpin);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <aside className="w-84 bg-[#0B1120]/95 backdrop-blur border-l border-[#1E2E4A] flex flex-col h-full z-20 text-slate-200 shadow-2xl">
      {/* Panel Header */}
      <div className="p-4 border-b border-[#1E2E4A] flex items-center justify-between bg-[#070B14]/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/30">
            <Building className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white truncate max-w-[180px]">
              {buildingData.name || props.name || 'Building Cadastre'}
            </h3>
            <p className="text-[10px] text-sky-400 font-mono">SELECTED CADASTRAL PARCEL</p>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-[#131D31] rounded-xl transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-[#1E2E4A] text-xs bg-[#070B14]/40 font-medium">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === 'overview' ? 'border-sky-400 text-sky-400 bg-sky-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => setActiveTab('floors')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === 'floors' ? 'border-sky-400 text-sky-400 bg-sky-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Floors ({details?.floors?.length || props.levels || 0})
        </button>
        <button
          onClick={() => setActiveTab('units')}
          className={`flex-1 py-3 text-center border-b-2 transition-colors ${
            activeTab === 'units' ? 'border-sky-400 text-sky-400 bg-sky-500/5' : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Units ({details?.units?.length || 0})
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Primary ULPIN Card */}
        <div className="bg-gradient-to-br from-[#131D31] to-[#0F172A] border border-sky-500/30 rounded-2xl p-4 space-y-2 relative shadow-lg">
          <div className="flex items-center justify-between text-[10px] font-mono text-sky-400">
            <span className="flex items-center gap-1.5 font-bold tracking-wider">
              <Key className="w-3.5 h-3.5" />
              PRIMARY BUILDING ULPIN
            </span>
            <span className="px-2 py-0.5 bg-sky-500/20 text-sky-300 rounded-md font-sans text-[9px] font-semibold border border-sky-500/30">
              PROTOTYPE
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <p className="font-mono text-xs font-bold text-white break-all select-all">
              {targetUlpin}
            </p>
            <button
              onClick={copyToClipboard}
              className="p-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-lg border border-sky-500/30 transition-colors shrink-0"
              title="Copy ULPIN Code"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
          {copied && (
            <p className="text-[10px] font-mono text-emerald-400 animate-pulse">Copied to clipboard!</p>
          )}
        </div>

        {/* View in 3D & Share Buttons */}
        <div className="grid grid-cols-5 gap-2">
          <button
            onClick={() => onView3D(buildingData)}
            className="col-span-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Box className="w-4 h-4" />
            <span>Launch 3D Viewer</span>
          </button>
          <button
            onClick={() => onShareLocation && onShareLocation(buildingData)}
            className="col-span-1 py-3 bg-[#131D31] hover:bg-[#182642] border border-sky-500/40 text-sky-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center transition-all shadow-md"
            title="Share & Export 3D Location"
          >
            <Share2 className="w-4 h-4 text-sky-400" />
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="space-y-3 text-xs">
            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-[#131D31] p-3 rounded-xl border border-[#1E2E4A]">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Height Extrusion</span>
                <p className="text-base font-bold text-white mt-0.5">{buildingData.height || props.height || 10} m</p>
              </div>
              <div className="bg-[#131D31] p-3 rounded-xl border border-[#1E2E4A]">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Vertical Levels</span>
                <p className="text-base font-bold text-white mt-0.5">{buildingData.levels || props.levels || 3} Floors</p>
              </div>
              <div className="bg-[#131D31] p-3 rounded-xl border border-[#1E2E4A]">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Building Use</span>
                <p className="text-xs font-bold text-sky-300 capitalize mt-0.5">{buildingData.building_type || props.building_type || 'Residential'}</p>
              </div>
              <div className="bg-[#131D31] p-3 rounded-xl border border-[#1E2E4A]">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Data Source</span>
                <p className="text-xs font-bold text-emerald-400 capitalize mt-0.5">{buildingData.source || 'OpenStreetMap'}</p>
              </div>
            </div>

            {/* Address & Provenance */}
            <div className="bg-[#131D31] p-3.5 rounded-xl border border-[#1E2E4A] space-y-2.5">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Geospatial Address</span>
                <p className="text-slate-200 mt-0.5 font-medium">{buildingData.address || props.address || 'Sector Cadastral Parcel'}</p>
              </div>
              <div className="pt-2 border-t border-[#1E2E4A]">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">OSM Object Reference ID</span>
                <p className="font-mono text-slate-300 text-[11px] mt-0.5 select-all">{buildingData.source_id || props.source_id || props.id}</p>
              </div>
              <div className="pt-2 border-t border-[#1E2E4A] flex items-center justify-between">
                <span className="text-slate-400 text-[10px] uppercase font-mono tracking-wider">Provenential Status</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-mono font-semibold border border-emerald-500/20">
                  {buildingData.data_category || 'SOURCE_DATA'}
                </span>
              </div>
            </div>

            {/* Legal Cadastre Warning */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 flex gap-2.5">
              <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="leading-snug">OSM footprints provide reference geospatial boundary evidence. Legal ownership titles require registered cadastral survey validation.</p>
            </div>
          </div>
        )}

        {activeTab === 'floors' && (
          <div className="space-y-2 text-xs">
            {details?.floors?.map((flr) => (
              <div key={flr.id} className="p-3 bg-[#131D31] border border-[#1E2E4A] rounded-xl flex items-center justify-between hover:border-sky-500/40 transition-colors">
                <div>
                  <h4 className="font-bold text-white">{flr.floor_name}</h4>
                  <p className="text-[10px] font-mono text-slate-400 mt-0.5">Elevation: {flr.elevation}m | Height: {flr.height}m</p>
                </div>
                <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-md font-mono text-[10px] font-semibold">
                  {flr.status}
                </span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'units' && (
          <div className="space-y-2.5 text-xs">
            {details?.units?.map((u) => (
              <div key={u.id} className="p-3 bg-[#131D31] border border-[#1E2E4A] rounded-xl space-y-1.5 hover:border-sky-500/40 transition-colors">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white">Unit {u.unit_number}</h4>
                  <span className="text-[10px] font-mono text-sky-300 capitalize bg-sky-500/10 px-2 py-0.5 rounded-md font-semibold border border-sky-500/20">
                    {u.unit_type}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-slate-400 break-all bg-[#070B14] p-1.5 rounded-md border border-[#1E2E4A] select-all">
                  {u.ulpin}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-[#1E2E4A]/60">
                  <span>Area: {u.area_sqm} m² ({u.volume_cum} m³)</span>
                  <span className="text-slate-300 font-medium">{u.owner}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
