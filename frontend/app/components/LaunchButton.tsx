"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

interface LaunchButtonProps {
  className?: string;
  children?: React.ReactNode;
  href?: string;
}

export default function LaunchButton({ className, children, href = "/dashboard" }: LaunchButtonProps) {
  const router = useRouter();

  useEffect(() => {
    router.prefetch(href);
  }, [router, href]);

  return (
    <button
      type="button"
      onClick={() => router.push(href)}
      className={className}
    >
      {children ?? (
        <>
          Launch Operations <span aria-hidden>→</span>
        </>
      )}
    </button>
  );
}
