"use client";

import { useEffect, useRef, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { Vessel, Geofence } from "@/app/lib/api";

interface MapViewProps {
  vessels: Vessel[];
  geofences: Geofence[];
  selectedVesselId: string | null;
  onSelectVessel: (vesselId: string) => void;
  flyTo?: { center: [number, number]; zoom: number } | null;
}

function vesselColor(score: number | null, action: string | null): string {
  if (!score || score < 25) return "#22c55e";
  if (score < 45) return "#f59e0b";
  if (score < 70) return "#f97316";
  return "#ef4444";
}

function geofenceColor(zoneType: string): string {
  switch (zoneType) {
    case "restricted": return "#ef4444";
    case "security": return "#f97316";
    case "shipping_lane": return "#3b82f6";
    case "anchorage": return "#22c55e";
    case "environmental": return "#8b5cf6";
    default: return "#64748b";
  }
}

export default function MapView({ vessels, geofences, selectedVesselId, onSelectVessel, flyTo }: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const updateMarkers = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    vessels.forEach((vessel) => {
      if (!vessel.latest_position) return;

      const score = vessel.risk_score ?? 0;
      const color = vesselColor(vessel.risk_score, vessel.recommended_action);
      const isSelected = vessel.id === selectedVesselId;
      const size = isSelected ? 14 : score >= 45 ? 11 : 8;

      const el = document.createElement("div");
      el.style.width = `${size}px`;
      el.style.height = `${size}px`;
      el.style.borderRadius = "50%";
      el.style.backgroundColor = color;
      el.style.border = isSelected ? "2px solid #fff" : `1px solid ${color}`;
      el.style.boxShadow = `0 0 ${score >= 45 ? "8" : "4"}px ${color}60`;
      el.style.cursor = "pointer";
      el.style.transition = "all 0.2s";

      // Pulsing animation for high-risk vessels
      if (score >= 70) {
        el.style.animation = "pulse 2s infinite";
      }

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        onSelectVessel(vessel.id);
      });

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([vessel.latest_position.longitude, vessel.latest_position.latitude])
        .addTo(map);

      markersRef.current.push(marker);
    });
  }, [vessels, selectedVesselId, onSelectVessel]);

  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
        sources: {
          "carto-dark": {
            type: "raster",
            tiles: [
              "https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://b.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
              "https://c.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            maxzoom: 18,
            attribution: "&copy; CARTO &copy; OpenStreetMap contributors",
          },
        },
        layers: [
          {
            id: "carto-dark",
            type: "raster",
            source: "carto-dark",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
      center: [-118.265, 33.725],
      zoom: 12.5,
      pitch: 0,
    });

    map.on("error", (e) => {
      console.error("MapLibre error:", e);
    });

    map.addControl(new maplibregl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;

      // Add geofences
      geofences.forEach((gf) => {
        const color = geofenceColor(gf.zone_type);
        map.addSource(`geofence-${gf.id}`, {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: gf.geometry,
            properties: { name: gf.name, zone_type: gf.zone_type },
          },
        });

        map.addLayer({
          id: `geofence-fill-${gf.id}`,
          type: "fill",
          source: `geofence-${gf.id}`,
          paint: {
            "fill-color": color,
            "fill-opacity": 0.08,
          },
        });

        map.addLayer({
          id: `geofence-line-${gf.id}`,
          type: "line",
          source: `geofence-${gf.id}`,
          paint: {
            "line-color": color,
            "line-width": 1.5,
            "line-dasharray": [4, 2],
            "line-opacity": 0.5,
          },
        });
      });

      updateMarkers();
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  // Fly to region when changed
  useEffect(() => {
    if (!flyTo || !mapRef.current) return;
    mapRef.current.flyTo({
      center: flyTo.center,
      zoom: flyTo.zoom,
      duration: 2000,
    });
  }, [flyTo]);

  return (
    <div className="flex-1 relative" style={{ minHeight: 0 }}>
      <div ref={mapContainer} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, width: "100%", height: "100%" }} />
      {/* Vessel legend */}
      <div className="absolute bottom-4 left-4 bg-[#111827]/90 backdrop-blur-sm border border-slate-700/50 rounded-lg p-3 text-[10px]">
        <div className="text-slate-500 uppercase tracking-wider mb-2 font-semibold">Risk Level</div>
        <div className="space-y-1.5">
          <LegendItem color="#22c55e" label="Normal" />
          <LegendItem color="#f59e0b" label="Monitor" />
          <LegendItem color="#f97316" label="Verify" />
          <LegendItem color="#ef4444" label="Escalate" />
        </div>
        <div className="border-t border-slate-700/50 mt-2 pt-2 text-slate-500 uppercase tracking-wider mb-1.5 font-semibold">
          Zones
        </div>
        <div className="space-y-1.5">
          <LegendItem color="#ef4444" label="Restricted" dashed />
          <LegendItem color="#f97316" label="Security" dashed />
          <LegendItem color="#3b82f6" label="Shipping Lane" dashed />
          <LegendItem color="#22c55e" label="Anchorage" dashed />
        </div>
      </div>
      {/* Pulse keyframe */}
      <style jsx global>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
}

function LegendItem({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {dashed ? (
        <div className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: color }} />
      ) : (
        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
      )}
      <span className="text-slate-400">{label}</span>
    </div>
  );
}
