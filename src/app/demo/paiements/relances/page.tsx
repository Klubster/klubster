"use client";

import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, Confirmation, EnTeteDemo } from "@/components/demo/Simulation";
import { AUJOURDHUI, CLUB, eur } from "@/lib/demo/donnees";
import { impayes } from "@/lib/demo/selecteurs";

/**
 * LES RELANCES — `cockpit/paiements/relances/page.tsx` et ses actions.
 *
 * DEUX ÉCRANS, DEUX PÉRIMÈTRES — et c'est la chose à ne pas gommer.
 * Les encaissements ne listent que les chèques et les espèces. Les relances, elles, ne
 * filtrent AUCUN mode : une cotisation en ligne restée impayée se relance, elle ne
 * s'encaisse pas à la main.
 *
 * QUI EST ÉCARTÉ, ET POURQUOI CE N'EST PAS UN OUBLI
 * Les adhérents sans email n'ont pas de bouton. Le produit affiche « Pas d'email » et
 * s'arrête là : il n'a rien à proposer, et faire semblant serait pire. Leur montant
 * reste pourtant compté dans le total à encaisser — le club leur doit un mot au bord du
 * tapis, pas une ligne en moins.
 *
 * CE QUI NE PART PAS ICI
 * Aucun email. Le geste estampille `derniere_relance`, ce que fait `marquer_relance`
 * après un envoi réussi, et rien d'autre.
 */

/** « aujourd'hui », « hier », « il y a n j », puis la date — la fonction du produit. */
function depuis(iso: string): string {
  const jours = Math.floor((Date.parse(AUJOURDHUI) - Date.parse(iso)) / 86_400_000);
  if (jours <= 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} j`;
  return `le ${new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}`;
}

export default function DemoRelances() {
  const { etat, envoyer } = useDemo();

  const lignes = impayes(etat).map((l) => ({
    ...l,
    adherent: etat.adherents.find((a) => a.id === l.adhesion.adherent_id)!,
    cours: etat.cours.find((c) => c.id === l.adhesion.cours_id)?.nom ?? "—",
  }));

  const avecEmail = lignes.filter((l) => l.adherent.email);
  const sansEmail = lignes.filter((l) => !l.adherent.email);
  const totalReste = lignes.reduce((s, l) => s + l.reste, 0);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/paiements" libelleRetour="← TRÉSORERIE" kicker="RELANCES" />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          COTISATIONS NON SOLDÉES — {CLUB.nom}
          <span className="cur">_</span>
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Relancer les impayés.</h1>

        <Confirmation />

        {lignes.length === 0 ? (
          <p className="mt-8 text-[15px] text-ink-soft">Tout le monde est à jour. Rien à relancer.</p>
        ) : (
          <>
            <div className="mt-8 border border-line bg-bg-alt px-5 py-5">
              <p className="text-[15px]">
                {lignes.length} impayé{lignes.length > 1 ? "s" : ""} · {eur(totalReste)} à encaisser
              </p>
              <p className="mono mt-1 text-[11px] text-ink-soft">
                {avecEmail.length} avec email
                {sansEmail.length > 0 ? ` · ${sansEmail.length} sans email (à voir en personne)` : ""}
              </p>
              {avecEmail.length > 0 ? (
                <div className="mt-4">
                  <BoutonSimuler
                    libelle={`SIMULER LA RELANCE DES ${avecEmail.length} PAR EMAIL →`}
                    onSimuler={() =>
                      envoyer({ type: "relance/simuler", adhesionIds: avecEmail.map((l) => l.adhesion.id) })
                    }
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-6 border border-line bg-paper">
              {lignes.map((l) => (
                <div
                  key={l.adhesion.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0"
                >
                  <div className="min-w-[200px] flex-1">
                    <div className="text-[15px]">
                      {l.adherent.prenom} {l.adherent.nom}
                    </div>
                    <div className="mono text-[11px] text-ink-soft">
                      {l.cours} · reste {eur(l.reste)}
                      {l.adhesion.derniere_relance ? ` · relancé ${depuis(l.adhesion.derniere_relance)}` : ""}
                    </div>
                  </div>
                  {l.adherent.email ? (
                    <BoutonSimuler
                      libelle={l.adhesion.derniere_relance ? "SIMULER À NOUVEAU" : "SIMULER LA RELANCE"}
                      nomAccessible={`Simuler la relance de ${l.adherent.prenom} ${l.adherent.nom}`}
                      pleineLargeur={false}
                      onSimuler={() => envoyer({ type: "relance/simuler", adhesionIds: [l.adhesion.id] })}
                    />
                  ) : (
                    <span className="mono text-[11px] text-ink-faint">Pas d’email</span>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        <p className="mono mt-6 max-w-prose text-[11px] leading-relaxed text-ink-faint">
          Dans votre club, chaque personne reçoit un email individuel avec son propre montant restant, et
          les réponses arrivent sur l’adresse du club. Ici, rien ne part : le geste se contente de dater
          la relance, comme le fait le produit une fois l’envoi accepté.
        </p>
      </div>
    </main>
  );
}
