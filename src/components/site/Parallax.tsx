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

  // Réparation du hero non peint (dégradé gris à la place de la photo, vu en prod
  // le 13/07/2026) : la layer de l'image se composait avant la fin du décodage et
  // rien ne l'invalidait ensuite. N'importe quelle mutation de style du conteneur
  // (resize, transform…) faisait apparaître la photo. On force donc, après
  // l'hydratation ET après le chargement effectif de l'image, une invalidation
  // éphémère du conteneur. Sans effet visible quand tout va bien.
  useEffect(() => {
    if (!priority) return;
    const el = inner.current;
    if (!el) return;
    const img = el.querySelector("img");

    let raf1 = 0;
    let raf2 = 0;
    const nudge = () => {
      raf1 = requestAnimationFrame(() => {
        el.style.transform = "translateZ(0)";
        raf2 = requestAnimationFrame(() => {
          el.style.transform = "";
        });
      });
    };

    if (!img || img.complete) {
      // Image déjà en cache : le load a eu lieu avant l'hydratation.
      nudge();
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    img.addEventListener("load", nudge, { once: true });
    return () => {
      img.removeEventListener("load", nudge);
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [priority]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Pas de parallaxe sur l'image prioritaire (le hero, élément LCP) : le transform
    // JS appliqué en continu participait au problème de composition ci-dessus, et
    // l'effet était de toute façon imperceptible en haut de page (~7 px).
    // Les photos suivantes gardent le leur.
    if (priority) return;
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
  }, [strength, priority]);

  return (
    <div ref={wrap} className={`overflow-hidden ${className}`}>
      {/* Pas de will-change-transform ici : combiné à l'animation de scale kb-breathe
          sur une image `fill` plus large que le viewport, il faisait échouer la
          composition GPU du hero en prod — l'image chargeait (200) mais n'était
          jamais peinte, le visiteur voyait le dégradé seul. Vérifié le 13/07/2026 :
          retirer will-change + breathe fait apparaître la photo instantanément.
          Le transform inline appliqué en continu suffit à Chrome pour promouvoir la layer. */}
      <div ref={inner} className="absolute inset-0">
        {/* next/image : conversion AVIF/WebP + srcset responsive. Les JPEG sources font
            ~400 Ko chacun ; servis tels quels, ils plombaient le LCP. */}
        {/* La respiration (kb-breathe) est réservée aux photos non-prioritaires :
            sur l'image LCP, l'animation de scale participait au bug de composition. */}
        <Image
          src={src}
          alt={alt}
          fill
          sizes="100vw"
          quality={75}
          priority={priority}
          className={`object-cover ${priority ? "" : "kb-breathe"}`}
        />
      </div>
    </div>
  );
}
