"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface RevealProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  as?: "div" | "section" | "li";
}

export default function Reveal({ children, delay = 0, className = "", as = "div" }: RevealProps) {
  const elRef = useRef<HTMLElement | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);
  const [shown, setShown] = useState(false);

  const observe = useCallback((el: HTMLElement) => {
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.01, rootMargin: "0px 0px 80px 0px" },
    );
    io.observe(el);
    ioRef.current = io;
  }, []);

  const setRef = useCallback(
    (node: HTMLElement | null) => {
      if (ioRef.current) {
        ioRef.current.disconnect();
        ioRef.current = null;
      }
      elRef.current = node;
      if (node) observe(node);
    },
    [observe],
  );

  useEffect(() => {
    return () => {
      if (ioRef.current) ioRef.current.disconnect();
    };
  }, []);

  const classes = `reveal ${shown ? "reveal-in" : ""} ${className}`.trim();
  const style = { transitionDelay: shown ? `${delay}ms` : "0ms" };

  if (as === "section") return <section ref={setRef as React.Ref<HTMLElement>} className={classes} style={style}>{children}</section>;
  if (as === "li") return <li ref={setRef as React.Ref<HTMLLIElement>} className={classes} style={style}>{children}</li>;
  return <div ref={setRef as React.Ref<HTMLDivElement>} className={classes} style={style}>{children}</div>;
}
