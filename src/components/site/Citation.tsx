"use client";

import { useEffect, useRef, useState } from "react";

// Citation-manifeste : Space Mono, _ vert en fin. Les lignes se dessinent une
// par une (effet machine à écrire), déclenchées à l'entrée à l'écran.
export default function Citation({
  lines,
  topTight,
  serre,
}: {
  lines: string[];
  topTight?: boolean;
  /** Moitié moins d'air autour : quand la citation ponctue au lieu de conclure. */
  serre?: boolean;
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
      { threshold: 0, rootMargin: "0px 0px -10% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const pt = serre ? "pt-16 md:pt-24" : topTight ? "pt-16 md:pt-24" : "pt-32 md:pt-48";
  const pb = serre ? "pb-16 md:pb-24" : "pb-32 md:pb-48";

  return (
    <section>
      <div ref={ref} className={`mx-auto max-w-[720px] px-6 text-center md:px-8 ${pt} ${pb}`}>
        <p className={`mono text-[26px] font-normal leading-[1.15] tracking-[-0.02em] text-ink md:text-[40px] ${shown ? "kb-cite-in" : ""}`}>
          {lines.map((line, i) => (
            <span key={i} className="kb-cite-line" style={{ transitionDelay: `${i * 180}ms` }}>
              {line}
              {i === lines.length - 1 ? <span className="cur">_</span> : null}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
