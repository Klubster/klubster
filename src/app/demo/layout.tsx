import type { Metadata } from "next";
import Link from "next/link";
import { CLUB } from "@/lib/demo/club";
import NavDemo from "./NavDemo";

/**
 * Cockpit de démonstration — accessible sans compte, en lecture seule.
 *
 * Ce dossier n'importe NI `@/lib/supabase/*`, NI aucune Server Action. C'est la
 * garantie : il n'existe aucune écriture à contourner, parce qu'il n'en existe aucune.
 *
 * `noindex` : c'est une vitrine commerciale peuplée de données fictives. Indexée, elle
 * ferait concurrence aux vraies pages sur les mêmes requêtes et pourrait sortir en
 * résultat pour « L'Arbre et le Souffle », un club qui n'existe pas.
 */
export const metadata: Metadata = {
  title: "Cockpit de démonstration — Klubster",
  description:
    "Explorez le cockpit de Klubster sur un club de yoga fictif : adhérents, dossiers, cotisations, contrôle au scan et messages. Sans compte, sans inscription.",
  robots: { index: false, follow: true },
};

function Cur() {
  return <span className="cur">_</span>;
}

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-ink">
      {/* Bandeau permanent : à aucun moment le visiteur ne doit croire qu'il manipule
          un vrai club, ni s'inquiéter d'abîmer quelque chose en cliquant. */}
      <div className="border-b border-line bg-ink px-6 py-2.5 text-paper md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <p className="mono text-[11px] uppercase tracking-label">
            DÉMONSTRATION — CLUB FICTIF, LECTURE SEULE<span className="text-brand">_</span>
          </p>
          <Link
            href="/creer?offre=fondateur"
            className="mono bg-brand-dark px-4 py-2 text-[11px] uppercase tracking-wide text-white hover:opacity-90"
          >
            CRÉER MON CLUB →
          </Link>
        </div>
      </div>

      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">
          k<Cur />
        </Link>
        <div className="flex min-w-0 items-center gap-5">
          <span className="mono hidden truncate text-[11px] uppercase tracking-label text-ink-soft sm:block">
            {CLUB.nom} — {CLUB.ville}
          </span>
          <Link href="/clubs-fondateurs" className="mono whitespace-nowrap text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">
            QUITTER
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        <NavDemo />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
