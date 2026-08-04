"use client";

import { use, useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Cur, EnTeteDemo } from "@/components/demo/Simulation";
import { compteursCampagne, ETAT_DESTINATAIRE, quandCampagne } from "@/lib/demo/selecteurs";

/**
 * LE DÉTAIL D'UNE CAMPAGNE — `cockpit/communication/[id]/page.tsx`.
 *
 * TROIS PARTIS PRIS DU PRODUIT, REPRIS À LA LETTRE
 *
 * 1. La grille compte CINQ cases : destinataires, acceptés, distribués, échecs,
 *    signalés. Les RETARDÉS n'y figurent pas — ils apparaissent seulement ligne par
 *    ligne, et dans le résumé de l'historique.
 * 2. Les PLAINTES ne sont pas agrégées aux échecs. Un message signalé comme indésirable
 *    a bien été distribué ; les confondre ferait croire à un problème d'acheminement là
 *    où il y a un problème de contenu ou de fréquence.
 * 3. Les destinataires sont triés PAR STATUT puis par identifiant (`.order("statut")`
 *    puis `.order("id")`), et paginés par 50. Le tri est alphabétique sur la valeur
 *    stockée, pas sur le libellé : « accepte » avant « distribue » avant « rejete ».
 *
 * L'adresse effacée d'un adhérent anonymisé s'affiche « — adresse effacée — » : le club
 * garde son compte, pas l'identité. Ce chemin n'existe pas encore dans la simulation, où
 * les campagnes ne sont pas touchées par l'anonymisation ; la ligne est écrite pour que
 * l'écran ne casse pas si elle le devient.
 */

const PAR_PAGE = 50;

export default function DemoCampagne({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { etat } = useDemo();
  const [page, setPage] = useState(1);

  const campagne = etat.campagnes.find((c) => c.id === id);

  if (!campagne) {
    return (
      <main className="min-h-screen text-ink">
        <EnTeteDemo retour="/demo/messages" libelleRetour="← MESSAGERIE" kicker="CAMPAGNE" />
        <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
          <h1 className="text-2xl font-medium">Ce message n’existe pas dans la simulation.</h1>
          <p className="mt-4 text-ink-soft">
            Il a peut-être disparu lors d’une réinitialisation. Revenez à la messagerie pour voir les
            messages du club.
          </p>
        </div>
      </main>
    );
  }

  const n = compteursCampagne(campagne);

  const triees = [...campagne.destinataires].sort(
    (a, b) => a.statut.localeCompare(b.statut) || a.id.localeCompare(b.id)
  );
  const pages = Math.max(1, Math.ceil(triees.length / PAR_PAGE));
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * PAR_PAGE;
  const tranche = triees.slice(debut, debut + PAR_PAGE);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/messages" libelleRetour="← MESSAGERIE" kicker="CAMPAGNE" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          {campagne.groupe_libelle.toUpperCase()}
          <Cur />
        </p>
        <h1 className="mt-4 text-2xl font-medium tracking-[-0.01em] md:text-3xl">{campagne.objet}</h1>
        <p className="mono mt-3 text-[11px] text-ink-soft">
          {quandCampagne(campagne.created_at)} · {campagne.auteur_nom}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5">
          {(
            [
              [n.destinataires, "DESTINATAIRES", false],
              [n.acceptes, "ACCEPTÉS", false],
              [n.distribues, "DISTRIBUÉS", false],
              [n.echecs, "ÉCHECS", true],
              [n.plaintes, "SIGNALÉS", true],
            ] as [number, string, boolean][]
          ).map(([valeur, label, alerte]) => (
            <div key={label} className="bg-paper px-4 py-4">
              <div className={`mono text-[20px] leading-none ${alerte && valeur > 0 ? "text-danger" : "text-ink"}`}>
                {valeur}
              </div>
              <div className="mono mt-2 text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
            </div>
          ))}
        </div>

        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            MESSAGE ENVOYÉ
            <Cur />
          </p>
          <p className="mt-4 whitespace-pre-wrap border border-line bg-bg-alt px-4 py-4 text-[14px] leading-relaxed text-ink-soft">
            {campagne.corps}
          </p>
        </section>

        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            DESTINATAIRES
            <Cur />
          </p>
          <div className="mt-4 border border-line">
            {tranche.map((d) => {
              const e = ETAT_DESTINATAIRE[d.statut] ?? ETAT_DESTINATAIRE.prepare;
              return (
                <div
                  key={d.id}
                  className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0"
                >
                  <span className="mono flex-1 truncate text-[12px]">{d.email || "— adresse effacée —"}</span>
                  <span className={`mono text-[11px] ${e.classe}`}>{e.texte}</span>
                </div>
              );
            })}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="mono text-[11px] text-ink-soft">
              {debut + 1}–{Math.min(debut + PAR_PAGE, triees.length)} sur {triees.length}
            </p>
            {pages > 1 ? (
              <div className="mono flex items-center gap-4 text-[12px]">
                {courante > 1 ? (
                  <button type="button" onClick={() => setPage(courante - 1)} className="min-h-[44px] py-3 text-brand-dark hover:underline">
                    ← Précédents
                  </button>
                ) : null}
                <span className="text-ink-soft">
                  page {courante} / {pages}
                </span>
                {courante < pages ? (
                  <button type="button" onClick={() => setPage(courante + 1)} className="min-h-[44px] py-3 text-brand-dark hover:underline">
                    Suivants →
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
