import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | Documentation",
  description: "API reference, quickstart guide, and integration notes for the HarborOS maritime intelligence platform.",
};

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
