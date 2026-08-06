"use client";

import Link from "next/link";
import { useDemo } from "./DemoProvider";

/**
 * Le bandeau permanent. À aucun moment le visiteur ne doit pouvoir confondre cette
 * démonstration avec un vrai club, ni craindre d'abîmer quelque chose en cliquant.
 *
 * Il porte les trois choses qui doivent rester atteignables partout : le rappel du
 * caractère fictif, la réinitialisation, et la sortie vers la création d'un vrai club.
 */
export default function BandeauDemo() {
  const { envoyer } = useDemo();

  return (
    <div className="border-b border-line bg-ink px-6 py-2.5 text-paper md:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-3">
        <p className="mono text-[11px] uppercase tracking-label">
          DÉMONSTRATION — CLUB FICTIF · AUCUNE DONNÉE RÉELLE<span className="text-brand">_</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => envoyer({ type: "reinitialiser" })}
            className="mono min-h-[44px] text-[11px] uppercase tracking-label text-paper/70 underline underline-offset-4 hover:text-paper"
          >
            RÉINITIALISER
          </button>
          <Link
            href="/clubs-fondateurs"
            className="mono min-h-[44px] whitespace-nowrap py-3 text-[11px] uppercase tracking-label text-paper/70 hover:text-paper"
          >
            QUITTER LA DÉMONSTRATION
          </Link>
          <Link
            href="/creer?offre=fondateur"
            className="mono bg-brand-dark px-4 py-3 text-[11px] uppercase tracking-wide text-white hover:opacity-90"
          >
            CRÉER MON CLUB →
          </Link>
        </div>
      </div>
    </div>
  );
}
