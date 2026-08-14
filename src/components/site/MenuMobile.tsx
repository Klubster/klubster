"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  seuil = "md",
}: {
  liens: LienMenu[];
  /** "clair" = texte blanc (au-dessus d'une photo) · "sombre" = texte encre (sur papier) */
  ton?: "clair" | "sombre";
  /** Largeur à partir de laquelle le burger disparaît au profit de la nav inline.
   *  "md" (768) par défaut ; "lg" (1024) pour les en-têtes chargés (nom long + boutons
   *  admin) qui débordent avant 1024 — cas des clubs comme l'USM. */
  seuil?: "md" | "lg";
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
      // le contenu invisible dessous. Depuis le passage au portail, la boucle ne contient
      // QUE les éléments du panneau — le bouton d'origine est caché dessous, y envoyer le
      // focus le ferait disparaître sous une surface opaque.
      if (e.key === "Tab") {
        const focusables = Array.from(
          panneauRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []
        ).filter((el): el is HTMLElement => Boolean(el));
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

  /**
   * LE PANNEAU EST RENDU DANS UN PORTAIL, ET CE N'EST PAS UN DÉTAIL.
   *
   * L'en-tête qui contient ce menu porte `backdrop-blur`. Or un ancêtre avec
   * `backdrop-filter` devient le **bloc conteneur** des descendants en `position: fixed` :
   * le `fixed inset-0` du panneau ne couvrait donc pas l'écran, il était enfermé dans la
   * bande de l'en-tête. Son fond ne peignait que ces soixante pixels, et les liens
   * débordaient par-dessus le texte de la page, illisibles (signalé sur mobile le 14/08).
   *
   * `createPortal` vers `document.body` sort le panneau de ce piège : plus aucun ancêtre
   * filtré au-dessus de lui, `fixed` retrouve le sens de « par rapport à l'écran ».
   * Conséquence : le panneau n'est plus dans le contexte d'empilement de l'en-tête, donc
   * le bouton d'origine passe DESSOUS — d'où le bouton de fermeture propre au panneau,
   * placé au même endroit et de la même taille, pour que le geste reste identique.
   */
  const panneau = (
    <div
      id={panneauId}
      ref={panneauRef}
      role="dialog"
      aria-modal="true"
      aria-label="Menu de navigation"
      className="fixed inset-0 z-[60] bg-paper"
    >
      <button
        type="button"
        onClick={() => {
          setOuvert(false);
          boutonRef.current?.focus();
        }}
        aria-label="Fermer le menu"
        className="absolute right-6 top-4 grid h-11 w-11 place-items-center md:right-8"
      >
        <span className="sr-only">Fermer le menu</span>
        <span aria-hidden className="relative block h-5 w-5">
          <span className="absolute left-0 top-1/2 h-px w-full rotate-45 bg-ink" />
          <span className="absolute left-0 top-1/2 h-px w-full -rotate-45 bg-ink" />
        </span>
      </button>
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
  );

  return (
    <div className={seuil === "lg" ? "lg:hidden" : "md:hidden"}>
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

      {/* `ouvert` ne peut être vrai qu'après un clic, donc jamais au rendu serveur :
          pas besoin d'un état « monté » pour attendre `document`. */}
      {ouvert && typeof document !== "undefined" ? createPortal(panneau, document.body) : null}
    </div>
  );
}
