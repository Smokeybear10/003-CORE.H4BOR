"use client";

import { useState } from "react";
import type { VesselDetail as VesselDetailType, VerificationRequest } from "@/app/lib/api";
import { api } from "@/app/lib/api";

interface VesselDetailProps {
  vessel: VesselDetailType;
  alertId: string | null;
  onClose: () => void;
}

function actionColor(action: string): string {
  switch (action) {
    case "escalate": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "verify": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "monitor": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    default: return "bg-green-500/20 text-green-400 border-green-500/30";
  }
}

function severityBar(severity: number): string {
  if (severity >= 0.7) return "bg-red-500";
  if (severity >= 0.4) return "bg-orange-500";
  return "bg-yellow-500";
}

export default function VesselDetailPanel({ vessel, alertId, onClose }: VesselDetailProps) {
  const [verification, setVerification] = useState<VerificationRequest | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const handleVerify = async () => {
    if (!alertId) return;
    setVerifyLoading(true);
    try {
      const vr = await api.createVerificationRequest(alertId, vessel.id, "camera");
      setVerification(vr);
    } catch (e) {
      console.error("Verification request failed:", e);
    } finally {
      setVerifyLoading(false);
    }
  };

  const riskScore = vessel.risk_score ?? 0;
  const action = vessel.recommended_action ?? "ignore";

  return (
    <div className="w-96 bg-[#111827] border-l border-slate-700/50 flex flex-col shrink-0 overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-100">{vessel.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              MMSI {vessel.mmsi} {vessel.imo ? `/ IMO ${vessel.imo}` : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-slate-300 text-lg leading-none"
          >
            &times;
          </button>
        </div>
      </div>

      {/* Risk Score */}
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500 uppercase tracking-wider">Risk Assessment</span>
          <span
            className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded border ${actionColor(action)}`}
          >
            {action}
          </span>
        </div>
        <div className="flex items-end gap-3">
          <span
            className={`text-4xl font-bold font-mono ${
              riskScore >= 70 ? "text-red-400" : riskScore >= 45 ? "text-orange-400" : riskScore >= 25 ? "text-yellow-400" : "text-green-400"
            }`}
          >
            {Math.round(riskScore)}
          </span>
          <span className="text-sm text-slate-500 mb-1">/100</span>
        </div>
        {vessel.explanation && (
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">{vessel.explanation}</p>
        )}
      </div>

      {/* Anomaly Signals */}
      {vessel.anomaly_signals.length > 0 && (
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">
            Anomaly Signals ({vessel.anomaly_signals.length})
          </h3>
          <div className="space-y-2">
            {vessel.anomaly_signals.map((signal, i) => (
              <div key={i} className="bg-slate-800/50 rounded-lg p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-slate-300 uppercase">
                    {signal.anomaly_type.replace(/_/g, " ")}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(signal.severity * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-1 mb-1.5">
                  <div
                    className={`h-1 rounded-full ${severityBar(signal.severity)}`}
                    style={{ width: `${signal.severity * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400">{signal.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vessel Info */}
      <div className="p-4 border-b border-slate-700/50">
        <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Vessel Information</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <InfoRow label="Type" value={vessel.vessel_type} />
          <InfoRow label="Flag" value={vessel.flag_state} />
          <InfoRow label="Length" value={vessel.length ? `${vessel.length}m` : "—"} />
          <InfoRow label="Beam" value={vessel.beam ? `${vessel.beam}m` : "—"} />
          <InfoRow label="Draft" value={vessel.draft ? `${vessel.draft}m` : "—"} />
          <InfoRow label="Callsign" value={vessel.callsign || "—"} />
          <InfoRow label="Destination" value={vessel.destination || "—"} />
          <InfoRow label="Deficiencies" value={String(vessel.inspection_deficiencies)} />
        </div>
      </div>

      {/* Current Position */}
      {vessel.latest_position && (
        <div className="p-4 border-b border-slate-700/50">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Current Position</h3>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <InfoRow label="Lat" value={vessel.latest_position.latitude.toFixed(5)} />
            <InfoRow label="Lon" value={vessel.latest_position.longitude.toFixed(5)} />
            <InfoRow
              label="Speed"
              value={vessel.latest_position.speed_over_ground != null ? `${vessel.latest_position.speed_over_ground.toFixed(1)} kt` : "—"}
            />
            <InfoRow
              label="Course"
              value={vessel.latest_position.course_over_ground != null ? `${vessel.latest_position.course_over_ground.toFixed(0)}°` : "—"}
            />
          </div>
        </div>
      )}

      {/* Verification Action */}
      {riskScore >= 45 && (
        <div className="p-4">
          <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Verification</h3>
          {verification ? (
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs font-medium text-blue-400 uppercase">
                  {verification.status}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Asset: {verification.asset_id} ({verification.asset_type})
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Verification task created. Asset dispatched.
              </p>
            </div>
          ) : (
            <button
              onClick={handleVerify}
              disabled={verifyLoading || !alertId}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {verifyLoading ? "Requesting..." : "Request Verification"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-300 ml-1.5 font-mono">{value}</span>
    </div>
  );
}
