"use client";

import { useMemo, useState } from "react";
import { lireCsv, deviner, CHAMPS_IMPORT, emailValide, type CleChamp } from "@/lib/csv";
import { importerAdherents, type ResultatImport } from "@/app/[asso]/cockpit/adherents/actions";

type Cours = { id: string; nom: string };

const APERCU = 5;

export default function ImportAdherents({
  slug,
  cours,
  accent,
}: {
  slug: string;
  cours: Cours[];
  accent: string;
}) {
  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignes, setLignes] = useState<string[][]>([]);
  const [corresp, setCorresp] = useState<Record<CleChamp, number>>({} as Record<CleChamp, number>);
  const [coursDefaut, setCoursDefaut] = useState("");
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const [resultat, setResultat] = useState<ResultatImport | null>(null);

  async function choisirFichier(f: File | undefined) {
    setErreurFichier(null);
    setResultat(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErreurFichier("Fichier trop lourd (5 Mo maximum).");
      return;
    }
    // Lu dans le navigateur : les données des adhérents ne transitent pas inutilement.
    const texte = await f.text();
    const { entetes: e, lignes: l } = lireCsv(texte);
    if (e.length === 0 || l.length === 0) {
      setErreurFichier("Ce fichier ne contient pas de tableau lisible. Vérifiez qu’il a une ligne d’en-têtes.");
      return;
    }
    setEntetes(e);
    setLignes(l);
    setCorresp(deviner(e));
  }

  const valeur = (ligne: string[], champ: CleChamp) => {
    const i = corresp[champ];
    return i >= 0 && i < ligne.length ? ligne[i].trim() : "";
  };

  // Contrôles avant import : on préfère refuser que corrompre une base.
  const problemes = useMemo(() => {
    const p: string[] = [];
    if (lignes.length === 0) return p;
    if (corresp.prenom === undefined || corresp.prenom < 0) p.push("La colonne « Prénom » n’est pas associée.");
    if (corresp.nom === undefined || corresp.nom < 0) p.push("La colonne « Nom » n’est pas associée.");

    let sansNom = 0;
    let emailsInvalides = 0;
    for (const l of lignes) {
      if (!valeur(l, "prenom") || !valeur(l, "nom")) sansNom++;
      const e = valeur(l, "email");
      if (e && !emailValide(e)) emailsInvalides++;
    }
    if (sansNom > 0) p.push(`${sansNom} ligne(s) sans prénom ou sans nom seront ignorées.`);
    if (emailsInvalides > 0) p.push(`${emailsInvalides} email(s) semblent invalides — l’adhérent sera créé sans email.`);
    return p;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes, corresp]);

  const bloquant = corresp.prenom === undefined || corresp.prenom < 0 || corresp.nom === undefined || corresp.nom < 0;

  async function lancer() {
    setEnCours(true);
    const parNom = new Map(cours.map((c) => [c.nom.trim().toLowerCase(), c.id]));

    const charge = lignes
      .map((l) => {
        const prenom = valeur(l, "prenom");
        const nom = valeur(l, "nom");
        if (!prenom || !nom) return null;
        const email = valeur(l, "email");
        const nomCours = valeur(l, "cours").toLowerCase();
        return {
          prenom,
          nom,
          email: email && emailValide(email) ? email : null,
          telephone: valeur(l, "telephone") || null,
          coursId: parNom.get(nomCours) ?? coursDefaut ?? null,
        };
      })
      .filter(Boolean) as Parameters<typeof importerAdherents>[1];

    const r = await importerAdherents(slug, charge);
    setResultat(r);
    setEnCours(false);
  }

  if (resultat) {
    return (
      <div className="mt-10 border border-line bg-paper px-6 py-8">
        <p className="text-2xl font-medium">
          {resultat.crees} adhérent{resultat.crees > 1 ? "s" : ""} importé{resultat.crees > 1 ? "s" : ""}.
        </p>
        {resultat.ignores > 0 ? (
          <p className="mt-2 text-[15px] text-ink-soft">
            {resultat.ignores} ligne{resultat.ignores > 1 ? "s" : ""} ignorée{resultat.ignores > 1 ? "s" : ""} —
            doublons ou données incomplètes. Aucune fiche existante n’a été écrasée.
          </p>
        ) : null}
        {resultat.erreurs.length > 0 ? (
          <ul className="mono mt-4 space-y-1 text-[12px]" style={{ color: "#B8860B" }}>
            {resultat.erreurs.slice(0, 8).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        ) : null}
        <a
          href={`/${slug}/cockpit/adherents`}
          className="mono mt-8 inline-block px-6 py-3 text-[12px] text-white"
          style={{ background: accent }}
        >
          VOIR LES ADHÉRENTS →
        </a>
      </div>
    );
  }

  return (
    <div className="mt-10 space-y-10">
      {/* 1 — Fichier */}
      <section>
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">1 — VOTRE FICHIER</p>
        <div className="mt-4 border border-line bg-paper px-5 py-5">
          <input
            type="file"
            accept=".csv,text/csv,text/plain"
            onChange={(e) => choisirFichier(e.target.files?.[0])}
            className="mono text-[12px] text-ink-soft"
          />
          <p className="mono mt-3 text-[11px] text-ink-soft">
            Un fichier CSV, exporté depuis Excel, votre ancien logiciel ou un tableur. Point-virgule ou
            virgule, peu importe. La première ligne doit contenir les noms des colonnes.
          </p>
          {erreurFichier ? (
            <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>
              {erreurFichier}
            </p>
          ) : null}
        </div>
      </section>

      {entetes.length > 0 ? (
        <>
          {/* 2 — Correspondance */}
          <section>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">2 — LES COLONNES</p>
            <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
              Klubster a deviné. Corrigez ce qui ne va pas : à gauche ses champs, à droite les colonnes
              de votre fichier.
            </p>
            <div className="mt-4 border border-line">
              {CHAMPS_IMPORT.map((champ) => (
                <div
                  key={champ.cle}
                  className="grid grid-cols-1 items-center gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-2"
                >
                  <span className="text-[15px]">
                    {champ.label}
                    {champ.requis ? <span style={{ color: accent }}> *</span> : null}
                  </span>
                  <select
                    value={corresp[champ.cle] ?? -1}
                    onChange={(e) => setCorresp((c) => ({ ...c, [champ.cle]: Number(e.target.value) }))}
                    className="border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                  >
                    <option value={-1}>— Ne pas importer —</option>
                    {entetes.map((e, i) => (
                      <option key={i} value={i}>
                        {e || `Colonne ${i + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>

            {cours.length > 0 ? (
              <div className="mt-4 border border-line bg-paper px-5 py-4">
                <label className="mono text-[11px] uppercase tracking-label text-ink-soft">
                  Cours par défaut
                </label>
                <select
                  value={coursDefaut}
                  onChange={(e) => setCoursDefaut(e.target.value)}
                  className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                >
                  <option value="">Aucun</option>
                  {cours.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom}
                    </option>
                  ))}
                </select>
                <p className="mono mt-2 text-[11px] text-ink-soft">
                  Utilisé quand la colonne « Cours » est absente, ou quand son contenu ne correspond à
                  aucun de vos cours. L’adhésion sera créée « en attente ».
                </p>
              </div>
            ) : null}
          </section>

          {/* 3 — Aperçu */}
          <section>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              3 — APERÇU ({lignes.length} ligne{lignes.length > 1 ? "s" : ""})
            </p>
            <div className="mt-4 overflow-x-auto border border-line">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-bg-alt">
                  <tr>
                    {CHAMPS_IMPORT.map((c) => (
                      <th key={c.cle} className="mono px-4 py-3 text-[10px] uppercase tracking-label text-ink-soft">
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lignes.slice(0, APERCU).map((l, i) => (
                    <tr key={i} className="border-t border-line">
                      {CHAMPS_IMPORT.map((c) => (
                        <td key={c.cle} className="px-4 py-3">
                          {valeur(l, c.cle) || <span className="text-ink-faint">—</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {problemes.length > 0 ? (
              <ul className="mono mt-4 space-y-1 text-[12px]" style={{ color: "#B8860B" }}>
                {problemes.map((p, i) => (
                  <li key={i}>⚠ {p}</li>
                ))}
              </ul>
            ) : null}

            <p className="mono mt-6 text-[11px] text-ink-soft">
              Les adhérents déjà présents (même email, ou mêmes prénom et nom) seront ignorés. Aucune
              fiche existante ne sera modifiée.
            </p>

            <button
              onClick={lancer}
              disabled={bloquant || enCours}
              className="mono mt-6 px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              style={{ background: accent }}
            >
              {enCours ? "IMPORT EN COURS…" : `IMPORTER ${lignes.length} LIGNE${lignes.length > 1 ? "S" : ""} →`}
            </button>
          </section>
        </>
      ) : null}
    </div>
  );
}
