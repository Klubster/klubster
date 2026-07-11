"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { enregistrerReglement } from "@/app/[asso]/cockpit/paiements/actions";

export interface AdhesionSolde {
  id: string;
  cours: string;
  resteCentimes: number;
}

const euros = (c: number) => (c / 100).toFixed(2).replace(".", ",");

/**
 * Encaisser un règlement directement depuis la fiche : « il me tend 30 € en espèces ».
 * Le montant est pré-rempli avec le solde (un clic pour solder), modifiable pour un acompte.
 */
export default function AjoutReglement({
  slug,
  adhesions,
  accent,
}: {
  slug: string;
  adhesions: AdhesionSolde[];
  accent: string;
}) {
  const router = useRouter();
  const dues = adhesions.filter((a) => a.resteCentimes > 0);
  const [adhesionId, setAdhesionId] = useState(dues[0]?.id ?? "");
  const active = dues.find((a) => a.id === adhesionId) ?? dues[0];
  const [montant, setMontant] = useState(active ? euros(active.resteCentimes) : "");
  const [mode, setMode] = useState<"especes" | "cheque" | "autre">("especes");
  const [libelle, setLibelle] = useState(""); // pour « autre » : chèque vacances, aide CAF…
  const [etat, setEtat] = useState<"repos" | "ok">("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, start] = useTransition();

  if (dues.length === 0) return null;

  function changerAdhesion(id: string) {
    setAdhesionId(id);
    const a = dues.find((x) => x.id === id);
    if (a) setMontant(euros(a.resteCentimes));
  }

  function enregistrer() {
    setErreur(null);
    const val = parseFloat((montant || "").replace(",", "."));
    const centimes = Number.isFinite(val) && val > 0 ? Math.round(val * 100) : 0;
    if (centimes <= 0) {
      setErreur("Indiquez un montant.");
      return;
    }
    // Pour « autre », le libellé (chèque vacances, aide…) est conservé en note.
    const note = mode === "autre" ? libelle.trim() || "Autre" : null;
    start(async () => {
      const r = await enregistrerReglement(slug, adhesionId, centimes, mode, note);
      if (!r.ok) {
        setErreur(r.error ?? "Enregistrement impossible.");
        return;
      }
      setEtat("ok");
      router.refresh();
      setTimeout(() => setEtat("repos"), 2500);
    });
  }

  return (
    <div className="mt-4 border border-line bg-paper px-5 py-5">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        ENREGISTRER UN RÈGLEMENT<span className="text-brand">_</span>
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {dues.length > 1 ? (
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Adhésion</span>
            <select
              value={adhesionId}
              onChange={(e) => changerAdhesion(e.target.value)}
              className="mt-1.5 block border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            >
              {dues.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.cours} — reste {euros(a.resteCentimes)} €
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <label className="block w-[110px]">
          <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Montant (€)</span>
          <input
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            inputMode="decimal"
            className="mono mt-1.5 w-full border border-line bg-paper px-3 py-2.5 text-right outline-none focus:border-ink"
          />
        </label>

        <div>
          <span className="mono block text-[10px] uppercase tracking-label text-ink-soft">Reçu en</span>
          <div className="mt-1.5 flex border border-line">
            {(["especes", "cheque", "autre"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`mono px-4 py-2.5 text-[12px] ${mode === m ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"}`}
              >
                {m === "especes" ? "Espèces" : m === "cheque" ? "Chèque" : "Autre"}
              </button>
            ))}
          </div>
        </div>

        {mode === "autre" ? (
          <label className="block">
            <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Nature</span>
            <input
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Chèque vacances, aide CAF…"
              className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 text-[14px] outline-none focus:border-ink"
            />
          </label>
        ) : null}

        <button
          onClick={enregistrer}
          disabled={enCours}
          className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: accent }}
        >
          {enCours ? "…" : etat === "ok" ? "ENREGISTRÉ ✓" : "ENREGISTRER"}
        </button>
      </div>

      {erreur ? (
        <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>
          {erreur}
        </p>
      ) : null}
      <p className="mono mt-3 text-[11px] text-ink-faint">
        Le solde est pré-rempli. Changez-le pour un acompte ; l’adhésion passe « payé » quand tout est réglé.
      </p>
    </div>
  );
}
