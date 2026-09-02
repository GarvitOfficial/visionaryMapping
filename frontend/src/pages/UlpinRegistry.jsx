import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Search, 
  Filter, 
  ChevronRight, 
  ChevronDown, 
  Building2, 
  Layers, 
  Box, 
  Key, 
  ShieldCheck, 
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import axios from 'axios';

export default function UlpinRegistry({ onViewBuilding }) {
  const [ulpins, setUlpins] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [hierarchyTree, setHierarchyTree] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  const fetchUlpins = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/ulpins', {
        params: { search: searchTerm, entity_type: filterType }
      });
      setUlpins(res.data);
      if (res.data.length > 0 && !selectedRecord) {
        setSelectedRecord(res.data[0]);
      }
    } catch (err) {
      console.error("ULPIN fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUlpins();
  }, [searchTerm, filterType]);

  useEffect(() => {
    if (!selectedRecord) return;
    const fetchTree = async () => {
      try {
        const res = await axios.get(`/api/ulpins/hierarchy/${selectedRecord.ulpin}`);
        setHierarchyTree(res.data);
      } catch (err) {
        console.error("Hierarchy fetch error:", err);
      }
    };
    fetchTree();
  }, [selectedRecord]);

  const copyUlpin = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
              <Database className="w-5 h-5" />
            </div>
            <span>Vertical Cadastral ULPIN Registry</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Search and inspect registered Unique Land Parcel Identification Numbers across parcels, buildings, floors, and spaces.
          </p>
        </div>

        <button 
          onClick={fetchUlpins}
          className="px-4 py-2.5 bg-[#131D31] hover:bg-[#182642] border border-[#1E2E4A] rounded-xl text-xs font-semibold flex items-center gap-2 text-slate-200 transition-colors shadow-lg"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Registry</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <input
            type="text"
            placeholder="Search by ULPIN code or Entity ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#131D31] border border-[#1E2E4A] rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-all shadow-lg"
          />
        </div>

        <div className="relative">
          <Filter className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full bg-[#131D31] border border-[#1E2E4A] rounded-2xl pl-11 pr-4 py-3 text-xs text-slate-100 outline-none cursor-pointer appearance-none shadow-lg"
          >
            <option value="">All Entity Types</option>
            <option value="BUILDING">Building ULPINs</option>
            <option value="FLOOR">Floor ULPINs</option>
            <option value="SPACE_UNIT">Space/Unit ULPINs</option>
          </select>
        </div>
      </div>

      {/* Registry Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table View */}
        <div className="lg:col-span-2 bg-[#131D31] border border-[#1E2E4A] rounded-2xl overflow-hidden shadow-xl flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#070B14] border-b border-[#1E2E4A] text-slate-400 font-mono uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Entity Type</th>
                  <th className="py-3.5 px-4">ULPIN Code</th>
                  <th className="py-3.5 px-4">Entity ID</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E2E4A]">
                {ulpins.map((rec) => {
                  const isSelected = selectedRecord?.ulpin === rec.ulpin;
                  return (
                    <tr 
                      key={rec.ulpin}
                      onClick={() => setSelectedRecord(rec)}
                      className={`cursor-pointer transition-all ${
                        isSelected ? 'bg-sky-500/10 border-l-4 border-l-sky-400' : 'hover:bg-[#182642]/50'
                      }`}
                    >
                      <td className="py-3.5 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                          rec.entity_type === 'BUILDING' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                          rec.entity_type === 'FLOOR' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        }`}>
                          {rec.entity_type}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-100 select-all">
                        {rec.ulpin}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                        {rec.entity_id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[10px] font-mono font-semibold border border-emerald-500/20">
                          {rec.state}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={(e) => { e.stopPropagation(); copyUlpin(rec.ulpin); }}
                          className="p-1.5 bg-[#070B14] hover:bg-[#1E2E4A] text-slate-300 rounded-lg border border-[#1E2E4A] transition-colors inline-flex"
                          title="Copy ULPIN"
                        >
                          {copiedCode === rec.ulpin ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Selected Record Inspector & Hierarchy Tree */}
        <div className="bg-[#131D31] border border-[#1E2E4A] rounded-2xl p-5 space-y-4 shadow-xl">
          {selectedRecord ? (
            <>
              <div className="space-y-1 border-b border-[#1E2E4A] pb-3">
                <span className="text-[10px] font-mono font-bold uppercase text-sky-400">Selected ULPIN Inspection</span>
                <h3 className="font-mono text-xs font-bold text-white break-all select-all">
                  {selectedRecord.ulpin}
                </h3>
              </div>

              <div className="p-3.5 bg-[#070B14] border border-[#1E2E4A] rounded-xl space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono text-[10px]">ADMIN CODE:</span>
                  <span className="text-white font-bold">{selectedRecord.admin_code}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono text-[10px]">PARENT ULPIN:</span>
                  <span className="text-sky-300 font-mono text-[11px] truncate max-w-[140px]">
                    {selectedRecord.parent_ulpin || 'NONE (ROOT)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-mono text-[10px]">CATEGORY:</span>
                  <span className="text-emerald-400 font-mono text-[11px] font-bold">{selectedRecord.data_category}</span>
                </div>
              </div>

              {/* Hierarchy Tree */}
              <div className="space-y-2 pt-2 border-t border-[#1E2E4A]">
                <h4 className="font-bold text-xs text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-sky-400" />
                  <span>Cadastral Hierarchy Tree</span>
                </h4>

                {hierarchyTree && (
                  <div className="p-3.5 bg-[#070B14] border border-[#1E2E4A] rounded-xl text-xs space-y-2 font-mono">
                    <div className="flex items-center gap-2 text-sky-400 font-bold">
                      <Building2 className="w-4 h-4" />
                      <span>{hierarchyTree.label}</span>
                    </div>

                    <div className="pl-4 space-y-2 border-l border-[#1E2E4A]">
                      {hierarchyTree.children?.map((flrNode, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center gap-2 text-purple-300 font-semibold">
                            <Layers className="w-3.5 h-3.5" />
                            <span>{flrNode.label}</span>
                          </div>
                          <div className="pl-4 space-y-1 border-l border-[#1E2E4A]">
                            {flrNode.children?.map((unitNode, uIdx) => (
                              <div key={uIdx} className="text-emerald-400 text-[11px] flex items-center gap-1.5">
                                <Box className="w-3 h-3" />
                                <span>{unitNode.label}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-xs text-slate-400">Select a record from the registry to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}
