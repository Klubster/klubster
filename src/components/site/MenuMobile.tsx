"use client";

import { useEffect, useId, useRef, useState } from "react";

export interface LienMenu {
  href: string;
  label: string;
}

/**
 * Menu de navigation mobile (< 768 px). Sans lui, les liens de la nav — dont le lien
 * vers la vitrine de démonstration — sont purement inaccessibles au doigt.
 * Accessible : aria-expanded/controls, fermeture à l'Échap, focus rendu au bouton,
 * défilement du corps verrouillé pendant l'ouverture.
 */
export default function MenuMobile({
  liens,
  ton = "clair",
}: {
  liens: LienMenu[];
  /** "clair" = texte blanc (au-dessus d'une photo) · "sombre" = texte encre (sur papier) */
  ton?: "clair" | "sombre";
}) {
  const [ouvert, setOuvert] = useState(false);
  const panneauId = useId();
  const boutonRef = useRef<HTMLButtonElement>(null);
  const panneauRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOuvert(false);
        boutonRef.current?.focus();
      }
      // Piège de focus : le menu couvre tout l'écran, Tab ne doit pas s'échapper vers
      // le contenu invisible dessous. La boucle inclut le bouton (qui ferme le menu).
      if (e.key === "Tab") {
        const focusables = [
          boutonRef.current,
          ...Array.from(panneauRef.current?.querySelectorAll<HTMLElement>("a[href]") ?? []),
        ].filter((el): el is HTMLElement => Boolean(el));
        if (focusables.length === 0) return;
        const premier = focusables[0];
        const dernier = focusables[focusables.length - 1];
        const actif = document.activeElement as HTMLElement | null;
        if (e.shiftKey && actif === premier) {
          e.preventDefault();
          dernier.focus();
        } else if (!e.shiftKey && actif === dernier) {
          e.preventDefault();
          premier.focus();
        } else if (!actif || !focusables.includes(actif)) {
          e.preventDefault();
          premier.focus();
        }
      }
    };
    document.addEventListener("keydown", surTouche);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", surTouche);
      document.body.style.overflow = overflow;
    };
  }, [ouvert]);

  const couleurTrait = ton === "clair" ? "bg-paper" : "bg-ink";

  return (
    <div className="md:hidden">
      <button
        ref={boutonRef}
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-controls={panneauId}
        aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"}
        className="relative z-50 -m-3 grid h-11 w-11 place-items-center p-3"
      >
        <span className="sr-only">{ouvert ? "Fermer le menu" : "Ouvrir le menu"}</span>
        <span aria-hidden className="flex w-5 flex-col gap-[5px]">
          <span
            className={`h-px w-full transition-transform duration-300 ${ouvert ? "translate-y-[6px] rotate-45 bg-ink" : couleurTrait}`}
          />
          <span className={`h-px w-full transition-opacity duration-200 ${ouvert ? "opacity-0" : `opacity-100 ${couleurTrait}`}`} />
          <span
            className={`h-px w-full transition-transform duration-300 ${ouvert ? "-translate-y-[6px] -rotate-45 bg-ink" : couleurTrait}`}
          />
        </span>
      </button>

      {ouvert ? (
        <div
          id={panneauId}
          ref={panneauRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu de navigation"
          className="fixed inset-0 z-40 bg-paper"
        >
          <nav className="mx-auto flex h-full max-w-6xl flex-col justify-center px-6">
            {liens.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOuvert(false)}
                className="mono border-b border-line py-6 text-[15px] uppercase tracking-label text-ink"
              >
                {l.label}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </div>
  );
}
