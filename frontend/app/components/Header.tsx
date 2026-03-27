"use client";

import type { Region } from "@/app/lib/api";

interface HeaderProps {
  alertCount: number;
  vesselCount: number;
  isLive: boolean;
  positionsIngested?: number;
  regions: Record<string, Region>;
  activeRegion: string | null;
  onRegionChange: (region: string | null) => void;
}

export default function Header({
  alertCount, vesselCount, isLive, positionsIngested,
  regions, activeRegion, onRegionChange,
}: HeaderProps) {
  return (
    <header className="h-12 bg-[#111827] border-b border-slate-700/50 flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isLive ? "bg-emerald-500" : "bg-amber-500"} animate-pulse`} />
          <h1 className="text-sm font-semibold tracking-wide text-slate-100">
            HARBOR<span className="text-blue-400">OS</span>
          </h1>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-widest hidden md:inline">
          Maritime Awareness Platform
        </span>
      </div>

      <div className="flex items-center gap-3 text-xs text-slate-400">
        {/* Region selector */}
        <select
          value={activeRegion || "__all__"}
          onChange={(e) => onRegionChange(e.target.value === "__all__" ? null : e.target.value)}
          className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded px-2 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
        >
          <option value="__all__">All Regions</option>
          {Object.entries(regions).map(([key, r]) => (
            <option key={key} value={key}>{r.name}</option>
          ))}
        </select>

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">CONTACTS</span>
          <span className="font-mono text-slate-200">{vesselCount}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-slate-500">ALERTS</span>
          <span className={`font-mono ${alertCount > 0 ? "text-red-400" : "text-slate-200"}`}>
            {alertCount}
          </span>
        </div>
        {isLive && positionsIngested != null && (
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">INGESTED</span>
            <span className="font-mono text-slate-200">{positionsIngested.toLocaleString()}</span>
          </div>
        )}

        <div className="h-4 w-px bg-slate-700" />

        <div className="flex items-center gap-1.5">
          {isLive ? (
            <span className="font-mono text-emerald-400 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              LIVE
            </span>
          ) : (
            <span className="font-mono text-amber-400">SCENARIO</span>
          )}
        </div>
      </div>
    </header>
  );
}
