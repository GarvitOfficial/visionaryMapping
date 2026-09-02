import React from 'react';
import { 
  LayoutDashboard, 
  Map, 
  Box, 
  Layers, 
  Navigation, 
  Zap, 
  ShieldAlert, 
  Sun,
  Building2,
  Database,
  Sparkles,
  ChevronRight
} from 'lucide-react';

const navItems = [
  { id: 'dashboard', label: 'Dashboard Overview', icon: LayoutDashboard, badge: null },
  { id: 'map', label: 'Map View (2D/3D)', icon: Map, badge: 'OSM Live' },
  { id: 'viewer3d', label: '3D Building Viewer', icon: Box, badge: '3D Mesh' },
  { id: 'registry', label: 'ULPIN Registry', icon: Database, badge: 'Cadastre' },
  { id: 'routes', label: 'Access & Routes', icon: Navigation, badge: null },
  { id: 'utilities', label: 'Utilities & Infra', icon: Zap, badge: 'Sub-surface' },
  { id: 'topology', label: 'Checks & Quality', icon: ShieldAlert, badge: 'Audit' },
  { id: 'shadow', label: 'Sunlight & Shadow', icon: Sun, badge: 'Solar' },
];

export default function Sidebar({ activeTab, setActiveTab, systemStats }) {
  return (
    <aside className="w-64 bg-[#0B1120] border-r border-[#1E2E4A]/80 flex flex-col justify-between h-full shrink-0 select-none z-20 shadow-2xl">
      <div>
        {/* Brand Header */}
        <div className="h-16 px-5 flex items-center gap-3 border-b border-[#1E2E4A]/80 bg-[#070B14]/80 backdrop-blur">
          <div className="p-2 bg-gradient-to-tr from-sky-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-sky-500/20 border border-sky-400/30">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide flex items-center gap-1.5">
              3D ULPIN GIS
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            </h1>
            <p className="text-[10px] text-sky-400 font-mono tracking-wider">VERTICAL CADASTRE PLATFORM</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="p-3 space-y-1">
          <div className="px-3 py-1.5 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-500">
            Core GIS Modules
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-200 group relative ${
                    isActive
                      ? 'bg-gradient-to-r from-sky-600/20 via-sky-500/10 to-transparent text-sky-300 border border-sky-500/30 shadow-lg shadow-sky-500/5'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-[#131D31]'
                  }`}
                >
                  {/* Left Active Indicator Strip */}
                  {isActive && (
                    <span className="absolute left-0 top-2 bottom-2 w-1 bg-sky-400 rounded-r-full shadow-sm shadow-sky-400"></span>
                  )}
                  
                  <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    isActive ? 'text-sky-400' : 'text-slate-400 group-hover:text-slate-200'
                  }`} />
                  
                  <span className="truncate flex-1 text-left">{item.label}</span>
                  
                  {item.badge && !isActive && (
                    <span className="px-1.5 py-0.5 text-[9px] bg-[#15233D] text-slate-400 border border-[#1E2E4A] rounded-md font-mono">
                      {item.badge}
                    </span>
                  )}

                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Engine Status Box */}
      <div className="p-4 border-t border-[#1E2E4A]/80 bg-[#070B14]/60 text-[11px] text-slate-400 space-y-2.5">
        <div className="p-2.5 bg-[#131D31] border border-[#1E2E4A] rounded-xl space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400"></span>
              OSM Overpass API
            </span>
            <span className="font-mono text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              CONNECTED
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>Projection: EPSG:4326</span>
            <span className="text-sky-400">WGS84</span>
          </div>
        </div>

        <div className="text-[10px] text-slate-500 font-mono text-center">
          Enterprise 3D Cadastre • v1.0 Production
        </div>
      </div>
    </aside>
  );
}
