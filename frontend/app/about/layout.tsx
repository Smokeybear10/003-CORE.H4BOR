import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "H4BOR | About",
  description: "The team behind HarborOS — maritime intelligence, detection engines, and the operations console.",
};

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}
