"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { marquerChequesRemis } from "../actions";

export interface Cheque {
  id: string;
  prenom: string;
  nom: string;
  cours: string;
  montantCentimes: number;
  recuLe: string; // ISO
}

const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

export default function RemiseClient({
  slug,
  nomClub,
  cheques,
}: {
  slug: string;
  nomClub: string;
  cheques: Cheque[];
}) {
  const router = useRouter();
  // Tout coché par défaut : on remet tout, on décoche les exceptions.
  const [choisis, setChoisis] = useState<Set<string>>(new Set(cheques.map((c) => c.id)));
  const [remis, setRemis] = useState(false);
  const [dateRemise, setDateRemise] = useState<string>("");
  const [enCours, start] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const selection = useMemo(() => cheques.filter((c) => choisis.has(c.id)), [cheques, choisis]);
  const total = useMemo(() => selection.reduce((s, c) => s + c.montantCentimes, 0), [selection]);
  const [marqueId, setMarqueId] = useState<string | null>(null); // ligne en cours de marquage « déjà déposé »

  // Marque un seul chèque « déjà déposé » (déposé à l'ancienne, sans bordereau) : il sort
  // de la liste sans qu'on imprime quoi que ce soit.
  function marquerUn(id: string) {
    setErreur(null);
    setMarqueId(id);
    start(async () => {
      const r = await marquerChequesRemis(slug, [id]);
      if (!r.ok) {
        setErreur(r.error ?? "Erreur.");
        setMarqueId(null);
        return;
      }
      router.refresh();
    });
  }

  function basculer(id: string) {
    setChoisis((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function genererEtImprimer() {
    setErreur(null);
    if (selection.length === 0) {
      setErreur("Cochez au moins un chèque.");
      return;
    }
    start(async () => {
      const r = await marquerChequesRemis(slug, [...choisis]);
      if (!r.ok) {
        setErreur(r.error ?? "Erreur.");
        return;
      }
      setDateRemise(new Date().toLocaleDateString("fr-FR"));
      setRemis(true);
      router.refresh();
      // Laisse le bordereau s'afficher, puis ouvre la boîte d'impression.
      setTimeout(() => window.print(), 400);
    });
  }

  if (cheques.length === 0) {
    return <p className="mt-8 text-[15px] text-ink-soft">Aucun chèque en attente de remise. Tout est déposé.</p>;
  }

  // ——— Bordereau imprimable (après validation) ———
  if (remis) {
    return (
      <div className="mt-8">
        <div className="border border-line bg-paper p-8 print:border-0 print:p-0" id="bordereau">
          <div className="flex items-start justify-between border-b border-line pb-5">
            <div>
              <p className="text-xl font-medium">{nomClub}</p>
              <p className="mono mt-1 text-[12px] text-ink-soft">Bordereau de remise de chèques</p>
            </div>
            <p className="mono text-[12px] text-ink-soft">Le {dateRemise}</p>
          </div>

          <table className="mt-6 w-full text-left text-[13px]">
            <thead>
              <tr className="mono border-b border-line text-[10px] uppercase tracking-label text-ink-soft">
                <th className="py-2">#</th>
                <th className="py-2">Adhérent</th>
                <th className="py-2">Cours</th>
                <th className="py-2 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              {selection.map((c, i) => (
                <tr key={c.id} className="border-b border-line">
                  <td className="py-2 pr-3 text-ink-soft">{i + 1}</td>
                  <td className="py-2">{c.prenom} {c.nom}</td>
                  <td className="py-2 text-ink-soft">{c.cours}</td>
                  <td className="mono py-2 text-right">{eur(c.montantCentimes)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} className="mono py-3 text-right text-[12px] uppercase tracking-label text-ink-soft">
                  {selection.length} chèque{selection.length > 1 ? "s" : ""} · Total
                </td>
                <td className="mono py-3 text-right text-[16px] font-bold">{eur(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <button onClick={() => window.print()} className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90">
            IMPRIMER À NOUVEAU
          </button>
          <a href={`/${slug}/cockpit/paiements`} className="mono border border-line px-6 py-3 text-[12px] hover:border-ink">
            RETOUR AUX ENCAISSEMENTS
          </a>
        </div>
        <p className="mono mt-4 text-[11px] text-ink-faint print:hidden">
          Ces chèques sont désormais marqués « remis » et ne réapparaîtront plus dans cette liste.
        </p>
      </div>
    );
  }

  // ——— Sélection ———
  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => setChoisis(choisis.size === cheques.length ? new Set() : new Set(cheques.map((c) => c.id)))}
          className="mono border border-line px-4 py-2 text-[11px] text-ink-soft hover:border-ink hover:text-ink"
        >
          {choisis.size === cheques.length ? "TOUT DÉCOCHER" : "TOUT COCHER"}
        </button>
        <span className="mono ml-auto text-[12px] text-ink-soft">
          {selection.length} chèque{selection.length > 1 ? "s" : ""} · <span className="font-bold text-ink">{eur(total)}</span>
        </span>
      </div>

      <div className="mt-4 divide-y divide-line border border-line bg-paper">
        {cheques.map((c) => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-alt">
            <label className="flex flex-1 cursor-pointer items-center gap-3">
              <input type="checkbox" checked={choisis.has(c.id)} onChange={() => basculer(c.id)} />
              <span className="min-w-[160px] flex-1 text-[15px] font-medium">
                {c.prenom} {c.nom}
                <span className="mono ml-2 text-[12px] font-normal text-ink-soft">{c.cours}</span>
              </span>
              <span className="mono hidden text-[12px] text-ink-faint sm:inline">
                reçu le {new Date(c.recuLe).toLocaleDateString("fr-FR")}
              </span>
              <span className="mono w-24 text-right text-[14px] font-bold">{eur(c.montantCentimes)}</span>
            </label>
            {/* Sortir un chèque déposé « à l'ancienne », sans lui imprimer de bordereau. */}
            <button
              type="button"
              onClick={() => marquerUn(c.id)}
              disabled={enCours}
              className="mono whitespace-nowrap text-[11px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink disabled:opacity-40"
              title="Marquer ce chèque comme déjà déposé en banque, sans bordereau"
            >
              {marqueId === c.id ? "…" : "déjà déposé"}
            </button>
          </div>
        ))}
      </div>

      {erreur ? <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>{erreur}</p> : null}

      <button
        onClick={genererEtImprimer}
        disabled={enCours || selection.length === 0}
        className="mono mt-6 w-full bg-brand px-6 py-3 text-[12px] text-white hover:opacity-90 disabled:opacity-40 sm:w-auto"
      >
        {enCours ? "GÉNÉRATION…" : `IMPRIMER LA REMISE (${selection.length}) →`}
      </button>
      <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
        Décochez les chèques que vous ne déposez pas encore. À l’impression, les chèques cochés sont marqués « remis ».
        Un chèque déjà déposé sans passer par Klubster ? « Déjà déposé » le sort de la liste, sans bordereau.
      </p>
    </div>
  );
}
