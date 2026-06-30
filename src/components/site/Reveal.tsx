"use client";

import { useEffect, useRef, useState } from "react";

// Révélation au scroll : fondu + léger glissement. Respecte prefers-reduced-motion.
export default function Reveal({
  children,
  className = "",
  delay = 0,
  kind = "block",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  kind?: "block" | "quote";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const base = kind === "quote" ? "kb-quote" : "kb-reveal";
  return (
    <div ref={ref} className={`${base} ${shown ? "kb-in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}
