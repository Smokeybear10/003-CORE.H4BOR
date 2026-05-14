import Link from "next/link";
import { SiteNav, SiteFooter, PageHero } from "@/app/components/SiteChrome";

const TEAM: { name: string; role: string; github?: string }[] = [
  {
    name: "Thomas Ou",
    role: "Detection engine, design system, landing page, dashboard UI, deploy.",
    github: "Smokeybear10",
  },
  {
    name: "Aadithya Srinivasan",
    role: "SeaPod edge node, demo mode, heatmaps, incident report.",
  },
  {
    name: "Kevin Xue",
    role: "Sentinel-2 satellite imagery, weather overlays, risk lines.",
    github: "kevinxuez",
  },
  {
    name: "Sebastian D'Alessio",
    role: "Anomaly signal schema.",
  },
];

export default function AboutPage() {
  return (
    <main id="main" className="min-h-screen">
      <SiteNav active="About" />
      <PageHero
        eyebrow="Team · 2026"
        title="Built at the hackathon"
        gradient="by four people."
        body="HarborOS started as a weekend build. Here's who shipped what."
      />

      <section className="max-w-[1100px] mx-auto px-8 pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {TEAM.map((m) => (
            <div
              key={m.name}
              className="glass rounded-xl p-5 hover:border-white/[0.12] transition-colors"
            >
              <div className="flex items-baseline justify-between gap-3 mb-2">
                <div className="text-[15px] font-semibold tracking-tight text-slate-100">
                  {m.name}
                </div>
                {m.github && (
                  <Link
                    href={`https://github.com/${m.github}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11.5px] font-mono text-slate-500 hover:text-slate-300 transition-colors shrink-0"
                  >
                    @{m.github}
                  </Link>
                )}
              </div>
              <p className="text-[13px] leading-[1.5] text-slate-400">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
