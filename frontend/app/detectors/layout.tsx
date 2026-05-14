import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | Detection Engines",
  description: "Eleven behavioral detectors that surface suspicious vessel activity across AIS gaps, loitering, geofence breaches, and identity anomalies.",
};

export default function DetectorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
