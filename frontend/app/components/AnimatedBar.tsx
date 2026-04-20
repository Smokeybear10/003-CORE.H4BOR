"use client";

import { useEffect, useRef, useState } from "react";

interface AnimatedBarProps {
  value: number; // 0..100
  delay?: number;
  className?: string;
  barClassName?: string;
  height?: number;
  width?: number;
}

export default function AnimatedBar({
  value,
  delay = 0,
  className = "",
  barClassName = "bg-gradient-to-r from-violet-400/70 to-cyan-400/70",
  height = 3,
  width = 80,
}: AnimatedBarProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setFilled(true);
      return;
    }
    if (typeof IntersectionObserver === "undefined") {
      setFilled(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const t = setTimeout(() => setFilled(true), delay);
            io.disconnect();
            return () => clearTimeout(t);
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  return (
    <div
      ref={ref}
      className={`bg-white/[0.05] rounded-full overflow-hidden ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
    >
      <div
        className={`h-full rounded-full ${barClassName}`}
        style={{
          width: filled ? `${value}%` : "0%",
          transition: "width 1.1s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </div>
  );
}
