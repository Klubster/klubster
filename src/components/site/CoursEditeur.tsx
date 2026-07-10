"use client";

import { useState } from "react";
import { enregistrerCours, supprimerCours } from "@/app/[asso]/cockpit/cours/actions";
import type { Creneau } from "@/types/db";

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export interface CoursLigne {
  id: string;
  nom: string;
  public_cible: string | null;
  tarif_centimes: number;
  creneaux: Creneau[];
  adherents: number;
}

const euros = (centimes: number) => (centimes / 100).toFixed(2).replace(".", ",");

export default function CoursEditeur({
  slug,
  cours,
  accent,
}: {
  slug: string;
  cours: CoursLigne;
  accent: string;
}) {
  const [nom, setNom] = useState(cours.nom);
  const [cible, setCible] = useState(cours.public_cible ?? "");
  const [tarif, setTarif] = useState(euros(cours.tarif_centimes));
  const [creneaux, setCreneaux] = useState<Creneau[]>(cours.creneaux ?? []);
  const [etat, setEtat] = useState<"repos" | "envoi" | "ok">("repos");
  const [erreur, setErreur] = useState<string | null>(null);
  const [confirme, setConfirme] = useState(false);

  const majCreneau = (i: number, champ: keyof Creneau, valeur: string) =>
    setCreneaux((cs) => cs.map((c, j) => (j === i ? { ...c, [champ]: valeur } : c)));

  async function enregistrer() {
    setEtat("envoi");
    setErreur(null);
    const r = await enregistrerCours(slug, cours.id, {
      nom,
      public_cible: cible,
      tarif_centimes: Math.round(Number(tarif.replace(",", ".")) * 100) || 0,
      creneaux,
    });
    if (r?.erreur) {
      setErreur(r.erreur);
      setEtat("repos");
      return;
    }
    setEtat("ok");
    setTimeout(() => setEtat("repos"), 2000);
  }

  async function supprimer() {
    setErreur(null);
    const r = await supprimerCours(slug, cours.id);
    if (r?.erreur) {
      setErreur(r.erreur);
      setConfirme(false);
    }
  }

  return (
    <div className="border border-line bg-paper px-5 py-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_140px]">
        <label className="block">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">Nom du cours</span>
          <input
            value={nom}
            onChange={(e) => setNom(e.target.value)}
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">Public (facultatif)</span>
          <input
            value={cible}
            onChange={(e) => setCible(e.target.value)}
            placeholder="Ados, adultes, débutants…"
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />
        </label>
        <label className="block">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">Tarif (€)</span>
          <input
            value={tarif}
            onChange={(e) => setTarif(e.target.value)}
            inputMode="decimal"
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />
        </label>
      </div>

      <p className="mono mt-6 text-[11px] uppercase tracking-label text-ink-soft">Créneaux</p>
      <div className="mt-2 space-y-2">
        {creneaux.length === 0 ? (
          <p className="text-[14px] text-ink-faint">Aucun créneau. Le cours s’affichera sans horaire.</p>
        ) : null}
        {creneaux.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={c.jour}
              onChange={(e) => majCreneau(i, "jour", e.target.value)}
              className="border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            >
              {JOURS.map((j) => (
                <option key={j} value={j}>
                  {j.charAt(0).toUpperCase() + j.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={c.debut}
              onChange={(e) => majCreneau(i, "debut", e.target.value)}
              className="border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            />
            <span className="text-ink-faint">→</span>
            <input
              type="time"
              value={c.fin}
              onChange={(e) => majCreneau(i, "fin", e.target.value)}
              className="border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            />
            <input
              value={c.note ?? ""}
              onChange={(e) => majCreneau(i, "note", e.target.value)}
              placeholder="précision (8-12 ans…)"
              className="min-w-[150px] flex-1 border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
            />
            <button
              onClick={() => setCreneaux((cs) => cs.filter((_, j) => j !== i))}
              className="mono px-2 py-2 text-[12px] text-ink-soft hover:text-ink"
              aria-label="Retirer ce créneau"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => setCreneaux((cs) => [...cs, { jour: "lundi", debut: "18:00", fin: "19:30" }])}
          className="mono border border-line px-4 py-2 text-[12px] hover:border-ink"
        >
          + AJOUTER UN CRÉNEAU
        </button>
      </div>

      {erreur ? (
        <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>
          {erreur}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <button
          onClick={enregistrer}
          disabled={etat === "envoi"}
          className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{ background: accent }}
        >
          {etat === "envoi" ? "ENREGISTREMENT…" : etat === "ok" ? "ENREGISTRÉ ✓" : "ENREGISTRER"}
        </button>

        {/* La suppression est refusée côté serveur si des adhérents sont inscrits ;
            on le dit ici avant même le clic, plutôt que de faire espérer. */}
        {cours.adherents > 0 ? (
          <span className="mono text-[11px] text-ink-faint">
            {cours.adherents} adhérent{cours.adherents > 1 ? "s" : ""} — suppression impossible
          </span>
        ) : confirme ? (
          <span className="flex items-center gap-3">
            <span className="mono text-[11px] text-ink-soft">Supprimer définitivement ?</span>
            <button onClick={supprimer} className="mono text-[12px]" style={{ color: "#B23B3B" }}>
              OUI
            </button>
            <button onClick={() => setConfirme(false)} className="mono text-[12px] text-ink-soft">
              non
            </button>
          </span>
        ) : (
          <button onClick={() => setConfirme(true)} className="mono text-[12px] text-ink-soft hover:text-ink">
            Supprimer ce cours
          </button>
        )}
      </div>
    </div>
  );
}
