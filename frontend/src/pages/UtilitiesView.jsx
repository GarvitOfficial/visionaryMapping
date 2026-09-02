import React, { useState, useEffect } from 'react';
import { Zap, Droplet, Flame, Wifi, Activity, ShieldCheck, HardDrive } from 'lucide-react';
import axios from 'axios';

export default function UtilitiesView() {
  const [utilities, setUtilities] = useState([]);

  useEffect(() => {
    const loadUtilities = async () => {
      try {
        const res = await axios.get('/api/utilities');
        setUtilities(res.data);
      } catch (err) {
        console.error("Utilities fetch error:", err);
      }
    };
    loadUtilities();
  }, []);

  const getUtilIcon = (type) => {
    switch (type) {
      case 'WATER': return <Droplet className="w-5 h-5 text-sky-400" />;
      case 'ELECTRICITY': return <Zap className="w-5 h-5 text-amber-400" />;
      case 'GAS': return <Flame className="w-5 h-5 text-rose-400" />;
      case 'TELECOM': return <Wifi className="w-5 h-5 text-purple-400" />;
      default: return <Activity className="w-5 h-5 text-emerald-400" />;
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full text-slate-100">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-sky-400" />
          Underground & Vertical Utility Networks
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          3D spatial mapping foundation for subterranean and vertical building infrastructure (Water mains, Power grids, Fiber optical networks, Gas pipelines).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {utilities.map((u) => (
          <div key={u.id} className="bg-[#151F33] border border-[#1E2E4A] p-5 rounded-xl space-y-3 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-[#0D1527] rounded-lg border border-[#1E2E4A]">
                  {getUtilIcon(u.utility_type)}
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-100">{u.utility_type} NETWORK</h3>
                  <p className="text-[10px] font-mono text-slate-400">{u.owner}</p>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-[10px] font-mono rounded border border-emerald-500/20">
                {u.status}
              </span>
            </div>

            <div className="p-3 bg-[#0D1527] rounded-lg border border-[#1E2E4A] grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Elevation Depth</span>
                <p className="text-sky-300 font-semibold mt-0.5">{u.elevation_m} m</p>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase">Pipe Diameter</span>
                <p className="text-slate-200 font-semibold mt-0.5">{u.diameter_mm} mm</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
