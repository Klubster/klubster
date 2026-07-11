"use client";

import { useState, useTransition } from "react";
import { rembourserEnLigne } from "../actions";

/**
 * Rembourser un paiement en ligne depuis la fiche. Montant vide = remboursement total ;
 * un montant borne un remboursement partiel. L'écriture n'apparaît qu'une fois le
 * remboursement confirmé par Stripe (via le webhook), pour ne jamais compter deux fois.
 */
export default function Remboursement({
  slug,
  adherentId,
  adhesionId,
  montantCentimes,
}: {
  slug: string;
  adherentId: string;
  adhesionId: string;
  montantCentimes: number;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [enCours, start] = useTransition();
  const action = rembourserEnLigne.bind(null, slug, adherentId, adhesionId);
  const eur = (montantCentimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

  if (!ouvert) {
    return (
      <button
        onClick={() => setOuvert(true)}
        className="mono mt-3 text-[12px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
      >
        Rembourser ce paiement en ligne
      </button>
    );
  }

  return (
    <form action={(fd) => start(() => action(fd))} className="mt-3 border border-line bg-bg-alt px-4 py-4">
      <label htmlFor={`montant-${adhesionId}`} className="mono text-[11px] uppercase tracking-label text-ink-soft">
        Montant à rembourser (€)
      </label>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <input
          id={`montant-${adhesionId}`}
          name="montant"
          inputMode="decimal"
          placeholder={`${eur} (total)`}
          className="w-40 border border-line bg-paper px-3 py-2.5 text-[15px] outline-none focus:border-ink"
        />
        <button
          type="submit"
          disabled={enCours}
          className="mono border px-4 py-2.5 text-[12px] disabled:opacity-40"
          style={{ borderColor: "#B23B3B", color: "#B23B3B" }}
        >
          {enCours ? "Remboursement…" : "Confirmer le remboursement"}
        </button>
        <button type="button" onClick={() => setOuvert(false)} className="mono text-[12px] text-ink-soft hover:text-ink">
          annuler
        </button>
      </div>
      <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
        Laissez vide pour rembourser la totalité ({eur} €). L’argent est rendu sur la carte de l’adhérent
        via Stripe ; l’écriture apparaît une fois le remboursement confirmé.
      </p>
    </form>
  );
}
