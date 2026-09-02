import React, { useState, useEffect } from 'react';
import { Sun, Compass, Calendar, Clock, MapPin, Play, RefreshCw, Zap } from 'lucide-react';
import axios from 'axios';

export default function ShadowAnalysis({ currentLocation }) {
  const [dateStr, setDateStr] = useState('2026-09-01');
  const [timeStr, setTimeStr] = useState('14:00');
  const [shadowResult, setShadowResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calculateShadow = async () => {
    setLoading(true);
    try {
      const res = await axios.post('/api/shadow/calculate', {
        latitude: currentLocation.lat,
        longitude: currentLocation.lon,
        date_str: dateStr,
        time_str: timeStr
      });
      setShadowResult(res.data);
    } catch (err) {
      console.error("Shadow calculation error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    calculateShadow();
  }, [dateStr, timeStr, currentLocation]);

  const solar = shadowResult?.solar || { solar_elevation_deg: 48.5, solar_azimuth_deg: 215.2, is_daylight: true };
  const sunIntensity = Math.max(0, Math.round(Math.sin((solar.solar_elevation_deg * Math.PI) / 180) * 100));

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full text-slate-100">
      <div>
        <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Sun className="w-5 h-5" />
          </div>
          <span>Solar Position & Building Shadow Analysis</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Geographic solar position algorithm calculating solar azimuth, elevation angles, and building shadow projection polygons for urban sunlight exposure.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls Sidebar */}
        <div className="bg-[#131D31] border border-[#1E2E4A] p-6 rounded-2xl space-y-5 shadow-xl">
          <h2 className="text-xs font-mono font-bold text-white uppercase tracking-wider">Simulation Inputs & Presets</h2>

          {/* Quick Date Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-mono text-slate-400 uppercase">Season Presets</span>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                onClick={() => setDateStr('2026-06-21')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all ${
                  dateStr === '2026-06-21' ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#070B14] text-slate-400 border border-[#1E2E4A] hover:text-white'
                }`}
              >
                Jun 21 Solstice
              </button>
              <button
                onClick={() => setDateStr('2026-12-21')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all ${
                  dateStr === '2026-12-21' ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#070B14] text-slate-400 border border-[#1E2E4A] hover:text-white'
                }`}
              >
                Dec 21 Solstice
              </button>
              <button
                onClick={() => setDateStr('2026-03-21')}
                className={`py-1.5 px-2 rounded-xl text-[10px] font-mono font-bold transition-all ${
                  dateStr === '2026-03-21' ? 'bg-amber-500 text-white shadow-sm' : 'bg-[#070B14] text-slate-400 border border-[#1E2E4A] hover:text-white'
                }`}
              >
                Mar 21 Equinox
              </button>
            </div>
          </div>

          {/* Date Picker */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 flex items-center gap-1.5 font-mono">
              <Calendar className="w-3.5 h-3.5 text-sky-400" />
              Custom Simulation Date
            </label>
            <input 
              type="date"
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full bg-[#070B14] border border-[#1E2E4A] rounded-xl px-3 py-2.5 text-xs text-slate-100 outline-none focus:border-sky-500 transition-colors"
            />
          </div>

          {/* Time Slider */}
          <div className="space-y-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                Time of Day
              </span>
              <span className="text-amber-400 font-bold text-xs">{timeStr}</span>
            </div>
            <input 
              type="range"
              min="6"
              max="19"
              step="0.5"
              value={parseFloat(timeStr.split(':')[0]) + parseFloat(timeStr.split(':')[1])/60}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                const hrs = Math.floor(val);
                const mins = val % 1 === 0.5 ? '30' : '00';
                setTimeStr(`${hrs.toString().padStart(2, '0')}:${mins}`);
              }}
              className="w-full h-1.5 bg-[#070B14] rounded-lg appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Computed Solar Telemetry Readout */}
          <div className="p-4 bg-[#070B14] border border-[#1E2E4A] rounded-2xl space-y-3 font-mono text-xs shadow-inner">
            <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-2">
              <span className="text-slate-400 text-[10px]">SOLAR STATUS:</span>
              <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                solar.is_daylight ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-indigo-500/20 text-indigo-400'
              }`}>
                {solar.is_daylight ? "DAYLIGHT" : "NIGHTTIME"}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Solar Elevation Angle:</span>
              <span className="text-sky-300 font-bold">{solar.solar_elevation_deg}°</span>
            </div>

            <div className="flex justify-between">
              <span className="text-slate-400">Solar Azimuth Bearing:</span>
              <span className="text-amber-300 font-bold">{solar.solar_azimuth_deg}°</span>
            </div>

            <div className="flex justify-between text-[11px] text-slate-400 pt-2 border-t border-[#1E2E4A]">
              <span>Sunlight Exposure:</span>
              <span className="text-emerald-400 font-bold">{sunIntensity}% Intensity</span>
            </div>
          </div>
        </div>

        {/* Solar Compass Vector Visualizer */}
        <div className="lg:col-span-2 bg-[#131D31] border border-[#1E2E4A] rounded-2xl p-6 flex flex-col justify-between relative overflow-hidden shadow-xl">
          <div className="flex items-center justify-between z-10 border-b border-[#1E2E4A] pb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>Solar Trajectory & Shadow Projection Vector</span>
            </h2>
            <span className="font-mono text-xs text-sky-400 font-bold">
              {shadowResult?.shadow_geojson?.features?.length || 0} Shadow Geometries
            </span>
          </div>

          {/* Compass Solar Graphic */}
          <div className="my-8 flex items-center justify-center relative">
            <div className="w-72 h-72 rounded-full border-2 border-dashed border-[#1E2E4A] flex items-center justify-center relative bg-[#070B14] shadow-2xl">
              <span className="absolute top-3 text-[10px] font-mono text-slate-400 font-bold">N (0°)</span>
              <span className="absolute bottom-3 text-[10px] font-mono text-slate-400 font-bold">S (180°)</span>
              <span className="absolute right-3 text-[10px] font-mono text-slate-400 font-bold">E (90°)</span>
              <span className="absolute left-3 text-[10px] font-mono text-slate-400 font-bold">W (270°)</span>

              <div 
                className="w-full h-full absolute transition-transform duration-500 flex items-center justify-center"
                style={{ transform: `rotate(${solar.solar_azimuth_deg - 90}deg)` }}
              >
                <div className="w-1/2 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-amber-300 relative">
                  <div className="w-6 h-6 bg-amber-400 rounded-full border-2 border-white shadow-lg shadow-amber-400/60 absolute right-0 -top-2.5 animate-pulse"></div>
                </div>
              </div>

              <div className="w-20 h-20 bg-sky-600/30 border border-sky-400 rounded-2xl flex items-center justify-center z-10 shadow-lg backdrop-blur">
                <span className="text-xs font-mono font-bold text-sky-200">BUILDING</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-[#070B14] border border-[#1E2E4A] rounded-xl text-xs text-slate-300 font-mono flex items-center justify-between shadow-inner">
            <span>Sun Direction Vector: Azimuth {solar.solar_azimuth_deg}°</span>
            <span className="text-amber-400 font-bold">Solar Altitude: {solar.solar_elevation_deg}°</span>
          </div>
        </div>
      </div>
    </div>
  );
}
