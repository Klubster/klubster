"use client";

import { useState } from "react";
import { formatPrix } from "@/lib/format";
import type { Remise } from "@/types/form";

/**
 * Réductions conditionnelles (Pass'Sport…) : l'adhérent coche la remise qui le
 * concerne ; si le club exige un code justificatif, le champ apparaît et devient
 * obligatoire. Le montant réellement dû est TOUJOURS recalculé côté serveur à
 * partir de la configuration du club — jamais depuis le navigateur.
 */
export default function RemisesInscription({ remises, accent }: { remises: Remise[]; accent: string }) {
  const [cochees, setCochees] = useState<Record<string, boolean>>({});
  if (remises.length === 0) return null;

  return (
    <fieldset>
      <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">
        RÉDUCTIONS<span style={{ color: accent }}>_</span>
      </legend>
      <div className="mt-4 divide-y divide-line border border-line bg-paper">
        {remises.map((r) => (
          <div key={r.id} className="px-5 py-4">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                name={`remise_${r.id}`}
                value="oui"
                checked={Boolean(cochees[r.id])}
                onChange={(e) => setCochees((c) => ({ ...c, [r.id]: e.target.checked }))}
                className="mt-1"
              />
              <span className="text-[14px] leading-relaxed">
                {r.label}
                <span className="mono ml-2 text-[12px]" style={{ color: accent }}>
                  −{formatPrix(r.montant_centimes)}
                </span>
                {r.description ? (
                  <span className="mt-1 block text-[12px] text-ink-soft">{r.description}</span>
                ) : null}
              </span>
            </label>
            {r.exigeCode && cochees[r.id] ? (
              <div className="mt-3 pl-7">
                <label htmlFor={`remise_code_${r.id}`} className="mono text-[10px] uppercase tracking-label text-ink-soft">
                  VOTRE CODE {r.label.toUpperCase()} *
                </label>
                <input
                  id={`remise_code_${r.id}`}
                  name={`remise_code_${r.id}`}
                  required
                  spellCheck={false}
                  className="mono mt-1.5 w-full max-w-xs border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <p className="mono mt-2 text-[11px] text-ink-faint">
        La réduction est enregistrée avec votre demande. Le club la déduit après
        vérification du justificatif : vous réglez d’abord le tarif indiqué.
      </p>
    </fieldset>
  );
}
