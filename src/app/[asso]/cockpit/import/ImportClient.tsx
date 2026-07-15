"use client";

import { useState } from "react";
import Link from "next/link";
import { importerAdherents, type LigneImport } from "./actions";

function Cur() {
  return <span className="cur">_</span>;
}

/** Champs cibles proposés pour la correspondance des colonnes. */
const CIBLES = [
  { id: "ignorer", label: "— Ignorer cette colonne —" },
  { id: "prenom", label: "Prénom" },
  { id: "nom", label: "Nom" },
  { id: "email", label: "Email" },
  { id: "telephone", label: "Téléphone" },
  { id: "adresse", label: "Adresse" },
  { id: "date_naissance", label: "Date de naissance" },
  { id: "autre", label: "Garder telle quelle (champ libre)" },
] as const;
type CibleId = (typeof CIBLES)[number]["id"];

/** Parser CSV minimal : guillemets, séparateur détecté (; , ou tabulation). */
function parseCsv(texte: string): { entetes: string[]; lignes: string[][] } {
  const premiereLigne = texte.slice(0, texte.indexOf("\n") === -1 ? texte.length : texte.indexOf("\n"));
  const sep = [";", ",", "\t"].reduce((best, s) =>
    premiereLigne.split(s).length > premiereLigne.split(best).length ? s : best
  );
  const lignes: string[][] = [];
  let ligne: string[] = [];
  let champ = "";
  let entreGuillemets = false;
  for (let i = 0; i < texte.length; i++) {
    const c = texte[i];
    if (entreGuillemets) {
      if (c === '"' && texte[i + 1] === '"') {
        champ += '"';
        i++;
      } else if (c === '"') {
        entreGuillemets = false;
      } else {
        champ += c;
      }
    } else if (c === '"') {
      entreGuillemets = true;
    } else if (c === sep) {
      ligne.push(champ);
      champ = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texte[i + 1] === "\n") i++;
      ligne.push(champ);
      champ = "";
      if (ligne.some((x) => x.trim() !== "")) lignes.push(ligne);
      ligne = [];
    } else {
      champ += c;
    }
  }
  ligne.push(champ);
  if (ligne.some((x) => x.trim() !== "")) lignes.push(ligne);
  const entetes = (lignes.shift() ?? []).map((e) => e.trim());
  return { entetes, lignes };
}

/** Devine la cible d'une colonne d'après son intitulé. */
function devinerCible(entete: string): CibleId {
  const e = entete
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (/prenom|first/.test(e)) return "prenom";
  if (/^nom$|nom de famille|last|famille/.test(e)) return "nom";
  if (/mail/.test(e)) return "email";
  if (/tel|phone|portable|mobile/.test(e)) return "telephone";
  if (/adresse|address|rue|domicile/.test(e)) return "adresse";
  if (/naissance|birth|ne\(e\)|nee?s? le/.test(e)) return "date_naissance";
  return "autre";
}

/** JJ/MM/AAAA (ou JJ-MM-AAAA) → AAAA-MM-JJ ; laisse AAAA-MM-JJ tel quel. */
function normaliserDate(v: string): string {
  const t = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
  const m = t.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return "";
}

export default function ImportClient({ slug, nom }: { slug: string; nom: string }) {
  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignes, setLignes] = useState<string[][]>([]);
  const [cibles, setCibles] = useState<CibleId[]>([]);
  const [nomFichier, setNomFichier] = useState<string | null>(null);
  const [etat, setEtat] = useState<"idle" | "envoi" | "fini">("idle");
  const [resultat, setResultat] = useState<{ importes?: number; ignores?: number; error?: string } | null>(null);

  async function lireFichier(f: File | null) {
    if (!f) return;
    setResultat(null);
    setEtat("idle");
    const texte = await f.text();
    const { entetes: e, lignes: l } = parseCsv(texte);
    setEntetes(e);
    setLignes(l);
    setCibles(e.map(devinerCible));
    setNomFichier(f.name);
  }

  const aPrenom = cibles.includes("prenom");
  const aNom = cibles.includes("nom");
  const pret = entetes.length > 0 && aPrenom && aNom && lignes.length > 0;

  function construireLignes(): LigneImport[] {
    return lignes.map((l) => {
      const ligne: LigneImport = { prenom: "", nom: "", infos: {} };
      cibles.forEach((cible, i) => {
        const v = (l[i] ?? "").trim();
        if (!v || cible === "ignorer") return;
        if (cible === "prenom") ligne.prenom = v;
        else if (cible === "nom") ligne.nom = v;
        else if (cible === "email") ligne.email = v;
        else if (cible === "telephone") ligne.telephone = v;
        else if (cible === "date_naissance") {
          const d = normaliserDate(v);
          if (d) ligne.date_naissance = d;
          else ligne.infos![entetes[i] || "Date de naissance"] = v;
        } else if (cible === "adresse") ligne.infos!["Adresse"] = v;
        else ligne.infos![entetes[i] || `Colonne ${i + 1}`] = v;
      });
      return ligne;
    });
  }

  async function lancerImport() {
    setEtat("envoi");
    const r = await importerAdherents(slug, construireLignes());
    setResultat(r);
    setEtat("fini");
  }

  const apercu = lignes.slice(0, 5);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">IMPORT<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">IMPORT — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Vos adhérents, depuis votre tableur.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Exportez votre fichier en CSV, faites correspondre les colonnes, vérifiez l&apos;aperçu :
          rien n&apos;est enregistré avant votre clic final. Les fiches en doublon (même email)
          sont ignorées, jamais écrasées.
        </p>

        {/* 1 — FICHIER */}
        <section className="mt-10 border border-line bg-paper p-6">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">01 — VOTRE FICHIER<Cur /></p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <label className="mono cursor-pointer border border-line px-4 py-2.5 text-[12px] text-ink hover:border-ink">
              {nomFichier ? "CHANGER DE FICHIER" : "CHOISIR UN FICHIER CSV"}
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => lireFichier(e.target.files?.[0] ?? null)} />
            </label>
            {nomFichier ? (
              <span className="mono text-[12px] text-ink-soft">
                {nomFichier} — {lignes.length} ligne{lignes.length > 1 ? "s" : ""}
              </span>
            ) : (
              <span className="text-[13px] text-ink-soft">Depuis Excel : Fichier → Enregistrer sous → CSV.</span>
            )}
          </div>
        </section>

        {/* 2 — CORRESPONDANCE */}
        {entetes.length > 0 ? (
          <section className="mt-6 border border-line bg-paper p-6">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">02 — VOS COLONNES<Cur /></p>
            <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
              Klubster a fait correspondre vos colonnes aux siennes — vérifiez, ajustez.
              Prénom et Nom sont indispensables.
            </p>
            <div className="mt-4 divide-y divide-line border border-line">
              {entetes.map((e, i) => (
                <div key={i} className="flex flex-wrap items-center gap-3 px-4 py-2.5">
                  <span className="mono min-w-[140px] flex-1 truncate text-[13px]">{e || `Colonne ${i + 1}`}</span>
                  <span className="mono text-[11px] text-ink-faint">→</span>
                  <select
                    value={cibles[i]}
                    onChange={(ev) => setCibles((c) => c.map((x, j) => (j === i ? (ev.target.value as CibleId) : x)))}
                    className="border border-line bg-paper px-2 py-1.5 text-[13px] outline-none focus:border-ink"
                  >
                    {CIBLES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {!aPrenom || !aNom ? (
              <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>
                Associez une colonne à « Prénom » et une à « Nom » pour continuer.
              </p>
            ) : null}
          </section>
        ) : null}

        {/* 3 — APERÇU + IMPORT */}
        {pret ? (
          <section className="mt-6 border border-line bg-paper p-6">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">03 — APERÇU<Cur /></p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full border border-line text-[13px]">
                <thead>
                  <tr className="mono border-b border-line text-left text-[10px] uppercase tracking-wider text-ink-soft">
                    {entetes.map((e, i) =>
                      cibles[i] === "ignorer" ? null : (
                        <th key={i} className="px-3 py-2 font-normal">
                          {CIBLES.find((c) => c.id === cibles[i])?.label === "Garder telle quelle (champ libre)"
                            ? e
                            : CIBLES.find((c) => c.id === cibles[i])?.label}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {apercu.map((l, li) => (
                    <tr key={li}>
                      {entetes.map((_, i) => (cibles[i] === "ignorer" ? null : <td key={i} className="px-3 py-2">{(l[i] ?? "").trim()}</td>))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mono mt-3 text-[11px] text-ink-faint">
              {lignes.length > 5 ? `… et ${lignes.length - 5} autres lignes.` : ""}
            </p>

            {resultat?.error ? (
              <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{resultat.error}</p>
            ) : null}
            {etat === "fini" && resultat && !resultat.error ? (
              <p className="mono mt-4 text-[12px] text-brand">
                ✓ {resultat.importes} fiche{(resultat.importes ?? 0) > 1 ? "s" : ""} importée{(resultat.importes ?? 0) > 1 ? "s" : ""}
                {resultat.ignores ? ` · ${resultat.ignores} ignorée${resultat.ignores > 1 ? "s" : ""} (doublons ou lignes incomplètes)` : ""}.{" "}
                <Link href={`/${slug}/cockpit/adherents`} className="underline underline-offset-2">Voir vos adhérents →</Link>
              </p>
            ) : (
              <button
                onClick={lancerImport}
                disabled={etat === "envoi"}
                className="mono mt-5 bg-brand-dark px-6 py-3 text-[12px] text-white hover:opacity-90 disabled:opacity-40"
              >
                {etat === "envoi" ? "IMPORT EN COURS…" : `IMPORTER ${lignes.length} FICHE${lignes.length > 1 ? "S" : ""} →`}
              </button>
            )}
          </section>
        ) : null}
      </div>
    </main>
  );
}
