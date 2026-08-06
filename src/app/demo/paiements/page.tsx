"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, EnTeteDemo } from "@/components/demo/Simulation";
import { CLUB, eur } from "@/lib/demo/donnees";
import { LIBELLE_MODE, aEncaisser, totauxParMode } from "@/lib/demo/selecteurs";
import type { ModeReglement } from "@/lib/demo/types";

/**
 * LES ENCAISSEMENTS — `cockpit/paiements/page.tsx` et `PaiementsClient.tsx`.
 *
 * CE QUI SURPREND ICI, ET QUI EST DANS LE PRODUIT
 *
 * 1. La liste ne montre QUE les chèques et les espèces
 *    (`.in("mode_paiement", ["cheque","especes"])`). Un impayé en ligne n'y figure pas :
 *    on n'encaisse pas à la main ce qui doit arriver par carte. Il apparaît en revanche
 *    dans les relances, qui ne filtrent pas les modes — deux écrans, deux périmètres,
 *    et c'est voulu.
 * 2. `SOLDE TOTAL` porte sur TOUTES les lignes, jamais sur la sélection.
 * 3. Sans montant saisi, `ENCAISSER` solde la ligne. Le `title` du bouton le dit.
 * 4. Le bloc « encaissé par moyen » est un NET : la ligne « Remboursements » porte des
 *    montants négatifs et se soustrait du total.
 *
 * CE QUE LA DÉMONSTRATION NE REPREND PAS, ET POURQUOI
 * L'export CSV et la relance groupée de cet écran passent par un `mailto:` qui ouvre la
 * messagerie du visiteur. Ouvrir Mail sur un site public n'est pas une démonstration,
 * c'est une intrusion. La relance vit donc sur son propre écran, `/demo/paiements/relances`,
 * exactement comme dans le produit où c'est elle — et elle seule — qui envoie vraiment.
 * Le réglage de saison n'est pas repris non plus : il borne des totaux sur une horloge
 * figée au 20 octobre, il ne changerait rien de visible.
 */

const MODES: { valeur: ModeReglement; libelle: string }[] = [
  { valeur: "especes", libelle: "Espèces" },
  { valeur: "cheque", libelle: "Chèque" },
  { valeur: "autre", libelle: "Autre" },
];

export default function DemoPaiements() {
  const { etat, envoyer } = useDemo();

  const lignes = aEncaisser(etat);
  const totaux = totauxParMode(etat);
  const totalGeneral = totaux.reduce((s, t) => s + t.total, 0);
  const totalSolde = lignes.reduce((s, l) => s + l.reste, 0);

  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [modeLigne, setModeLigne] = useState<Record<string, ModeReglement>>({});
  const [erreur, setErreur] = useState<string | null>(null);

  const nom = (adherentId: string) => {
    const a = etat.adherents.find((x) => x.id === adherentId);
    return a ? `${a.prenom} ${a.nom}` : "Adhérent";
  };
  const coursDe = (id: string | null) => etat.cours.find((c) => c.id === id)?.nom ?? "—";

  const tout = selection.size === lignes.length && lignes.length > 0;
  const basculerTout = () =>
    setSelection(tout ? new Set() : new Set(lignes.map((l) => l.adhesion.id)));
  const basculer = (id: string) =>
    setSelection((s) => {
      const copie = new Set(s);
      if (copie.has(id)) copie.delete(id);
      else copie.add(id);
      return copie;
    });

  const encaisser = (adhesionId: string, reste: number) => {
    const brut = (saisie[adhesionId] ?? "").replace(",", ".").trim();
    const euros = parseFloat(brut);
    // La règle du produit : un montant saisi et valide fait un acompte, sinon on solde.
    const centimes = Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : reste;
    if (centimes <= 0) {
      setErreur("Montant invalide.");
      return;
    }
    setErreur(null);
    const mode = modeLigne[adhesionId] ?? "especes";
    envoyer({
      type: "reglement/ajouter",
      adhesionId,
      montantCentimes: centimes,
      mode,
      // Le champ « Nature » n'existe QUE sur la fiche adhérent. Cet écran-ci envoie
      // `note = null`, y compris pour le mode « Autre » — vérifié dans PaiementsClient,
      // qui appelle `enregistrerReglement` sans quatrième argument.
      note: null,
    });
    // Vider la saisie évite un double encaissement si le bouton est relancé.
    setSaisie((s) => ({ ...s, [adhesionId]: "" }));
  };

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker="TRÉSORERIE · ENCAISSEMENTS" />

      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          RÈGLEMENTS À ENCAISSER — {CLUB.nom}
          <span className="cur">_</span>
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Chèques &amp; espèces.</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
          Encaissez en une ou plusieurs fois : chaque acompte est noté sur la fiche, le solde suit tout
          seul.
        </p>

        <Confirmation />

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/demo/paiements/remise"
            className="mono min-h-[44px] border border-ink px-5 py-3 text-center text-[12px] hover:bg-ink hover:text-paper"
          >
            PRÉPARER UNE REMISE DE CHÈQUES →
          </Link>
          <Link
            href="/demo/paiements/relances"
            className="mono min-h-[44px] border border-ink px-5 py-3 text-center text-[12px] hover:bg-ink hover:text-paper"
          >
            RELANCER LES IMPAYÉS →
          </Link>
        </div>

        {/* ——— Encaissé par moyen ——————————————————————————————————————————— */}
        <section className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ENCAISSÉ PAR MOYEN DE PAIEMENT
            <span className="cur">_</span>
          </p>
          <div className="mt-4 border border-line bg-paper">
            {totaux.map((t) => (
              <div key={t.mode} className="flex items-center justify-between border-b border-line px-5 py-3">
                <span className="text-[15px]">{LIBELLE_MODE[t.mode]}</span>
                <span className="mono text-[14px]">{eur(t.total)}</span>
              </div>
            ))}
            <div className="flex items-center justify-between bg-bg-alt px-5 py-3">
              <span className="mono text-[12px] uppercase tracking-label">Total encaissé</span>
              <span className="mono text-[15px] font-bold">{eur(totalGeneral)}</span>
            </div>
          </div>
          <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Un remboursement porte un montant négatif et a sa propre ligne : le total est donc un net,
            pas la somme de ce qui est entré.
          </p>
        </section>

        {/* ——— À encaisser ————————————————————————————————————————————————— */}
        <section className="mt-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={basculerTout}
              disabled={lignes.length === 0}
              aria-pressed={tout}
              className="mono min-h-[44px] border border-line px-4 py-2.5 text-[11px] hover:border-ink disabled:opacity-40"
            >
              {tout ? "TOUT DÉSÉLECTIONNER" : "TOUT SÉLECTIONNER"}
            </button>
            <span className="mono text-[12px]">SOLDE TOTAL : {eur(totalSolde)}</span>
          </div>

          {erreur ? (
            <p role="alert" className="mono mt-3 text-[12px] text-danger">
              {erreur}
            </p>
          ) : null}

          {lignes.length === 0 ? (
            <p className="mt-6 text-[15px] text-ink-soft">Aucun règlement en attente. Tout est à jour.</p>
          ) : (
            <div className="mt-4 border border-line bg-paper">
              {lignes.map(({ adhesion, reste }) => {
                const regle = adhesion.montant_centimes - reste;
                const mode = modeLigne[adhesion.id] ?? "especes";
                return (
                  <div key={adhesion.id} className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={selection.has(adhesion.id)}
                      onChange={() => basculer(adhesion.id)}
                      aria-label={`Sélectionner ${nom(adhesion.adherent_id)}`}
                      className="h-5 w-5 shrink-0 accent-success"
                    />
                    <div className="min-w-[180px] flex-1">
                      <div className="text-[15px]">
                        {nom(adhesion.adherent_id)}
                        {adhesion.statut === "en_retard" ? (
                          <span className="mono ml-2 text-[10px] uppercase tracking-label text-danger">
                            EN RETARD
                          </span>
                        ) : null}
                      </div>
                      <div className="mono text-[11px] text-ink-soft">
                        {coursDe(adhesion.cours_id)} · {adhesion.mode_paiement === "cheque" ? "Chèque" : "Espèces"}
                        {regle > 0 ? ` · déjà réglé ${eur(regle)}` : ""}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="mono text-[11px] text-ink-faint">{eur(adhesion.montant_centimes)}</div>
                      <div className="mono text-[14px] font-bold">reste {eur(reste)}</div>
                    </div>
                    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
                      <input
                        value={saisie[adhesion.id] ?? ""}
                        onChange={(e) => setSaisie((s) => ({ ...s, [adhesion.id]: e.target.value }))}
                        placeholder="€"
                        inputMode="decimal"
                        aria-label={`Montant reçu de ${nom(adhesion.adherent_id)} — vide pour solder`}
                        title="Montant reçu (acompte possible)"
                        className="w-[84px] border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                      />
                      <select
                        value={mode}
                        onChange={(e) => setModeLigne((m) => ({ ...m, [adhesion.id]: e.target.value as ModeReglement }))}
                        aria-label={`Moyen de paiement de ${nom(adhesion.adherent_id)}`}
                        title="Moyen de paiement"
                        className="min-h-[44px] border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                      >
                        {MODES.map((m) => (
                          <option key={m.valeur} value={m.valeur}>
                            {m.libelle}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => encaisser(adhesion.id, reste)}
                        aria-label={`Encaisser le règlement de ${nom(adhesion.adherent_id)}`}
                        title="Sans montant saisi : encaisse le solde complet"
                        className="mono min-h-[44px] bg-ink px-4 py-2.5 text-[12px] text-paper hover:bg-ink/90"
                      >
                        SIMULER L’ENCAISSEMENT →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Saisissez un montant pour un acompte, ou laissez vide pour encaisser le solde. Les lignes en
            ligne (carte) ne figurent pas ici : elles se règlent toutes seules.
          </p>
        </section>
      </div>
    </main>
  );
}
