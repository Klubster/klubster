"use client";

import { estMineur } from "@/lib/sante";
import { useNaissance } from "./naissance";
import type { AutorisationMineur } from "@/types/form";

/**
 * Autorisations parentales — cases à cocher configurées par le club dans l'Atelier,
 * affichées uniquement quand la date de naissance (bloc Identité) indique un mineur.
 * Une autorisation « obligatoire » bloque la validation tant qu'elle n'est pas cochée
 * (ex. accord pour les premiers soins).
 */
export default function AutorisationsMineur({
  autorisations,
  accent,
}: {
  autorisations: AutorisationMineur[];
  accent: string;
}) {
  const { naissance } = useNaissance();
  if (!naissance || !estMineur(naissance) || autorisations.length === 0) return null;

  return (
    <fieldset>
      <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">
        AUTORISATIONS PARENTALES<span style={{ color: accent }}>_</span>
      </legend>
      <div className="mt-4 divide-y divide-line border border-line bg-paper">
        {autorisations.map((a) => (
          <label key={a.id} className="flex cursor-pointer items-start gap-3 px-5 py-4">
            <input
              type="checkbox"
              name={`autorisation_${a.id}`}
              value="oui"
              required={a.obligatoire}
              className="mt-1"
            />
            <span className="text-[14px] leading-relaxed">
              {a.label}
              {a.obligatoire ? <span style={{ color: accent }}> *</span> : null}
            </span>
          </label>
        ))}
      </div>
      <p className="mono mt-2 text-[11px] text-ink-faint">
        Les autorisations marquées * sont nécessaires pour valider l&apos;inscription.
      </p>
    </fieldset>
  );
}
