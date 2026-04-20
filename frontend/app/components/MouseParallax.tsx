"use client";

import { useEffect, useRef } from "react";

interface MouseParallaxProps {
  children: React.ReactNode;
  className?: string;
  // Max pixel offset for any child at the edge of the tracked area
  strength?: number;
}

/**
 * Wraps children in a container that tracks pointer position and exposes
 * normalized mouse coords (-1..1) as CSS variables --mx and --my on itself.
 *
 * Children opt into motion by using transform: translate(calc(var(--mx) * Xpx), calc(var(--my) * Ypx)).
 * This keeps parallax depth composable per child.
 */
export default function MouseParallax({ children, className = "", strength = 1 }: MouseParallaxProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      // Normalize pointer distance from center to viewport (dampen at edges).
      const vw = window.innerWidth || 1;
      const vh = window.innerHeight || 1;
      targetRef.current.x = Math.max(-1, Math.min(1, ((e.clientX - cx) / (vw / 2)) * strength));
      targetRef.current.y = Math.max(-1, Math.min(1, ((e.clientY - cy) / (vh / 2)) * strength));
      if (rafRef.current == null) tick();
    };

    const onLeave = () => {
      targetRef.current.x = 0;
      targetRef.current.y = 0;
      if (rafRef.current == null) tick();
    };

    const tick = () => {
      const cur = currentRef.current;
      const tgt = targetRef.current;
      cur.x += (tgt.x - cur.x) * 0.08;
      cur.y += (tgt.y - cur.y) * 0.08;
      el.style.setProperty("--mx", cur.x.toFixed(3));
      el.style.setProperty("--my", cur.y.toFixed(3));
      if (Math.abs(tgt.x - cur.x) > 0.001 || Math.abs(tgt.y - cur.y) > 0.001) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className} style={{ ["--mx" as string]: 0, ["--my" as string]: 0 }}>
      {children}
    </div>
  );
}
