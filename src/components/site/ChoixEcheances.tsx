"use client";

import { useEffect, useState } from "react";

/**
 * Choix du nombre de mensualités par l'adhérent, dans la limite fixée par le club.
 *
 * On affiche le montant exact de chaque prélèvement : « 3 × 53,34 € » est plus rassurant
 * qu'un « paiement en 3 fois » abstrait, surtout pour un parent qui compte.
 */
export default function ChoixEcheances({
  echeancesMax,
  tarifInitialCentimes,
  accent,
}: {
  echeancesMax: number;
  tarifInitialCentimes: number;
  accent: string;
}) {
  const [mode, setMode] = useState<"comptant" | "echeances">("comptant");
  const [n, setN] = useState(Math.min(3, echeancesMax));
  const [tarifCentimes, setTarif] = useState(tarifInitialCentimes);

  // Le tarif dépend du cours choisi : on suit le <select> plutôt que d'afficher un montant faux.
  useEffect(() => {
    const select = document.querySelector<HTMLSelectElement>('select[name="cours"]');
    if (!select) return;
    const lire = () => {
      const opt = select.selectedOptions[0];
      const t = Number(opt?.dataset.tarif);
      if (Number.isFinite(t) && t > 0) setTarif(t);
    };
    lire();
    select.addEventListener("change", lire);
    return () => select.removeEventListener("change", lire);
  }, []);

  if (echeancesMax < 2) return null;

  // Même répartition que côté serveur : le reliquat d'arrondi part sur la première.
  const base = Math.floor(tarifCentimes / n);
  const premiere = base + (tarifCentimes - base * n);
  const euros = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  return (
    <div className="border-t border-line bg-paper px-5 py-4">
      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="radio"
          name="mode"
          value="en_ligne_echeances"
          checked={mode === "echeances"}
          onChange={() => setMode("echeances")}
          className="mt-1"
        />
        <span>
          <span className="block text-[15px]">En ligne — plusieurs fois</span>
          <span className="mono block text-[11px] text-ink-soft">
            Prélèvement automatique, un par mois.
          </span>
        </span>
      </label>

      {mode === "echeances" ? (
        <div className="mt-4 pl-7">
          <label className="mono block text-[11px] uppercase tracking-label text-ink-soft">
            Nombre de mensualités
          </label>
          <div className="mt-2 flex flex-wrap gap-px border border-line bg-line">
            {Array.from({ length: echeancesMax - 1 }, (_, i) => i + 2).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setN(v)}
                className="mono min-w-[44px] bg-paper px-3 py-2 text-[13px]"
                style={n === v ? { background: accent, color: "white" } : undefined}
                aria-pressed={n === v}
              >
                {v}
              </button>
            ))}
          </div>

          <input type="hidden" name="echeances" value={n} />

          <p className="mt-3 text-[14px] text-ink">
            {premiere === base ? (
              <>
                {n} × <strong>{euros(base)} €</strong>
              </>
            ) : (
              <>
                1 × <strong>{euros(premiere)} €</strong>, puis {n - 1} × <strong>{euros(base)} €</strong>
              </>
            )}
          </p>
          <p className="mono mt-1 text-[11px] text-ink-soft">
            Premier prélèvement aujourd’hui, les suivants chaque mois.
          </p>
        </div>
      ) : null}
    </div>
  );
}
