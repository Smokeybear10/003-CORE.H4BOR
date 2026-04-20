"use client";

import { useEffect, useState } from "react";

export default function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    const update = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      if (max <= 0) {
        setProgress(0);
      } else {
        setProgress(Math.max(0, Math.min(1, h.scrollTop / max)));
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden
      className="fixed top-0 left-0 right-0 z-[60] h-[2px] pointer-events-none"
    >
      <div
        className="h-full bg-gradient-to-r from-violet-400 via-cyan-400 to-pink-400"
        style={{
          width: `${progress * 100}%`,
          opacity: progress > 0.001 ? 1 : 0,
          transition: "opacity 0.3s",
          boxShadow: "0 0 12px rgba(167,139,250,0.55)",
        }}
      />
    </div>
  );
}
