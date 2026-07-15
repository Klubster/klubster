"use client";

import { estMineur } from "@/lib/sante";
import { useNaissance } from "./naissance";

/**
 * Bloc « Responsable légal » — apparaît dès que la date de naissance (bloc Identité)
 * indique un mineur. Vit hors du questionnaire de santé : l'identité des parents
 * est requise pour tout mineur, que le club ait activé le QS-SPORT ou non.
 */
export default function ResponsableLegal({ accent }: { accent: string }) {
  const { naissance } = useNaissance();
  if (!naissance || !estMineur(naissance)) return null;

  return (
    <fieldset>
      <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">
        RESPONSABLE LÉGAL<span style={{ color: accent }}>_</span>
      </legend>
      <div className="mt-4 border border-line bg-paper px-5 py-4">
        <p className="mono text-[11px] text-ink-faint">
          L&apos;adhérent est mineur : merci de renseigner l&apos;identité d&apos;un parent ou représentant légal.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="resp_qualite" className="mono text-[10px] uppercase tracking-label text-ink-soft">QUALITÉ *</label>
            <select
              id="resp_qualite"
              name="resp_qualite"
              required
              className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            >
              <option value="Père">Père</option>
              <option value="Mère">Mère</option>
              <option value="Tuteur / Tutrice">Tuteur / Tutrice</option>
              <option value="Autre représentant légal">Autre représentant légal</option>
            </select>
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM *</label>
            <input name="resp_prenom" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM *</label>
            <input name="resp_nom" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL *</label>
            <input name="resp_email" type="email" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
          </div>
          <div>
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE *</label>
            <input name="resp_tel" type="tel" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
          </div>
        </div>
      </div>
    </fieldset>
  );
}
