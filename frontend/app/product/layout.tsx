import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | Product",
  description: "The operations console for maritime triage — one surface for AIS, satellite, and behavioral signal across nine contested waterways.",
};

export default function ProductLayout({ children }: { children: React.ReactNode }) {
  return children;
}
