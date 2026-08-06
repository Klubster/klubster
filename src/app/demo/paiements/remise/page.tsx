"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, EnTeteDemo } from "@/components/demo/Simulation";
import { AUJOURDHUI, CLUB, eur } from "@/lib/demo/donnees";
import { chequesARemettre } from "@/lib/demo/selecteurs";

/**
 * LA REMISE DE CHÈQUES — `cockpit/paiements/remise/`.
 *
 * TOUT EST COCHÉ AU DÉPART, et ce n'est pas une facilité : on remet tout, on décoche les
 * exceptions. Le commentaire du produit le dit dans ces termes.
 *
 * CE QUE LE PRODUIT NE DEMANDE JAMAIS — vérifié champ par champ dans `RemiseClient.tsx` :
 * ni banque, ni numéro de chèque, ni date d'émission, ni nom du tireur, ni numéro de
 * bordereau. Rien de tout cela n'existe en base non plus : `reglements` porte un montant,
 * un mode, une note, une date de réception et une date de remise. Un bordereau qui
 * réclamerait le numéro du chèque serait une invention, et le club n'a pas cette
 * information sous la main au moment où il prépare sa remise.
 *
 * L'ORDRE DES GESTES EST CONTRE-INTUITIF, ET IL EST REPRIS TEL QUEL : les chèques sont
 * marqués « remis » AVANT que le bordereau ne s'affiche. Dans le produit, annuler la
 * boîte d'impression ne rétablit rien.
 *
 * Le bordereau se laisse imprimer par le navigateur (`print:` de Tailwind, comme le
 * produit). Rien n'est transmis à une banque, et l'écran le dit.
 */

export default function DemoRemise() {
  const { etat, envoyer } = useDemo();

  const cheques = chequesARemettre(etat).map((r) => {
    const adhesion = etat.adhesions.find((a) => a.id === r.adhesion_id);
    const adherent = etat.adherents.find((a) => a.id === adhesion?.adherent_id);
    return {
      id: r.id,
      montant: r.montant_centimes,
      recuLe: r.created_at,
      nom: adherent ? `${adherent.prenom} ${adherent.nom}` : "Adhérent",
      cours: etat.cours.find((c) => c.id === adhesion?.cours_id)?.nom ?? "—",
    };
  });

  // Tout coché par défaut. La clé sur la liste des identifiants remet la sélection à
  // plat quand la liste change — après une remise, ou après « RÉINITIALISER ».
  const [choisis, setChoisis] = useState<Set<string>>(() => new Set(cheques.map((c) => c.id)));
  const [bordereau, setBordereau] = useState<typeof cheques | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const selection = cheques.filter((c) => choisis.has(c.id));
  const total = selection.reduce((s, c) => s + c.montant, 0);
  const tout = choisis.size === cheques.length && cheques.length > 0;

  const remettre = () => {
    if (selection.length === 0) {
      setErreur("Cochez au moins un chèque.");
      return;
    }
    setErreur(null);
    // Le bordereau est figé AVANT l'envoi : une fois les chèques marqués remis, ils
    // sortent de `chequesARemettre` et la liste dans laquelle je les lirais serait vide.
    setBordereau(selection);
    setChoisis(new Set());
    envoyer({ type: "cheques/remettre", ids: selection.map((c) => c.id) });
  };

  const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" });

  if (bordereau) {
    const totalBordereau = bordereau.reduce((s, c) => s + c.montant, 0);
    return (
      <main className="min-h-screen text-ink">
        <div className="print:hidden">
          <EnTeteDemo retour="/demo/paiements" libelleRetour="← ENCAISSEMENTS" kicker="REMISE DE CHÈQUES" />
        </div>

        <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
          <div id="bordereau" className="border border-line bg-paper p-6 print:border-0 print:p-0">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line pb-4">
              <div>
                <div className="text-xl font-medium">{CLUB.nom}</div>
                <div className="text-[14px] text-ink-soft">Bordereau de remise de chèques</div>
              </div>
              <div className="mono text-[12px]">Le {dateFr(AUJOURDHUI)}</div>
            </div>

            <table className="mt-5 w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-line">
                  <th scope="col" className="mono py-2 text-[10px] uppercase tracking-label text-ink-soft">#</th>
                  <th scope="col" className="mono py-2 text-[10px] uppercase tracking-label text-ink-soft">Adhérent</th>
                  <th scope="col" className="mono py-2 text-[10px] uppercase tracking-label text-ink-soft">Cours</th>
                  <th scope="col" className="mono py-2 text-right text-[10px] uppercase tracking-label text-ink-soft">
                    Montant
                  </th>
                </tr>
              </thead>
              <tbody>
                {bordereau.map((c, i) => (
                  <tr key={c.id} className="border-b border-line">
                    <td className="py-2">{i + 1}</td>
                    <td className="py-2">{c.nom}</td>
                    <td className="py-2">{c.cours}</td>
                    <td className="py-2 text-right">{eur(c.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="mono py-3 text-[12px]">
                    {bordereau.length} chèque{bordereau.length > 1 ? "s" : ""} · Total
                  </td>
                  <td className="py-3 text-right text-[16px] font-bold">{eur(totalBordereau)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 print:hidden">
            <button
              type="button"
              onClick={() => window.print()}
              className="mono min-h-[44px] bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90"
            >
              IMPRIMER CE BORDEREAU
            </button>
            <Link
              href="/demo/paiements"
              className="mono min-h-[44px] border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
            >
              RETOUR AUX ENCAISSEMENTS
            </Link>
          </div>
          <p className="mono mt-5 max-w-prose text-[11px] leading-relaxed text-ink-faint print:hidden">
            Ces chèques sont désormais marqués « remis » et ne réapparaîtront plus dans cette liste. Rien
            n’a été transmis à une banque : l’impression est celle de votre navigateur.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/paiements" libelleRetour="← ENCAISSEMENTS" kicker="REMISE DE CHÈQUES" />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          BORDEREAU DE REMISE — {CLUB.nom}
          <span className="cur">_</span>
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Préparer une remise.</h1>
        <p className="mt-4 max-w-prose text-lg leading-relaxed text-ink-soft">
          Voici les chèques encaissés qui n’ont pas encore été déposés en banque. Décochez ceux que vous
          gardez pour plus tard, puis imprimez le bordereau à joindre à votre remise.
        </p>

        {cheques.length === 0 ? (
          <p className="mt-8 text-[15px] text-ink-soft">
            Aucun chèque en attente de remise. Tout est déposé.
          </p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                aria-pressed={tout}
                onClick={() => setChoisis(tout ? new Set() : new Set(cheques.map((c) => c.id)))}
                className="mono min-h-[44px] border border-line px-4 py-2.5 text-[11px] hover:border-ink"
              >
                {tout ? "TOUT DÉCOCHER" : "TOUT COCHER"}
              </button>
              <span className="mono text-[12px]">
                {selection.length} chèque{selection.length > 1 ? "s" : ""} · {eur(total)}
              </span>
            </div>

            <div className="mt-4 border border-line bg-paper">
              {cheques.map((c) => (
                <label
                  key={c.id}
                  className="flex cursor-pointer flex-wrap items-center gap-4 border-b border-line px-5 py-4 last:border-b-0"
                >
                  <input
                    type="checkbox"
                    checked={choisis.has(c.id)}
                    onChange={() =>
                      setChoisis((s) => {
                        const copie = new Set(s);
                        if (copie.has(c.id)) copie.delete(c.id);
                        else copie.add(c.id);
                        return copie;
                      })
                    }
                    className="h-5 w-5 shrink-0 accent-success"
                  />
                  <div className="min-w-[160px] flex-1">
                    <div className="text-[15px]">{c.nom}</div>
                    <div className="mono text-[11px] text-ink-soft">{c.cours}</div>
                  </div>
                  <div className="mono hidden text-[11px] text-ink-faint sm:block">reçu le {dateFr(c.recuLe)}</div>
                  <div className="mono text-[14px]">{eur(c.montant)}</div>
                </label>
              ))}
            </div>

            {erreur ? (
              <p role="alert" className="mono mt-3 text-[12px] text-danger">
                {erreur}
              </p>
            ) : null}

            <div className="mt-6">
              <BoutonSimuler
                libelle={`SIMULER LA REMISE (${selection.length}) →`}
                onSimuler={remettre}
                desactive={selection.length === 0}
              />
            </div>

            <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
              Décochez les chèques que vous ne déposez pas encore. Les chèques cochés sont marqués
              « remis » au moment où le bordereau s’affiche — comme dans le produit, où annuler
              l’impression ne les rétablit pas.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
