"use client";

import { useEffect, useRef } from "react";

// Parallaxe très douce sur une grande photo. L'image est légèrement zoomée
// pour éviter tout bord vide. Désactivée si prefers-reduced-motion.
export default function Parallax({
  src,
  alt,
  className = "",
  strength = 0.08,
}: {
  src: string;
  alt: string;
  className?: string;
  strength?: number;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const img = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 768px)").matches) return; // pas de parallaxe sur mobile

    let raf = 0;
    const update = () => {
      raf = 0;
      const w = wrap.current;
      const im = img.current;
      if (!w || !im) return;
      const r = w.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = r.top + r.height / 2 - vh / 2;
      im.style.transform = `translate3d(0, ${(-center * strength).toFixed(1)}px, 0) scale(1.14)`;
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [strength]);

  return (
    <div ref={wrap} className={`overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={img}
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover will-change-transform"
        style={{ transform: "scale(1.14)" }}
      />
    </div>
  );
}
