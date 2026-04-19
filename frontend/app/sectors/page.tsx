import Link from "next/link";
import { SiteNav, SiteFooter, PageHero } from "@/app/components/SiteChrome";
import Reveal from "@/app/components/Reveal";

export default function SectorsPage() {
  return (
    <main className="min-h-screen">
      <SiteNav active="Sectors" />
      <PageHero
        eyebrow="9 sectors · live"
        title="Contested waterways,"
        gradient="watched continuously."
        body="HarborOS tracks nine of the most strategically important corridors on the water. Every sector is pre-seeded with geofences, traffic lanes, and sector-specific risk thresholds."
        secondaryHref="/dashboard"
        secondaryLabel="Open the map"
      />

      <section className="max-w-[1100px] mx-auto px-8 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {SECTORS.map(({ key, ...s }, i) => (
            <Reveal key={key} delay={(i % 3) * 70}>
              <SectorCard {...s} />
            </Reveal>
          ))}
        </div>
      </section>

      <section className="max-w-[1100px] mx-auto px-8 pb-24">
        <Reveal>
        <div className="glass rounded-2xl p-8">
          <div className="text-[10.5px] font-mono tracking-[0.22em] text-slate-500 uppercase mb-3">Why these sectors</div>
          <h3 className="text-[22px] font-semibold tracking-[-0.02em] mb-4 max-w-[640px]">
            Each corridor moves a critical fraction of global trade, fuel, or force projection.
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
            <FactStat n="~30%" l="Global oil through Hormuz" />
            <FactStat n="~40%" l="World trade via Malacca" />
            <FactStat n="500+" l="Vessels/day Dover Strait" />
            <FactStat n="9" l="Live sectors now" />
          </div>
        </div>
        </Reveal>
      </section>

      <SiteFooter />
    </main>
  );
}

function SectorCard({ name, region, description, tone, activity }: {
  name: string;
  region: string;
  description: string;
  tone: "crit" | "warn" | "normal";
  activity: string;
}) {
  const toneMap = {
    crit: { pill: "bg-red-400/12 text-red-300 border-red-400/25", dot: "bg-red-400" },
    warn: { pill: "bg-amber-400/12 text-amber-300 border-amber-400/25", dot: "bg-amber-400" },
    normal: { pill: "bg-emerald-400/12 text-emerald-300 border-emerald-400/25", dot: "bg-emerald-400" },
  };
  const t = toneMap[tone];
  return (
    <div className="glass rounded-xl p-5 hover:border-white/[0.12] transition-colors">
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div>
          <h3 className="text-[14px] font-semibold text-slate-100 leading-tight">{name}</h3>
          <div className="text-[10.5px] font-mono tracking-[0.12em] uppercase text-slate-500 mt-1">{region}</div>
        </div>
        <span className={`text-[9.5px] font-semibold py-0.5 px-2 rounded-full border uppercase tracking-[0.1em] shrink-0 flex items-center gap-1.5 ${t.pill}`}>
          <span className={`w-1 h-1 rounded-full ${t.dot}`} />
          {tone === "crit" ? "Critical" : tone === "warn" ? "Elevated" : "Nominal"}
        </span>
      </div>
      <p className="text-[12px] text-slate-400 leading-[1.55] mb-4">{description}</p>
      <div className="font-mono text-[10.5px] text-slate-500 pt-3 border-t border-white/[0.05]">
        {activity}
      </div>
    </div>
  );
}

function FactStat({ n, l }: { n: string; l: string }) {
  return (
    <div>
      <div className="text-[22px] font-semibold tracking-[-0.02em] tabular-nums leading-none">{n}</div>
      <div className="text-[11px] text-slate-500 mt-1.5">{l}</div>
    </div>
  );
}

const SECTORS = [
  {
    key: "la_harbor",
    name: "Los Angeles Harbor",
    region: "US · Pacific",
    tone: "warn" as const,
    description: "Port of Los Angeles and Long Beach — the busiest container complex in the United States. High-density anchorage and approach lanes.",
    activity: "149 active · 12 alerts",
  },
  {
    key: "taiwan_strait",
    name: "Taiwan Strait",
    region: "Asia · Pacific",
    tone: "crit" as const,
    description: "Major shipping lane and geopolitical flashpoint. Median line monitoring with sensitive military exclusion zones.",
    activity: "214 active · 8 alerts",
  },
  {
    key: "south_china_sea",
    name: "South China Sea",
    region: "Asia · Pacific",
    tone: "warn" as const,
    description: "Spratly and Paracel island chains, overlapping territorial claims. Heavy fishing fleet activity layered over transit lanes.",
    activity: "312 active · 5 alerts",
  },
  {
    key: "strait_of_malacca",
    name: "Strait of Malacca",
    region: "Indian Ocean",
    tone: "normal" as const,
    description: "World's busiest shipping lane. Dense tanker and bulker traffic funneling between Indian Ocean and Pacific.",
    activity: "482 active · 3 alerts",
  },
  {
    key: "strait_of_hormuz",
    name: "Strait of Hormuz",
    region: "Persian Gulf",
    tone: "crit" as const,
    description: "Critical oil transit chokepoint — roughly a third of global seaborne oil passes through. IMO-designated traffic separation scheme enforced.",
    activity: "187 active · 8 alerts",
  },
  {
    key: "black_sea",
    name: "Black Sea",
    region: "Eastern Europe",
    tone: "warn" as const,
    description: "Odesa, Crimea, Sevastopol, and the Turkish straits approach. Grain corridor plus naval exclusion zones.",
    activity: "94 active · 6 alerts",
  },
  {
    key: "sea_of_azov",
    name: "Sea of Azov",
    region: "Eastern Europe",
    tone: "warn" as const,
    description: "Kerch Strait, Mariupol approach, contested waters. Dark-transit-prone corridor with frequent AIS gaps.",
    activity: "38 active · 4 alerts",
  },
  {
    key: "english_channel",
    name: "English Channel",
    region: "Europe · Atlantic",
    tone: "normal" as const,
    description: "Dover Strait traffic separation scheme. Dense mixed traffic — ferries, cargo, and cross-Channel small craft.",
    activity: "276 active · 2 alerts",
  },
  {
    key: "eastern_med",
    name: "Eastern Mediterranean",
    region: "Mediterranean",
    tone: "warn" as const,
    description: "Syria, Lebanon, and Cyprus corridor. Sanctions-monitoring heavy — ship-to-ship transfers and identity swaps.",
    activity: "162 active · 4 alerts",
  },
];
