"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, EnTeteDemo } from "@/components/demo/Simulation";
import { CHAMPS_IMPORT, CSV_EXEMPLE, deviner, emailPlausible, lireCsv, telecharger } from "@/lib/demo/csv";

/**
 * L'import d'adhérents — trois temps sur une seule page, comme le produit.
 *
 * SOURCE DE VÉRITÉ : `components/site/ImportAdherents.tsx`, `cockpit/adherents/import/page.tsx`,
 * `cockpit/adherents/actions.ts` (`importerAdherents`) et `src/lib/csv.ts`.
 *
 * DEUX RÈGLES DU PRODUIT QU'ON POURRAIT PRENDRE POUR DES OUBLIS
 *
 * 1. TOUTES les lignes partent, y compris les incomplètes. Le commentaire du composant
 *    réel le dit : les filtrer ici les ferait disparaître du compte-rendu. Le visiteur
 *    lirait « 4 importés, 1 ignoré » sur un fichier de 6 lignes, et chercherait longtemps
 *    la sixième.
 *
 * 2. Un email qui ne ressemble pas à un email rend l'adhérent SANS email, il ne le rejette
 *    pas : `email && emailValide(email) ? email : null`. Un club préfère une fiche à
 *    corriger à une fiche perdue.
 *
 * POURQUOI LE FICHIER D'EXEMPLE EST VOLONTAIREMENT IMPARFAIT
 * Un fichier propre ne déclencherait aucun avertissement, et c'est précisément
 * l'avertissement qui rassure un président aux trois cents fiches : voir Klubster repérer
 * un doublon et une adresse malformée AVANT d'écrire quoi que ce soit.
 *
 * Le fichier que le visiteur choisit, s'il en choisit un, est lu par `File.text()` — dans
 * son navigateur, et nulle part ailleurs.
 */

const APERCU = 5;

type Cle = (typeof CHAMPS_IMPORT)[number]["cle"];

export default function DemoImport() {
  const { etat, envoyer } = useDemo();

  const [entetes, setEntetes] = useState<string[]>([]);
  const [lignes, setLignes] = useState<string[][]>([]);
  const [corresp, setCorresp] = useState<Record<string, number>>({});
  const [coursDefaut, setCoursDefaut] = useState("");
  const [erreurFichier, setErreurFichier] = useState<string | null>(null);

  // Le compte-rendu : l'effectif AVANT l'import et le nombre de lignes envoyées. Le
  // nombre réellement créé se déduit de l'état — on ne recopie pas ici la règle de
  // doublon du réducteur, sinon les deux finiraient par diverger et l'écran mentirait.
  const [rapport, setRapport] = useState<{ avant: number; envoyees: number; ignorables: string[] } | null>(null);

  const charger = (texte: string) => {
    setErreurFichier(null);
    setRapport(null);
    const { entetes: e, lignes: l } = lireCsv(texte);
    if (e.length === 0 || l.length === 0) {
      setErreurFichier("Ce fichier ne contient pas de tableau lisible. Vérifiez qu’il a une ligne d’en-têtes.");
      return;
    }
    setEntetes(e);
    setLignes(l);
    setCorresp(deviner(e));
  };

  const choisirFichier = async (f: File | undefined) => {
    setErreurFichier(null);
    setRapport(null);
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) {
      setErreurFichier("Fichier trop lourd (5 Mo maximum).");
      return;
    }
    charger(await f.text());
  };

  const valeur = (ligne: string[], champ: Cle) => {
    const i = corresp[champ];
    return i !== undefined && i >= 0 && i < ligne.length ? ligne[i].trim() : "";
  };

  const manquant = (champ: Cle) => corresp[champ] === undefined || corresp[champ] < 0;
  const bloquant = manquant("prenom") || manquant("nom");

  const problemes = useMemo(() => {
    const p: string[] = [];
    if (lignes.length === 0) return p;
    if (manquant("prenom")) p.push("La colonne « Prénom » n’est associée à rien.");
    if (manquant("nom")) p.push("La colonne « Nom » n’est associée à rien.");

    let sansNom = 0;
    let emailsDouteux = 0;
    for (const l of lignes) {
      if (!valeur(l, "prenom") || !valeur(l, "nom")) sansNom++;
      const e = valeur(l, "email");
      if (e && !emailPlausible(e)) emailsDouteux++;
    }
    if (sansNom > 0) p.push(`${sansNom} ligne(s) sans prénom ou sans nom seront ignorées.`);
    if (emailsDouteux > 0) {
      p.push(`${emailsDouteux} email(s) ne sont pas lisibles — l’adhérent sera créé sans email.`);
    }
    return p;
    // `valeur` et `manquant` se referment sur `corresp`, déjà listé en dépendance.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lignes, corresp]);

  const simulerImport = () => {
    const parNom = new Map(etat.cours.map((c) => [c.nom.trim().toLowerCase(), c.id]));

    const charge = lignes.map((l) => {
      const email = valeur(l, "email");
      const nomCours = valeur(l, "cours").toLowerCase();
      return {
        prenom: valeur(l, "prenom"),
        nom: valeur(l, "nom"),
        // Email illisible → absent, pas rejeté.
        email: email && emailPlausible(email) ? email : "",
        telephone: valeur(l, "telephone"),
        // `|| null` et non `?? null` : « Aucun » vaut la chaîne vide, pas `null`, et
        // `??` la laisserait passer comme un identifiant de cours qui n'existe pas.
        coursId: parNom.get(nomCours) ?? (coursDefaut || null),
      };
    });

    const ignorables = lignes
      .map((l, i) =>
        !valeur(l, "prenom") || !valeur(l, "nom") ? `Ligne ${i + 2} : prénom ou nom manquant — ignorée.` : null
      )
      .filter((e): e is string => e !== null);

    // Les deux dans le même gestionnaire : React les applique ensemble, donc au rendu
    // suivant `rapport.avant` et l'état importé sont cohérents.
    setRapport({ avant: etat.adherents.length, envoyees: lignes.length, ignorables });
    envoyer({ type: "adherent/importer", lignes: charge });
  };

  if (rapport) {
    const crees = etat.adherents.length - rapport.avant;
    const ignores = rapport.envoyees - crees;
    return (
      <main className="min-h-screen text-ink">
        <EnTeteDemo retour="/demo/adherents" libelleRetour="← ADHÉRENTS" kicker="IMPORT" />
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
          <div className="border border-line bg-paper px-6 py-8">
            <p className="text-2xl font-medium tracking-[-0.01em]">
              {crees} adhérent{crees > 1 ? "s" : ""} importé{crees > 1 ? "s" : ""}.
            </p>
            {ignores > 0 ? (
              <p className="mt-3 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                {ignores} ligne{ignores > 1 ? "s" : ""} ignorée{ignores > 1 ? "s" : ""} sur {rapport.envoyees} —
                doublons ou données incomplètes. Aucune fiche existante n’a été écrasée.
              </p>
            ) : null}
            {rapport.ignorables.length > 0 ? (
              <ul className="mono mt-5 space-y-1 text-[12px] text-warning">
                {rapport.ignorables.slice(0, 8).map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            ) : null}
            <Link
              href="/demo/adherents"
              className="mono mt-8 inline-block min-h-[44px] bg-ink px-6 py-4 text-[13px] text-paper hover:opacity-90"
            >
              VOIR LES ADHÉRENTS →
            </Link>
          </div>
          <p className="mono mt-6 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Ces fiches n’existent que dans cet onglet. Elles disparaissent au rechargement, et le fichier
            que vous avez ouvert n’a été envoyé nulle part.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/adherents" libelleRetour="← ADHÉRENTS" kicker="IMPORT" />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">Importer vos adhérents.</h1>
        <p className="mt-3 max-w-prose text-lg leading-relaxed text-ink-soft">
          Vous venez d’un tableur ou d’un autre logiciel. Personne ne devrait ressaisir trois cents fiches
          à la main.
        </p>

        <div className="mt-10 space-y-10">
          {/* ——— 1 ——————————————————————————————————————————————————————————— */}
          <section>
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">1 — VOTRE FICHIER</p>
            <div className="mt-4 border border-line bg-paper px-5 py-5">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
                <button
                  type="button"
                  onClick={() => charger(CSV_EXEMPLE)}
                  className="mono min-h-[44px] w-full border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper sm:w-auto"
                >
                  CHARGER LE FICHIER D’EXEMPLE
                </button>
                <button
                  type="button"
                  onClick={() => telecharger(CSV_EXEMPLE, "demonstration-klubster-exemple.csv")}
                  className="mono min-h-[44px] text-[11px] text-ink-soft underline underline-offset-2 hover:text-ink"
                >
                  le télécharger pour le regarder
                </button>
              </div>

              <div className="mt-5 border-t border-line pt-5">
                <label htmlFor="fichier" className="mono block text-[10px] uppercase tracking-label text-ink-soft">
                  OU VOTRE PROPRE FICHIER
                </label>
                <input
                  id="fichier"
                  type="file"
                  accept=".csv,text/csv,text/plain"
                  onChange={(e) => void choisirFichier(e.target.files?.[0])}
                  className="mono mt-3 block w-full text-[12px] text-ink-soft"
                />
                <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-soft">
                  Un fichier CSV, exporté d’Excel, d’un tableur ou de votre ancien logiciel. Point-virgule,
                  virgule ou tabulation, peu importe. La première ligne doit porter les noms des colonnes.
                </p>
                <p className="mono mt-2 max-w-prose text-[11px] leading-relaxed text-ink-faint">
                  Il est lu dans votre navigateur et n’est envoyé nulle part.
                </p>
              </div>

              {erreurFichier ? (
                <p role="alert" className="mono mt-4 text-[12px] text-danger">
                  {erreurFichier}
                </p>
              ) : null}
            </div>
          </section>

          {entetes.length > 0 ? (
            <>
              {/* ——— 2 ——————————————————————————————————————————————————————— */}
              <section>
                <p className="mono text-[11px] uppercase tracking-label text-ink-soft">2 — LES COLONNES</p>
                <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">
                  Klubster a deviné. Corrigez ce qui ne va pas : à gauche ses champs, à droite les colonnes
                  de votre fichier.
                </p>
                <div className="mt-4 border border-line bg-paper">
                  {CHAMPS_IMPORT.map((champ) => (
                    <div
                      key={champ.cle}
                      className="grid grid-cols-1 items-center gap-3 border-b border-line px-5 py-4 last:border-b-0 sm:grid-cols-2"
                    >
                      <label htmlFor={`col-${champ.cle}`} className="text-[15px]">
                        {champ.label}
                        {champ.requis ? <span className="text-danger"> *</span> : null}
                      </label>
                      <select
                        id={`col-${champ.cle}`}
                        value={corresp[champ.cle] ?? -1}
                        onChange={(e) => setCorresp((c) => ({ ...c, [champ.cle]: Number(e.target.value) }))}
                        className="min-h-[44px] w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
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

                {etat.cours.length > 0 ? (
                  <div className="mt-4 border border-line bg-paper px-5 py-4">
                    <label htmlFor="cours-defaut" className="mono text-[10px] uppercase tracking-label text-ink-soft">
                      COURS PAR DÉFAUT
                    </label>
                    <select
                      id="cours-defaut"
                      value={coursDefaut}
                      onChange={(e) => setCoursDefaut(e.target.value)}
                      className="mt-2 min-h-[44px] w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                    >
                      <option value="">Aucun</option>
                      {etat.cours.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                    <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-soft">
                      Utilisé quand la colonne « Cours » est absente, ou quand son contenu ne correspond à
                      aucun de vos cours.
                    </p>
                  </div>
                ) : null}
              </section>

              {/* ——— 3 ——————————————————————————————————————————————————————— */}
              <section>
                <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                  3 — APERÇU ({lignes.length} ligne{lignes.length > 1 ? "s" : ""})
                </p>
                <div className="mt-4 overflow-x-auto border border-line bg-paper">
                  <table className="w-full min-w-[640px] text-left text-[13px]">
                    <thead className="bg-bg-alt">
                      <tr>
                        {CHAMPS_IMPORT.map((c) => (
                          <th
                            key={c.cle}
                            scope="col"
                            className="mono px-4 py-3 text-[10px] uppercase tracking-label text-ink-soft"
                          >
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
                {lignes.length > APERCU ? (
                  <p className="mono mt-2 text-[11px] text-ink-faint">
                    … et {lignes.length - APERCU} autre{lignes.length - APERCU > 1 ? "s" : ""}.
                  </p>
                ) : null}

                {problemes.length > 0 ? (
                  <ul className="mono mt-4 space-y-1.5 text-[12px] text-warning">
                    {problemes.map((p) => (
                      <li key={p}>⚠ {p}</li>
                    ))}
                  </ul>
                ) : null}

                <p className="mono mt-4 max-w-prose text-[11px] leading-relaxed text-ink-faint">
                  Les adhérents déjà présents — même email, ou mêmes prénom et nom — seront ignorés. Aucune
                  fiche existante ne sera modifiée.
                </p>

                <div className="mt-6">
                  <BoutonSimuler
                    libelle={`SIMULER L’IMPORT DE ${lignes.length} LIGNE${lignes.length > 1 ? "S" : ""} →`}
                    onSimuler={simulerImport}
                    desactive={bloquant}
                  />
                </div>
              </section>
            </>
          ) : null}
        </div>
      </div>
    </main>
  );
}
