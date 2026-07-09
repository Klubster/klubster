"use client";

import { useState } from "react";
import { ajouterSection } from "@/app/[asso]/edition-actions";

type Layout = "photo-gauche" | "photo-droite" | "triptyque";

const CHAMP = "w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink";
const CHAMP_INACTIF =
  "w-full border border-line bg-bg-alt px-4 py-3 text-ink-faint outline-none cursor-not-allowed";

/**
 * Chapitre « Texte & photo ».
 *
 * La mise en page choisie détermine les champs utiles : avec une photo à gauche, il n'y a
 * qu'une colonne de texte — à droite. Laisser un second champ saisissable, c'est promettre
 * une colonne qui n'existera jamais. On le désactive et on dit pourquoi.
 */
export default function FormulaireTextePhoto({ slug, accent }: { slug: string; accent: string }) {
  const [layout, setLayout] = useState<Layout>("photo-gauche");
  const triptyque = layout === "triptyque";

  // Où le texte se place réellement, selon le côté de la photo.
  const libelleTexte1 = triptyque
    ? "Texte de la colonne de gauche"
    : layout === "photo-gauche"
      ? "Texte (il s’affichera à droite de la photo)"
      : "Texte (il s’affichera à gauche de la photo)";

  return (
    <form action={ajouterSection.bind(null, slug)} className="space-y-5">
      <fieldset>
        <legend className="mono mb-2 text-[11px] uppercase tracking-label text-ink-soft">Mise en page</legend>
        <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
          {(
            [
              ["photo-gauche", "Photo à gauche"],
              ["photo-droite", "Photo à droite"],
              ["triptyque", "Triptyque"],
            ] as [Layout, string][]
          ).map(([valeur, libelle]) => (
            <label
              key={valeur}
              className="flex cursor-pointer items-center gap-3 bg-paper px-4 py-3 text-[14px]"
              style={layout === valeur ? { boxShadow: `inset 2px 0 0 ${accent}` } : undefined}
            >
              <input
                type="radio"
                name="type"
                value={valeur}
                checked={layout === valeur}
                onChange={() => setLayout(valeur)}
              />
              {libelle}
            </label>
          ))}
        </div>
        <p className="mt-2 text-[13px] text-ink-soft">
          {triptyque
            ? "Deux colonnes de texte encadrent la photo."
            : "Une seule colonne de texte accompagne la photo."}
        </p>
      </fieldset>

      <input name="titre" placeholder="Titre (optionnel)" className={CHAMP} />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className="mono block text-[11px] uppercase tracking-label text-ink-soft">{libelleTexte1}</label>
          <textarea name="texte" rows={4} className={`${CHAMP} mt-2`} />
        </div>

        <div aria-hidden={!triptyque}>
          <label
            className={`mono block text-[11px] uppercase tracking-label ${triptyque ? "text-ink-soft" : "text-ink-faint"}`}
          >
            Texte de la colonne de droite
          </label>
          <textarea
            name="texte2"
            rows={4}
            disabled={!triptyque}
            tabIndex={triptyque ? undefined : -1}
            placeholder={triptyque ? "" : "Disponible avec le triptyque"}
            className={`${triptyque ? CHAMP : CHAMP_INACTIF} mt-2`}
          />
          {!triptyque ? (
            <p className="mono mt-2 text-[11px] text-ink-faint">
              Choisissez « Triptyque » pour écrire une seconde colonne.
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <label className="mono text-[11px] uppercase tracking-wider text-ink-soft">
          PHOTO{" "}
          <input
            type="file"
            name="photo"
            accept="image/*"
            required
            className="mono ml-2 text-[12px] normal-case text-ink-soft"
          />
        </label>
        <button
          type="submit"
          className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          AJOUTER LE CHAPITRE →
        </button>
      </div>
    </form>
  );
}
