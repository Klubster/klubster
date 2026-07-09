"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";

// Parallaxe douce + respiration lente de l'image (via .kb-breathe en CSS).
// Le translate (parallaxe) est porté par un conteneur, le scale (respiration)
// par l'image : les deux transforms se composent sans se gêner.
export default function Parallax({
  src,
  alt,
  className = "",
  strength = 0.1,
  priority = false,
}: {
  src: string;
  alt: string;
  className?: string;
  strength?: number;
  /** Le hero : chargé en priorité (c'est l'élément LCP). Les autres photos attendent le scroll. */
  priority?: boolean;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (window.matchMedia("(max-width: 768px)").matches) return; // pas de parallaxe sur mobile

    let raf = 0;
    const update = () => {
      raf = 0;
      const w = wrap.current;
      const el = inner.current;
      if (!w || !el) return;
      const r = w.getBoundingClientRect();
      const vh = window.innerHeight;
      const center = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-center * strength).toFixed(1)}px, 0)`;
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
      <div ref={inner} className="absolute inset-0 will-change-transform">
        {/* next/image : conversion AVIF/WebP + srcset responsive. Les JPEG sources font
            ~400 Ko chacun ; servis tels quels, ils plombaient le LCP. */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          quality={75}
          priority={priority}
          className="kb-breathe object-cover"
        />
      </div>
    </div>
  );
}
