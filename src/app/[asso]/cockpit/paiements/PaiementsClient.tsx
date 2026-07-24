"use client";
/* Encaissements chèques & espèces : acomptes, solde par ligne, sélection,
   export CSV et relance email des lignes choisies. */
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerReglement } from "./actions";

export interface LignePaiement {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  cours: string;
  mode: string; // cheque | especes
  statut: string; // en_attente | en_retard
  montantCentimes: number;
  regleCentimes: number;
  inscritLe: string; // ISO
}

const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function PaiementsClient({ slug, nomClub, lignes }: { slug: string; nomClub: string; lignes: LignePaiement[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Set<string>>(new Set());
  const [saisie, setSaisie] = useState<Record<string, string>>({});
  const [modeLigne, setModeLigne] = useState<Record<string, "especes" | "cheque" | "autre">>({});
  const [enCours, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  // Mode par défaut d'une ligne : celui déclaré à l'inscription, sinon espèces.
  const modeDe = (l: LignePaiement): "especes" | "cheque" | "autre" =>
    modeLigne[l.id] ?? (l.mode === "cheque" ? "cheque" : l.mode === "autre" ? "autre" : "especes");

  const soldeDe = (l: LignePaiement) => Math.max(l.montantCentimes - l.regleCentimes, 0);
  const totalSolde = useMemo(() => lignes.reduce((s, l) => s + soldeDe(l), 0), [lignes]);
  const cibles = selection.size > 0 ? lignes.filter((l) => selection.has(l.id)) : lignes;

  function basculer(id: string) {
    setSelection((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function encaisser(l: LignePaiement, montantCentimes: number, mode: "cheque" | "especes" | "autre") {
    setErreur(null);
    startTransition(async () => {
      const res = await enregistrerReglement(slug, l.id, montantCentimes, mode);
      if (!res.ok) setErreur(res.error ?? "Erreur.");
      else {
        setSaisie((s) => ({ ...s, [l.id]: "" })); // évite un double encaissement par relance du bouton
        router.refresh();
      }
    });
  }

  function exporterCsv() {
    const lignesCsv = [
      ["Adhérent", "Email", "Cours", "Mode", "Statut", "Montant", "Réglé", "Solde", "Inscrit le"],
      ...cibles.map((l) => [
        `${l.prenom} ${l.nom}`,
        l.email ?? "",
        l.cours,
        l.mode === "cheque" ? "Chèque" : "Espèces",
        l.statut === "en_retard" ? "En retard" : "En attente",
        (l.montantCentimes / 100).toFixed(2).replace(".", ","),
        (l.regleCentimes / 100).toFixed(2).replace(".", ","),
        (soldeDe(l) / 100).toFixed(2).replace(".", ","),
        new Date(l.inscritLe).toLocaleDateString("fr-FR"),
      ]),
    ];
    const csv = lignesCsv.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `reglements-en-attente-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function relancer() {
    const avecEmail = cibles.filter((l) => l.email);
    if (avecEmail.length === 0) {
      setErreur("Aucune adresse email dans la sélection.");
      return;
    }
    const sujet = encodeURIComponent(`${nomClub} — votre cotisation`);
    const corps = encodeURIComponent(
      `Bonjour,\n\nSauf erreur de notre part, votre cotisation reste à régler (tout ou partie).\n` +
        `Vous pouvez remettre votre chèque ou vos espèces au club lors du prochain cours.\n\n` +
        `Sportivement,\n${nomClub}`
    );
    window.location.href = `mailto:?bcc=${encodeURIComponent(avecEmail.map((l) => l.email as string).join(","))}&subject=${sujet}&body=${corps}`;
  }

  return (
    <div>
      {/* Barre d'actions */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setSelection(selection.size === lignes.length ? new Set() : new Set(lignes.map((l) => l.id)))}
          className="mono border border-line px-4 py-2 text-[11px] text-ink-soft hover:border-ink hover:text-ink"
        >
          {selection.size === lignes.length && lignes.length > 0 ? "TOUT DÉSÉLECTIONNER" : "TOUT SÉLECTIONNER"}
        </button>
        <button onClick={relancer} disabled={lignes.length === 0} className="mono border border-ink px-4 py-2 text-[11px] hover:bg-ink hover:text-paper disabled:opacity-30">
          RELANCER {selection.size > 0 ? `LA SÉLECTION (${selection.size})` : "TOUT"} →
        </button>
        <button onClick={exporterCsv} disabled={lignes.length === 0} className="mono border border-ink px-4 py-2 text-[11px] hover:bg-ink hover:text-paper disabled:opacity-30">
          EXPORTER CSV {selection.size > 0 ? `(${selection.size})` : ""}
        </button>
        {/* Sur téléphone, le total prend sa propre ligne au lieu de se coincer
            entre deux boutons ; à partir de sm il reprend sa place à droite. */}
        <span className="mono w-full text-[12px] text-ink-soft sm:ml-auto sm:w-auto">
          SOLDE TOTAL : <span className="font-bold text-ink">{eur(totalSolde)}</span>
        </span>
      </div>
      {erreur ? <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>{erreur}</p> : null}

      {/* Lignes */}
      <div className="mt-6 divide-y divide-line border border-line bg-paper">
        {lignes.length === 0 ? (
          <p className="px-5 py-6 text-[15px] text-ink-soft">Aucun règlement en attente. Tout est à jour.</p>
        ) : null}
        {lignes.map((l) => {
          const solde = soldeDe(l);
          return (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-4 py-4">
              <input type="checkbox" checked={selection.has(l.id)} onChange={() => basculer(l.id)} />
              <div className="min-w-[160px] flex-1">
                <div className="text-[15px] font-medium">
                  {l.prenom} {l.nom}
                  {l.statut === "en_retard" ? (
                    <span className="mono ml-2 text-[10px] uppercase tracking-wider" style={{ color: "#B23B3B" }}>EN RETARD</span>
                  ) : null}
                </div>
                <div className="text-[13px] text-ink-soft">
                  {l.cours} · {l.mode === "cheque" ? "Chèque" : "Espèces"}
                  {l.regleCentimes > 0 ? (
                    <span className="mono"> · déjà réglé {eur(l.regleCentimes)}</span>
                  ) : null}
                </div>
              </div>
              <div className="mono text-right text-[13px]">
                <div className="text-ink-faint">{eur(l.montantCentimes)}</div>
                <div className="text-[15px] font-bold">reste {eur(solde)}</div>
              </div>
              {/* Les commandes d'encaissement occupent leur propre ligne sur mobile :
                  mêlées au nom et aux montants, elles wrappaient n'importe où. */}
              <div className="flex w-full items-center gap-2 sm:w-auto">
                <input
                  value={saisie[l.id] ?? ""}
                  onChange={(e) => setSaisie((s) => ({ ...s, [l.id]: e.target.value }))}
                  placeholder="€"
                  inputMode="decimal"
                  className="mono w-20 border border-line bg-paper px-2 py-3 text-right text-[13px] outline-none focus:border-ink"
                  title="Montant reçu (acompte possible)"
                />
                <select
                  value={modeDe(l)}
                  onChange={(e) => setModeLigne((m) => ({ ...m, [l.id]: e.target.value as "especes" | "cheque" | "autre" }))}
                  className="border border-line bg-paper px-2 py-3 text-[12px] outline-none focus:border-ink"
                  title="Moyen de paiement"
                >
                  <option value="especes">Espèces</option>
                  <option value="cheque">Chèque</option>
                  <option value="autre">Autre</option>
                </select>
                <button
                  disabled={enCours}
                  onClick={() => {
                    const euros = parseFloat((saisie[l.id] ?? "").replace(",", "."));
                    const centimes = Number.isFinite(euros) && euros > 0 ? Math.round(euros * 100) : solde;
                    encaisser(l, centimes, modeDe(l));
                  }}
                  /* py-3 et non py-2 : cet encaissement se fait debout, au bord du tapis,
                     sur un téléphone — une cible de 30 px se rate une fois sur trois.
                     flex-1 mobile : le bouton prend la largeur restante, cible franche. */
                  className="mono flex-1 border border-ink px-4 py-3 text-[11px] hover:bg-ink hover:text-paper disabled:opacity-40 sm:flex-none"
                  title="Sans montant saisi : encaisse le solde complet"
                >
                  ENCAISSER →
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mono mt-3 text-[11px] text-ink-faint">
        Saisissez un montant pour un acompte, ou laissez vide pour encaisser le solde. La relance ouvre
        votre logiciel email avec les adhérents en copie cachée.
      </p>
    </div>
  );
}
