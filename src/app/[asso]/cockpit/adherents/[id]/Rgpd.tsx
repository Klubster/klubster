"use client";

import { useState, useTransition } from "react";
import { anonymiserAdherent } from "../actions";

export default function Rgpd({
  slug,
  adherentId,
  nom,
  estPresident,
}: {
  slug: string;
  adherentId: string;
  nom: string;
  estPresident: boolean;
}) {
  const [confirme, setConfirme] = useState(false);
  const [enCours, start] = useTransition();

  return (
    <section className="mt-14">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">DONNÉES PERSONNELLES · RGPD<span className="cur">_</span></p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href={`/${slug}/cockpit/adherents/${adherentId}/rgpd`}
          className="mono border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
        >
          EXPORTER SES DONNÉES →
        </a>

        {estPresident ? (
          confirme ? (
            <span className="flex items-center gap-3">
              <span className="mono text-[11px] text-ink-soft">Anonymiser définitivement {nom} ?</span>
              <button
                onClick={() => start(() => anonymiserAdherent(slug, adherentId))}
                disabled={enCours}
                className="mono text-[12px] disabled:opacity-40"
                style={{ color: "#B23B3B" }}
              >
                {enCours ? "…" : "OUI, ANONYMISER"}
              </button>
              <button onClick={() => setConfirme(false)} className="mono text-[12px] text-ink-soft">annuler</button>
            </span>
          ) : (
            <button
              onClick={() => setConfirme(true)}
              className="mono text-[12px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
            >
              Anonymiser (droit à l’effacement)
            </button>
          )
        ) : null}
      </div>
      <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
        L’export réunit toutes les données de l’adhérent en un fichier. L’anonymisation efface ses données
        personnelles et de santé, mais conserve les écritures comptables (obligation légale). Irréversible.
      </p>
    </section>
  );
}
