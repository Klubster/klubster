"use client";

import { use } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { CLUB } from "@/lib/demo/donnees";

/**
 * Le document fictif qu'ouvre « Consulter ».
 *
 * Le prétexte pour laisser ce geste inerte était « il n'y a aucun fichier derrière ».
 * Il suffisait d'en fabriquer un : le visiteur voit ainsi le parcours complet — ouvrir
 * la pièce qu'un adhérent a déposée depuis son espace — qui est l'une des raisons
 * d'être du produit.
 *
 * Aucun Storage, aucun réseau : c'est une page rendue sur place, marquée si clairement
 * qu'on ne peut pas la confondre avec un vrai certificat, même imprimée.
 */
export default function DocumentFictif({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { etat } = useDemo();

  const piece = etat.pieces.find((p) => p.id === id);
  const adherent = etat.adherents.find((a) => a.id === piece?.adherent_id);

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-16 md:px-8">
        <div className="border-2 border-line px-8 py-10">
          <p
            className="mono text-center text-[11px] uppercase tracking-label"
            style={{ color: "#B23B3B" }}
          >
            DOCUMENT FICTIF — DÉMONSTRATION KLUBSTER
          </p>

          <h1 className="mt-10 text-center text-2xl font-medium">
            {piece?.label ?? "Pièce du dossier"}
          </h1>

          <div className="mono mt-10 space-y-3 text-[13px] text-ink-soft">
            <p>
              Adhérent : {adherent ? `${adherent.prenom} ${adherent.nom}` : "—"}
            </p>
            <p>Club : {CLUB.nom}</p>
            <p>Déposé le : 12/09/2026</p>
          </div>

          <p className="mt-10 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Dans votre club, ce lien ouvre le fichier que l’adhérent a déposé depuis son espace,
            par une adresse signée valable quelques minutes. Il n’est lisible que par le président
            et le secrétaire — un trésorier ou un encadrant ne le voit pas.
          </p>

          <p
            className="mono mt-10 border-t border-line pt-6 text-center text-[11px] uppercase tracking-label"
            style={{ color: "#B23B3B" }}
          >
            AUCUN DOCUMENT RÉEL — RIEN N’A ÉTÉ TÉLÉCHARGÉ
          </p>
        </div>

        <button
          type="button"
          onClick={() => window.close()}
          className="mono mt-8 min-h-[44px] text-[12px] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Fermer cet onglet
        </button>
      </div>
    </main>
  );
}
