import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | Sectors",
  description: "Nine contested waterways HarborOS monitors — LA Harbor, Singapore Strait, Bab-el-Mandeb, Hormuz, Taiwan Strait, and more.",
};

export default function SectorsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
