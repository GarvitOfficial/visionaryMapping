import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle, AlertTriangle, Info, RefreshCw, Filter, ShieldCheck } from 'lucide-react';
import axios from 'axios';

export default function ChecksReports() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState('');

  const runChecks = async () => {
    setLoading(true);
    try {
      const res = await axios.get('/api/topology/check');
      setReport(res.data);
    } catch (err) {
      console.error("Topology check error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runChecks();
  }, []);

  const issues = report?.issues || [];
  const filteredIssues = filterSeverity 
    ? issues.filter(i => i.severity === filterSeverity)
    : issues;

  return (
    <div className="p-8 space-y-6 overflow-y-auto h-full text-slate-100">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <span>Cadastral Topology Checks & Quality Reports</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Automated spatial validation suite for 2D footprint geometry, 3D vertical volume overlaps, orphan floor/space references, and duplicate ULPIN codes.
          </p>
        </div>

        <button 
          onClick={runChecks}
          className="px-5 py-2.5 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-sky-500/25 transition-all transform hover:-translate-y-0.5"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Run Full Topology Audit</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#131D31] p-5 rounded-2xl border border-[#1E2E4A] flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-slate-400">Total Checks Evaluated</span>
            <p className="text-3xl font-extrabold text-white mt-0.5">{report?.total_issues || 0}</p>
          </div>
          <div className="p-3 bg-sky-500/10 text-sky-400 rounded-xl border border-sky-500/20">
            <Info className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#131D31] p-5 rounded-2xl border border-[#1E2E4A] flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-rose-400">Errors Count</span>
            <p className="text-3xl font-extrabold text-rose-400 mt-0.5">{report?.errors_count || 0}</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#131D31] p-5 rounded-2xl border border-[#1E2E4A] flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-amber-400">Warnings Count</span>
            <p className="text-3xl font-extrabold text-amber-400 mt-0.5">{report?.warnings_count || 0}</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-[#131D31] p-5 rounded-2xl border border-[#1E2E4A] flex items-center justify-between shadow-lg">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase text-emerald-400">Spatial Health Score</span>
            <p className="text-xl font-extrabold text-emerald-400 font-mono mt-0.5">
              {report?.valid_status ? "100% VALID" : "ACTION REQUIRED"}
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Issues List Container */}
      <div className="bg-[#131D31] border border-[#1E2E4A] rounded-2xl overflow-hidden shadow-xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[#1E2E4A] pb-4">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Audit Findings & Quality Alerts</span>
          </h2>

          <div className="flex items-center gap-2 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value)}
              className="bg-[#070B14] border border-[#1E2E4A] rounded-xl px-3 py-1.5 text-slate-200 text-xs outline-none cursor-pointer"
            >
              <option value="">All Severities</option>
              <option value="ERROR">ERROR</option>
              <option value="WARNING">WARNING</option>
            </select>
          </div>
        </div>

        {filteredIssues.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400 space-y-3 bg-[#070B14] rounded-2xl border border-[#1E2E4A]">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto animate-pulse" />
            <p className="text-white text-sm font-bold">No Spatial Topology Violations Detected!</p>
            <p className="text-slate-400 max-w-md mx-auto leading-relaxed">
              All 2D boundary polygons, 3D vertical extents, orphan references, and ULPIN records satisfy legal cadastral quality standards.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredIssues.map((issue) => (
              <div 
                key={issue.id}
                className="p-4 bg-[#070B14] border border-[#1E2E4A] rounded-xl flex items-start justify-between gap-4 text-xs hover:border-sky-500/30 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      issue.severity === 'ERROR' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}>
                      {issue.severity}
                    </span>
                    <span className="font-mono text-slate-400 text-[11px] font-semibold">{issue.category}</span>
                    <span className="font-mono text-sky-400 text-[11px] font-semibold">● {issue.issue_type}</span>
                  </div>
                  <p className="text-slate-200 font-medium">{issue.description}</p>
                </div>

                <div className="text-right font-mono text-[10px] text-slate-400 shrink-0 bg-[#131D31] px-3 py-1.5 rounded-lg border border-[#1E2E4A]">
                  <span>Target: {issue.entity_type} #{issue.entity_id}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
