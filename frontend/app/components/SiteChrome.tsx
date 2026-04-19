import Link from "next/link";
import LaunchButton from "@/app/components/LaunchButton";

const NAV: { label: string; href: string }[] = [
  { label: "Product", href: "/product" },
  { label: "Sectors", href: "/sectors" },
  { label: "Detectors", href: "/detectors" },
  { label: "Docs", href: "/docs" },
];

export function SiteNav({ active }: { active?: string }) {
  return (
    <nav className="max-w-[1400px] mx-auto flex items-center px-8 py-4 gap-10">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="relative w-6 h-6 rounded-md bg-gradient-to-br from-violet-400 to-cyan-400 flex items-center justify-center">
          <div className="absolute inset-[1.5px] rounded-[4px] bg-gradient-to-br from-[#1a1230] to-[#0d1a2a]" />
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" className="relative z-10 text-white">
            <path d="M12 2L3 7v10l9 5 9-5V7l-9-5z" />
          </svg>
        </div>
        <span className="text-[14px] font-semibold tracking-tight">HarborOS</span>
      </Link>
      <div className="flex gap-6">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`text-[13px] font-medium transition-colors ${
              active === item.label ? "text-slate-100" : "text-slate-400 hover:text-slate-100"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-2.5 py-1 text-[11px] text-emerald-300 font-mono">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" style={{ animation: "subtle-pulse 2.4s infinite" }} />
          Live · 14,287
        </div>
        <LaunchButton className="btn-primary text-[12.5px] px-3.5 py-1.5 rounded-md inline-flex items-center gap-1.5">
          Launch <span aria-hidden className="text-[14px] leading-none">→</span>
        </LaunchButton>
      </div>
    </nav>
  );
}

export function SiteFooter() {
  return (
    <footer className="max-w-[1400px] mx-auto px-8 py-8 border-t border-white/[0.06] flex flex-wrap justify-between gap-4 text-[12px] text-slate-500">
      <div>HarborOS · v2.4.1 · AIS + SAR fusion for maritime operators</div>
      <div className="font-mono">© 2026 · Los Angeles, CA</div>
    </footer>
  );
}

export function PageHero({
  eyebrow,
  title,
  gradient,
  body,
  ctaHref = "/dashboard",
  ctaLabel = "Launch Operations",
  secondaryHref,
  secondaryLabel,
}: {
  eyebrow: string;
  title: string;
  gradient: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <section className="max-w-[1100px] mx-auto px-8 pt-16 pb-12">
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-white/[0.08] bg-white/[0.02] text-[11.5px] text-slate-400 font-mono mb-7">
        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
        {eyebrow}
      </div>
      <h1 className="text-[42px] lg:text-[50px] leading-[1.04] tracking-[-0.03em] font-semibold mb-5">
        {title}
        <br />
        <span className="gradient-text">{gradient}</span>
      </h1>
      <p className="text-[15.5px] leading-[1.55] text-slate-400 max-w-[620px] mb-8">
        {body}
      </p>
      <div className="flex flex-wrap gap-2.5 items-center">
        {ctaHref === "/dashboard" ? (
          <LaunchButton className="btn-primary text-[13px] px-4 py-2 rounded-md inline-flex items-center gap-2">
            {ctaLabel} <span aria-hidden>→</span>
          </LaunchButton>
        ) : (
          <Link href={ctaHref} className="btn-primary text-[13px] px-4 py-2 rounded-md inline-flex items-center gap-2">
            {ctaLabel} <span aria-hidden>→</span>
          </Link>
        )}
        {secondaryHref && secondaryLabel && (
          <Link href={secondaryHref} className="btn-secondary text-[13px] px-4 py-2 rounded-md inline-flex items-center gap-2 backdrop-blur">
            {secondaryLabel}
          </Link>
        )}
      </div>
    </section>
  );
}
