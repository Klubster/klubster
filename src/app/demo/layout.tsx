import type { Metadata } from "next";
import Link from "next/link";
import { DemoProvider } from "@/components/demo/DemoProvider";
import BandeauDemo from "@/components/demo/BandeauDemo";
import { CLUB } from "@/lib/demo/donnees";

/**
 * Cockpit de démonstration — accessible sans compte, entièrement simulé.
 *
 * CE DOSSIER N'IMPORTE NI SUPABASE, NI STRIPE, NI RESEND, NI AUCUNE SERVER ACTION.
 * C'est la garantie du mode simulation : il n'existe aucune écriture à contourner,
 * parce qu'il n'en existe aucune. `tests/demo-isolation.test.ts` le vérifie fichier
 * par fichier plutôt que de s'en remettre à la vigilance.
 *
 * CE QUE CE LAYOUT PORTE, ET CE QU'IL NE PORTE PAS
 * Il porte le provider — un layout Next ne se remonte pas entre ses pages filles, donc
 * l'état survit à la navigation : un chèque encaissé sur une fiche se retrouve dans la
 * remise, et c'est ce qui fait comprendre le produit.
 *
 * Il ne porte PAS le rail numéroté. Dans le vrai cockpit, le rail `01 AUJOURD'HUI …
 * 07 SITE` est défini dans `cockpit/page.tsx` : il n'apparaît que sur « Aujourd'hui »,
 * et chaque sous-page revient par son propre lien — `← COCKPIT`, `← ADHÉRENTS`,
 * `← ENCAISSEMENTS`, `← TRÉSORERIE`, `← MESSAGERIE`. Mettre le rail ici aurait été plus
 * commode, et faux.
 *
 * `noindex` : c'est une vitrine commerciale peuplée de données fictives. Indexée, elle
 * ferait concurrence aux vraies pages sur les mêmes requêtes, et pourrait sortir en
 * résultat pour « L'Arbre et le Souffle », un club qui n'existe pas.
 */
export const metadata: Metadata = {
  title: "Démonstration — Klubster",
  description:
    "Essayez le cockpit de Klubster sur un club de yoga fictif : adhérents, dossiers, cotisations, contrôle au scan, messages et site. Sans compte, sans inscription.",
  robots: { index: false, follow: true },
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoProvider>
      <div className="min-h-screen text-ink">
        <BandeauDemo />

        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
          <Link href="/" className="font-logo text-lg font-semibold">
            k<span className="cur">_</span>
          </Link>
          <span className="mono hidden truncate text-[11px] uppercase tracking-label text-ink-soft sm:block">
            {CLUB.nom} — {CLUB.ville}
          </span>
        </header>

        {children}
      </div>
    </DemoProvider>
  );
}
