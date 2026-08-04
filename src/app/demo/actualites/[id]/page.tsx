"use client";

import { use } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { CLUB, dateLongue } from "@/lib/demo/donnees";

/**
 * LA PAGE PUBLIQUE D'UNE ACTUALITÉ — `src/app/[asso]/actualites/[id]/page.tsx`.
 *
 * C'est la page que voit un adhérent, pas le président : en-tête de vitrine au nom du
 * club, couleur du TENANT et non celle de Klubster, et un retour au site plutôt qu'au
 * cockpit. Elle existe ici parce que « VOIR LA PAGE → » y mène depuis l'atelier, et
 * qu'un lien qui ne mène nulle part est un écran cassé.
 *
 * LES PARAGRAPHES SE SÉPARENT PAR UNE LIGNE VIDE (`split(/\n{2,}/)`), et les retours
 * simples restent des retours à la ligne (`whitespace-pre-line`). C'est exactement ce que
 * promet le placeholder du champ TEXTE dans l'atelier ; l'écrire autrement ici ferait
 * mentir l'atelier.
 */

export default function DemoActualite({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { etat } = useDemo();

  const actu = etat.actualites.find((a) => a.id === id);

  if (!actu) {
    return (
      <main className="min-h-screen text-ink">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
          <Link href="/demo/actualites" className="mono min-h-[44px] py-3 text-[12px] text-ink-soft hover:text-ink">
            ← {CLUB.nom}
          </Link>
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ACTUALITÉ</span>
        </header>
        <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
          <h1 className="text-2xl font-medium">Cette actualité n’existe pas dans la simulation.</h1>
          <p className="mt-4 text-ink-soft">
            Elle a peut-être été supprimée, ou la démonstration a été réinitialisée.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/demo/actualites" className="mono min-h-[44px] py-3 text-[12px] text-ink-soft hover:text-ink">
          ← {CLUB.nom}
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ACTUALITÉ</span>
      </header>

      {actu.aUneImage ? (
        <div className="flex h-40 w-full items-center justify-center border-b border-line bg-bg-alt md:h-64">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PHOTO DU CLUB — IMAGE SIMULÉE
          </span>
        </div>
      ) : null}

      <article className="mx-auto max-w-2xl px-6 py-14 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">{dateLongue(actu.publie_le)}</p>
        <h1 className="mt-6 text-3xl font-medium leading-tight md:text-4xl">{actu.titre}</h1>
        <div className="mt-8 space-y-5">
          {actu.texte.split(/\n{2,}/).map((p, i) => (
            <p key={i} className="whitespace-pre-line text-lg leading-relaxed text-ink-soft">
              {p}
            </p>
          ))}
        </div>
        <Link
          href="/demo/actualites"
          className="mono mt-12 inline-block min-h-[44px] border border-ink px-6 py-3 text-[13px] hover:bg-ink hover:text-paper"
        >
          ← RETOUR À L’ATELIER
        </Link>
      </article>
    </main>
  );
}
