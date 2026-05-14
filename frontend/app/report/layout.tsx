import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | Incident Report",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

export default function ReportLayout({ children }: { children: React.ReactNode }) {
  return children;
}
