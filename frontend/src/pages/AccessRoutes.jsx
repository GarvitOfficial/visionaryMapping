import React, { useState, useEffect } from 'react';
import { Navigation, AlertTriangle, ShieldCheck, Footprints, ArrowRight, CornerDownRight } from 'lucide-react';
import axios from 'axios';

export default function AccessRoutes() {
  const [routes, setRoutes] = useState([]);
  const [selectedRoute, setSelectedRoute] = useState(null);

  useEffect(() => {
    const loadRoutes = async () => {
      try {
        const res = await axios.get('/api/access-routes');
        setRoutes(res.data);
        if (res.data.length > 0) setSelectedRoute(res.data[0]);
      } catch (err) {
        console.error("Access routes load error:", err);
      }
    };
    loadRoutes();
  }, []);

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full text-slate-100">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
          <Navigation className="w-5 h-5 text-sky-400" />
          Building Access & Emergency Routes
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Indoor & outdoor spatial navigation routes connecting parcel gates, building lobbies, vertical lifts, corridors, and emergency evacuation exits.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Route Selector List */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Registered Access Paths</h2>
          <div className="space-y-2">
            {routes.map((r) => {
              const isSelected = selectedRoute?.id === r.id;
              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedRoute(r)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-sky-500/10 border-sky-500/40 text-slate-100 shadow-lg'
                      : 'bg-[#151F33] border-[#1E2E4A] hover:bg-[#1E2E4A]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                      r.is_emergency ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                    }`}>
                      {r.route_type}
                    </span>
                    <span className="font-mono text-xs text-slate-400">{r.distance_m} m</span>
                  </div>
                  <h3 className="font-semibold text-xs mt-2 text-slate-100">{r.route_name}</h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                    <span>{r.start_point}</span>
                    <ArrowRight className="w-3 h-3 text-slate-500" />
                    <span>{r.end_point}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Route Path Details Visualizer */}
        <div className="lg:col-span-2 bg-[#151F33] border border-[#1E2E4A] rounded-xl p-6 space-y-6">
          {selectedRoute ? (
            <>
              <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-4">
                <div>
                  <span className="text-[10px] font-mono uppercase text-sky-400">Route Inspection</span>
                  <h2 className="text-base font-bold text-slate-100">{selectedRoute.route_name}</h2>
                </div>
                <div className="text-right font-mono">
                  <span className="text-2xl font-bold text-sky-400">{selectedRoute.distance_m}</span>
                  <span className="text-xs text-slate-400 ml-1">meters total distance</span>
                </div>
              </div>

              {/* Waypoint Steps */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-slate-300 font-mono uppercase">Sequential Navigation Waypoints</h3>
                <div className="space-y-3 relative before:absolute before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#1E2E4A]">
                  {selectedRoute.path_points?.map((pt, idx) => (
                    <div key={idx} className="flex items-start gap-4 relative z-10">
                      <div className="w-7 h-7 rounded-full bg-[#0D1527] border border-sky-500/50 flex items-center justify-center text-xs font-mono font-bold text-sky-400 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="bg-[#0D1527] p-3 rounded-lg border border-[#1E2E4A] flex-1 text-xs space-y-1">
                        <div className="flex justify-between font-mono text-[11px]">
                          <span className="text-slate-300 font-medium">Waypoint Node #{idx + 1}</span>
                          <span className="text-slate-400">Elev: {pt[2]}m</span>
                        </div>
                        <p className="font-mono text-[10px] text-slate-400">
                          Coordinates: [{pt[0].toFixed(4)}, {pt[1].toFixed(4)}]
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Select a route to view its step-by-step navigation path.</p>
          )}
        </div>
      </div>
    </div>
  );
}
