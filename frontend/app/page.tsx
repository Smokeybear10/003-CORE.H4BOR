import Link from "next/link";

export default function Landing() {
  return (
    <main className="min-h-screen">
      <Nav />
      <Hero />
      <Features />
      <ConsolePreview />
      <Footer />
    </main>
  );
}

function Nav() {
  return (
    <nav className="max-w-[1600px] mx-auto flex items-center px-10 py-5 gap-12">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center shadow-[0_4px_16px_rgba(167,139,250,0.35)]">
          <div className="absolute inset-[2px] rounded-[5px] bg-gradient-to-br from-[#1a1230] to-[#0d1a2a]" />
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className="relative z-10 text-white">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          </svg>
        </div>
        <span className="text-[15px] font-bold tracking-tight">HarborOS</span>
      </Link>
      <div className="flex gap-7">
        <NavItem>Product</NavItem>
        <NavItem>Sectors</NavItem>
        <NavItem>Detectors</NavItem>
        <NavItem>Docs</NavItem>
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-emerald-500/5 px-3 py-1.5 text-[11px] text-emerald-300 font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#4ade80]" style={{ animation: "subtle-pulse 2s infinite" }} />
          AIS Live · 14,287
        </div>
        <Link href="/dashboard" className="btn-gradient text-[13px] px-4 py-2 rounded-lg inline-flex items-center gap-2">
          Launch <span aria-hidden>→</span>
        </Link>
      </div>
    </nav>
  );
}

function NavItem({ children }: { children: React.ReactNode }) {
  return (
    <a href="#" className="text-[13px] font-medium text-slate-400 hover:text-slate-100 transition-colors">
      {children}
    </a>
  );
}

function Hero() {
  return (
    <section className="max-w-[1600px] mx-auto px-10 pt-16 pb-24 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-20 items-center">
      <div>
        <div className="inline-flex items-center gap-2.5 pl-1 pr-3.5 py-1 rounded-full border border-white/10 bg-white/[0.02] text-[12px] text-slate-400 mb-8">
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center text-[9px] font-bold text-black">✦</span>
          Now with Sentinel-2 fusion · v2.4
        </div>

        <h1 className="text-[64px] lg:text-[72px] leading-[1.02] tracking-[-0.035em] font-bold mb-7">
          <span className="block">Maritime intelligence,</span>
          <span className="block gradient-text">for every horizon.</span>
        </h1>

        <p className="text-[18px] leading-[1.55] text-slate-400 max-w-[560px] mb-10">
          The first open operator platform built for live AIS, satellite fusion, and behavioral detection. Deploy in an afternoon. Watch 14,000 vessels across nine seas in a single console.
        </p>

        <div className="flex flex-wrap gap-3 items-center mb-12">
          <Link href="/dashboard" className="btn-gradient text-[14px] px-5 py-3.5 rounded-xl inline-flex items-center gap-2">
            Launch Operations <span aria-hidden>→</span>
          </Link>
          <a href="#preview" className="text-[14px] px-5 py-3.5 rounded-xl inline-flex items-center gap-2 border border-white/10 bg-white/[0.02] hover:bg-white/[0.06] transition-colors backdrop-blur">
            See the console
          </a>
        </div>

        <div className="flex flex-wrap gap-x-10 gap-y-6 pt-8 border-t border-white/10">
          <Proof n="14,287" l="Vessels tracked today" />
          <Proof n="1.4s" l="Detection latency" />
          <Proof n="99.2%" l="Precision (30d)" />
          <Proof n="9" l="Contested sectors" />
        </div>
      </div>

      <UiStack />
    </section>
  );
}

function Proof({ n, l }: { n: string; l: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[28px] font-bold tracking-[-0.02em] tabular-nums">{n}</div>
      <div className="text-[12px] text-slate-500 font-medium">{l}</div>
    </div>
  );
}

function UiStack() {
  return (
    <div className="relative w-full min-h-[540px]">
      {/* Map card */}
      <div className="absolute top-0 right-0 w-[520px] max-w-full h-[380px] glass rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] overflow-hidden">
        <div className="flex justify-between items-center mb-3.5">
          <h3 className="text-[14px] font-semibold">Live fleet · LA Harbor</h3>
          <span className="font-mono text-[10px] text-cyan-300 py-[3px] px-2 rounded-full bg-cyan-400/10 border border-cyan-400/25">● 149 active</span>
        </div>
        <div className="relative w-full h-[calc(100%-36px)] rounded-xl overflow-hidden"
             style={{
               background: "radial-gradient(ellipse at 30% 40%,rgba(167,139,250,.15),transparent 60%),radial-gradient(ellipse at 70% 60%,rgba(34,211,238,.1),transparent 60%),#0a0e1c"
             }}>
          <div aria-hidden className="absolute inset-0 opacity-60"
               style={{
                 backgroundImage: "linear-gradient(rgba(255,255,255,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.03) 1px,transparent 1px)",
                 backgroundSize: "40px 40px"
               }} />
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 500 340" preserveAspectRatio="none">
            <path d="M 0 180 Q 80 160 160 170 Q 240 180 320 175 Q 400 170 500 180" stroke="rgba(255,255,255,.08)" strokeWidth="1" fill="none" />
            <path d="M 0 220 Q 100 210 200 220 Q 300 230 400 225 Q 450 220 500 225" stroke="rgba(255,255,255,.05)" strokeWidth="1" fill="none" />
          </svg>
          <Dot color="green" top="30%" left="20%" />
          <Dot color="green" top="36%" left="32%" />
          <Dot color="green" top="42%" left="48%" />
          <Dot color="amber" top="50%" left="62%" />
          <Dot color="red" top="45%" left="72%" pulse />
          <Dot color="green" top="60%" left="28%" />
          <Dot color="green" top="68%" left="55%" />
          <Dot color="amber" top="72%" left="82%" />
        </div>
      </div>

      {/* Alert card */}
      <div className="absolute top-[260px] -left-4 sm:-left-10 lg:-left-[60px] w-[360px] max-w-[95vw] glass rounded-2xl p-5 shadow-[0_20px_60px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex justify-between items-center mb-3">
          <div>
            <h4 className="text-[16px] font-semibold">MV Jade Star</h4>
            <div className="text-[12px] text-slate-400 font-mono">MMSI 538007493 · Marshall Is.</div>
          </div>
          <span className="text-[10px] font-bold py-1 px-2.5 rounded-full bg-red-400/15 text-red-300 border border-red-400/30 uppercase tracking-wider">Escalate</span>
        </div>
        <Signal name="Dark transit" w={98} />
        <Signal name="Geofence breach" w={92} />
        <Signal name="AIS spoofing" w={84} />
        <Signal name="Loitering" w={76} />
      </div>

      {/* Stats card */}
      <div className="absolute top-[440px] right-8 w-[320px] max-w-[90%] glass rounded-2xl p-4 flex gap-5 shadow-[0_20px_60px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="flex-1">
          <div className="text-[24px] font-bold tracking-[-0.02em] text-amber-300 tabular-nums">47</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active alerts</div>
        </div>
        <div className="w-px bg-white/10" />
        <div className="flex-1">
          <div className="text-[24px] font-bold tracking-[-0.02em] text-emerald-300 tabular-nums">99.98%</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ingest uptime</div>
        </div>
      </div>
    </div>
  );
}

function Dot({ color, top, left, pulse }: { color: "green" | "amber" | "red"; top: string; left: string; pulse?: boolean }) {
  const colorMap = {
    green: "bg-emerald-400 shadow-[0_0_12px_#4ade80]",
    amber: "bg-amber-400 shadow-[0_0_12px_#fb923c]",
    red: "bg-red-400 shadow-[0_0_12px_#f87171]",
  };
  return (
    <div className="absolute w-[10px] h-[10px] rounded-full -translate-x-1/2 -translate-y-1/2" style={{ top, left }}>
      <div className={`absolute inset-0 rounded-full ${colorMap[color]}`} />
      {pulse && <div className="absolute -inset-[6px] rounded-full border-[1.5px] border-red-400 ring-pulse" />}
    </div>
  );
}

function Signal({ name, w }: { name: string; w: number }) {
  return (
    <div className="flex justify-between items-center py-2 border-t border-white/5 first:border-t-0">
      <span className="text-[13px]">{name}</span>
      <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${w}%`, background: "linear-gradient(90deg,#f87171,#fb923c)" }} />
      </div>
    </div>
  );
}

function Features() {
  const feats = [
    {
      color: "#a78bfa",
      title: "Global AIS ingest",
      body: "14,287 vessels streamed from aisstream.io. 9 maritime sectors, 24/7.",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></svg>),
    },
    {
      color: "#22d3ee",
      title: "11 behavioral detectors",
      body: "Dark transit, spoofing, loitering, rendezvous, manifest mismatch, and more.",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>),
    },
    {
      color: "#f472b6",
      title: "Sentinel-2 fusion",
      body: "10m optical imagery on demand. Verify any contact in one click.",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>),
    },
    {
      color: "#4ade80",
      title: "Exportable reports",
      body: "One-click PDF briefs. Interagency-ready. Signed and audit-logged.",
      icon: (<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/></svg>),
    },
  ];
  return (
    <section className="max-w-[1600px] mx-auto px-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      {feats.map((f) => (
        <div key={f.title} className="glass rounded-2xl p-7 hover:-translate-y-0.5 hover:border-violet-400/30 transition-all">
          <div className="w-10 h-10 rounded-[10px] mb-4 border border-white/10 flex items-center justify-center"
               style={{ background: "linear-gradient(135deg,rgba(167,139,250,.2),rgba(34,211,238,.15))", color: f.color }}>
            {f.icon}
          </div>
          <h4 className="text-[15px] font-semibold mb-1.5">{f.title}</h4>
          <p className="text-[13px] text-slate-400 leading-[1.5]">{f.body}</p>
        </div>
      ))}
    </section>
  );
}

function ConsolePreview() {
  return (
    <section id="preview" className="max-w-[1600px] mx-auto px-10 pt-28 pb-32">
      <div className="flex items-end justify-between mb-8">
        <div>
          <div className="text-[11px] font-mono tracking-[0.3em] text-violet-300 uppercase mb-3">The Console</div>
          <h2 className="text-[42px] font-bold tracking-[-0.025em] leading-[1.1]">Every signal, one view.</h2>
          <p className="text-[15px] text-slate-400 mt-2 max-w-[480px] leading-[1.5]">
            Contacts, sectors, triage queue, and verification — at operator tempo.
          </p>
        </div>
        <Link href="/dashboard" className="btn-gradient text-[14px] px-5 py-3 rounded-xl inline-flex items-center gap-2">
          Open console <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-white/10">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-400/70" />
            <span className="w-3 h-3 rounded-full bg-amber-400/70" />
            <span className="w-3 h-3 rounded-full bg-emerald-400/70" />
          </div>
          <div className="mx-auto font-mono text-[11px] text-slate-400 px-3 py-1 rounded-md bg-white/[0.04]">
            harboros.app/dashboard
          </div>
          <div className="w-16" />
        </div>
        <div className="grid grid-cols-[220px_1fr_360px] h-[520px]">
          {/* sectors */}
          <aside className="border-r border-white/10 p-3 overflow-hidden">
            <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500 px-2 pb-2">Sectors · 9</div>
            {[
              ["Los Angeles Harbor", "crit", 12, true],
              ["Strait of Hormuz", "warn", 8],
              ["Black Sea", "warn", 6],
              ["Taiwan Strait", "n", 4],
              ["South China Sea", "n", 5],
              ["English Channel", "n", 3],
              ["Eastern Med", "n", 4],
            ].map(([name, kind, count, active]) => (
              <div key={String(name)} className={`flex justify-between items-center px-3 py-2.5 rounded-lg text-[12px] ${active ? "bg-gradient-to-r from-violet-400/12 to-cyan-400/8 ring-1 ring-inset ring-violet-400/25" : "hover:bg-white/[0.03]"}`}>
                <span className="font-medium">{name}</span>
                <span className={`font-mono text-[11px] px-2 py-0.5 rounded-full ${
                  kind === "crit" ? "bg-red-400/15 text-red-300"
                    : kind === "warn" ? "bg-amber-400/15 text-amber-300"
                    : "bg-white/[0.04] text-slate-400"
                }`}>{count}</span>
              </div>
            ))}
          </aside>

          {/* map */}
          <div className="relative overflow-hidden"
               style={{ background: "radial-gradient(ellipse at 40% 30%,rgba(167,139,250,.08),transparent 50%),radial-gradient(ellipse at 70% 70%,rgba(34,211,238,.06),transparent 50%),#0a0e1c" }}>
            <div aria-hidden className="absolute inset-0"
                 style={{
                   backgroundImage: "linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)",
                   backgroundSize: "50px 50px"
                 }} />
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1000 600" preserveAspectRatio="none">
              <path d="M 80 300 Q 180 280 280 290 T 460 310 L 510 280 Q 560 270 600 300 L 650 330 Q 720 340 780 310 T 960 340" stroke="rgba(255,255,255,.08)" strokeWidth="1" fill="none" />
              <path d="M 80 360 Q 200 380 320 360 T 560 380 L 600 400 Q 680 410 780 385 T 960 405" stroke="rgba(255,255,255,.05)" strokeWidth="1" fill="none" />
            </svg>
            {[
              ["g", 30, 18], ["g", 26, 24], ["g", 44, 33], ["a", 52, 42],
              ["r", 38, 51], ["a", 56, 58], ["g", 41, 66], ["g", 49, 72],
              ["r", 34, 79], ["g", 62, 47], ["a", 68, 29], ["g", 71, 54],
            ].map(([c, t, l], i) => (
              <Dot key={i} color={c === "g" ? "green" : c === "a" ? "amber" : "red"} top={`${t}%`} left={`${l}%`} pulse={c === "r"} />
            ))}
            <div className="absolute top-5 left-5 p-4 rounded-xl min-w-[260px] glass-strong">
              <div className="text-[10px] font-semibold text-slate-500 tracking-[0.14em] uppercase mb-1.5">Contact</div>
              <div className="text-[16px] font-semibold">MV Jade Star</div>
              <div className="text-[11px] text-slate-400 font-mono mt-0.5 mb-3">MMSI 538007493 · Marshall Is.</div>
              <div className="grid grid-cols-2 gap-3">
                <KV l="Speed" v="3.2 kn" />
                <KV l="Heading" v="247°" />
                <KV l="Risk" v="100" vClass="text-red-300" />
                <KV l="Last seen" v="47s" />
              </div>
            </div>
          </div>

          {/* triage */}
          <aside className="border-l border-white/10 overflow-hidden">
            <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
              <h3 className="text-[13px] font-semibold">Triage queue</h3>
              <span className="font-mono text-[10px] text-red-300">47 active</span>
            </div>
            <div className="p-2 space-y-1 overflow-auto h-[calc(100%-53px)]">
              <TriageItem name="MV Jade Star" desc="Dark transit + geofence breach; resumed with altered manifest." mmsi="538007493" risk={100} tier="r" tags={["Dark transit","Geofence","Spoofing","+3"]} selected />
              <TriageItem name="Lohanka" desc="47min AIS gap; resumed with altered identity." mmsi="319563000" risk={94} tier="r" tags={["Spoofing","Dark period"]} />
              <TriageItem name="F/V Victoire" desc="Loitering 1.2nm from restricted zone." mmsi="227313580" risk={78} tier="a" tags={["Loitering","Proximity"]} />
              <TriageItem name="Tenacity" desc="Draft change inconsistent with declared manifest." mmsi="338126674" risk={71} tier="a" tags={["Draft","Manifest"]} />
              <TriageItem name="Amber Bee" desc="Rendezvous with AIS-dark contact 2.1nm offshore." mmsi="229456000" risk={62} tier="c" tags={["Rendezvous","Dark contact"]} />
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}

function KV({ l, v, vClass }: { l: string; v: string; vClass?: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold text-slate-500 tracking-[0.14em] uppercase mb-0.5">{l}</div>
      <div className={`font-mono text-[14px] font-medium ${vClass ?? ""}`}>{v}</div>
    </div>
  );
}

function TriageItem({ name, desc, mmsi, risk, tier, tags, selected }: {
  name: string; desc: string; mmsi: string; risk: number;
  tier: "r" | "a" | "c"; tags: string[]; selected?: boolean;
}) {
  const riskColor = tier === "r" ? "text-red-300" : tier === "a" ? "text-amber-300" : "text-cyan-300";
  return (
    <div className={`p-3.5 rounded-xl cursor-pointer transition-colors border ${
      selected
        ? "bg-gradient-to-br from-red-400/10 to-violet-400/5 border-red-400/25"
        : "border-transparent hover:bg-white/[0.03]"
    }`}>
      <div className="flex justify-between gap-3 mb-1.5">
        <div className="text-[14px] font-semibold leading-tight">{name}</div>
        <div className={`text-[18px] font-bold tabular-nums tracking-[-0.02em] ${riskColor}`}>{risk}</div>
      </div>
      <div className="text-[12px] text-slate-400 leading-[1.5] mb-2">{desc}</div>
      <div className="flex flex-wrap gap-1 mb-2">
        {tags.map((t) => (
          <span key={t} className={`text-[10px] px-2 py-[3px] rounded-full border ${
            tier === "r" && (t.startsWith("Dark") || t === "Geofence" || t === "Spoofing")
              ? "bg-red-400/10 text-red-300 border-red-400/25"
              : "bg-white/[0.04] text-slate-400 border-white/10"
          }`}>{t}</span>
        ))}
      </div>
      <div className="font-mono text-[10px] text-slate-500 flex justify-between">
        <span>MMSI {mmsi}</span>
        <span>15:41 UTC</span>
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="max-w-[1600px] mx-auto px-10 py-10 border-t border-white/10 flex flex-wrap justify-between gap-4 text-[13px] text-slate-500">
      <div>HarborOS · v2.4.1 · AIS + SAR fusion for maritime operators</div>
      <div className="font-mono">© 2026 · Los Angeles, CA</div>
    </footer>
  );
}
