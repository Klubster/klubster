"use client";
import { useState } from "react";
import Link from "next/link";
import { THEME_TEMPLATES, THEME_MODES, fontsHrefAll, type ThemeTemplateId, type ThemeMode } from "@/lib/themes";
import { creerClub, type CoursInput } from "./actions";

function Cur() {
  return <span className="cur">_</span>;
}

const ETAPES = ["TEMPLATE", "IDENTITÉ", "COULEURS", "INFOS", "COURS & TARIFS", "PUBLIER"];
const COULEURS = [
  // Verts / bleus-verts
  "#189460", "#1E7A4F", "#2E7A56", "#1E7A7A",
  // Bleus
  "#1C6F9C", "#2D5B7A", "#2E5AA0", "#356B8C",
  // Violets / roses
  "#7A4D8C", "#5B4A9E", "#A03C6E", "#C2185B",
  // Rouges / oranges / bruns
  "#B23B3B", "#7A2E2E", "#C05A1D", "#B5651D",
  // Jaunes / kaki / neutres
  "#B8860B", "#5C7A1D", "#444441", "#111111",
];

interface CoursRow {
  nom: string;
  public_cible: string;
  tarif: string; // € /an, saisi librement
}

const ROW_VIDE: CoursRow = { nom: "", public_cible: "", tarif: "" };

export default function CreerWizard() {
  const [etape, setEtape] = useState(0);
  const [template, setTemplate] = useState<ThemeTemplateId | null>(null);
  const [mode, setMode] = useState<ThemeMode>("blanc");
  const [couleur, setCouleur] = useState("#189460");
  const [hexSaisie, setHexSaisie] = useState("");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [cours, setCours] = useState<CoursRow[]>([{ ...ROW_VIDE }]);
  const [accepte, setAccepte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slug = nom ? nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "") : "monclub";
  const suivant = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  const precedent = () => setEtape((e) => Math.max(e - 1, 0));
  const dernier = etape === ETAPES.length - 1;
  const peutContinuer = (etape === 0 && !template) || (etape === 1 && !nom.trim()) ? false : true;

  function majCours(i: number, patch: Partial<CoursRow>) {
    setCours((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  // Saisie libre d'un code hex (#1A2B3C ou #1AB) : appliqué dès qu'il est valide.
  function appliquerHex(v: string) {
    setHexSaisie(v);
    const h = v.trim().replace(/^#/, "");
    if (/^[0-9a-fA-F]{6}$/.test(h)) setCouleur("#" + h.toUpperCase());
    else if (/^[0-9a-fA-F]{3}$/.test(h)) setCouleur("#" + h.split("").map((c) => c + c).join("").toUpperCase());
  }

  async function publier() {
    setErr(null);
    setLoading(true);
    try {
      const coursValides: CoursInput[] = cours
        .filter((c) => c.nom.trim())
        .map((c) => ({
          nom: c.nom.trim(),
          public_cible: c.public_cible.trim() || null,
          tarif_centimes: Math.max(0, Math.round((parseFloat(c.tarif.replace(",", ".")) || 0) * 100)),
        }));
      await creerClub({
        nom,
        template: template ?? "editorial",
        mode,
        couleur,
        adresse,
        email,
        tel,
        cours: coursValides,
        accepteCGV: accepte,
      });
    } catch (e: unknown) {
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setErr(e instanceof Error ? e.message : "Création impossible.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-ink">
      {/* Polices des 6 templates, pour les aperçus de l'étape 01. */}
      <link rel="stylesheet" href={fontsHrefAll()} />
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          ÉTAPE {String(etape + 1).padStart(2, "0")}/06 — {ETAPES[etape]}<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <div className="mb-12 grid grid-cols-6 gap-px border border-line bg-line">
          {ETAPES.map((label, i) => (
            <button
              key={label}
              onClick={() => i < etape && setEtape(i)}
              className={`bg-paper px-3 py-3 text-left ${i <= etape ? "" : "opacity-40"}`}
            >
              <div className="mono text-[10px]" style={{ color: i <= etape ? "#279B65" : undefined }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mono mt-1 truncate text-[9px] uppercase tracking-wider text-ink-soft">{label}</div>
            </button>
          ))}
        </div>

        <div className="border border-line bg-paper p-8 md:p-10">
          {etape === 0 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 01 — TEMPLATE<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Le design de votre site.</h1>
              <p className="mt-3 text-ink-soft">Six directions typographiques, en blanc ou en noir. Modifiable plus tard.</p>

              <div className="mt-8 inline-flex border border-line">
                {THEME_MODES.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMode(m.id)}
                    className={`mono px-5 py-2 text-[11px] uppercase tracking-wider ${
                      mode === m.id ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
                {THEME_TEMPLATES.map((t) => {
                  const actif = template === t.id;
                  const fond = mode === "noir" ? "#131312" : "#FCFCFA";
                  const encre = mode === "noir" ? "#F4F4F1" : "#111111";
                  const doux = mode === "noir" ? "#9C9C97" : "#8C8C88";
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplate(t.id)}
                      className="bg-paper p-4 text-left"
                      style={{ outline: actif ? "2px solid #279B65" : "none", outlineOffset: -2 }}
                    >
                      <div className="border border-line px-4 py-5" style={{ background: fond, color: encre }}>
                        <div className="text-[26px] leading-none" style={{ fontFamily: t.sans }}>Aa</div>
                        <div className="mt-3 truncate text-[13px] font-medium" style={{ fontFamily: t.sans }}>
                          {nom.trim() || "Mon association"}
                        </div>
                        <div className="mt-1 truncate text-[10px] uppercase tracking-wider" style={{ fontFamily: t.mono, color: doux }}>
                          inscriptions ouvertes_
                        </div>
                      </div>
                      <div className="mt-3 flex items-baseline justify-between gap-2">
                        <span className={`text-[14px] ${actif ? "font-medium" : ""}`}>
                          <span className="mono mr-2 text-[11px]" style={{ color: actif ? "#279B65" : "#C2C2BD" }}>
                            {actif ? "■" : "□"}
                          </span>
                          {t.label}
                        </span>
                        <span className="mono text-[10px] uppercase tracking-wider text-ink-faint">
                          {mode === "noir" ? "NOIR" : "BLANC"}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-ink-soft">{t.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {etape === 1 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 02 — IDENTITÉ<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Le nom de votre club.</h1>
              <label className="mono mt-8 block text-[11px] uppercase tracking-label text-ink-soft">NOM DE L&apos;ASSOCIATION</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. USM Boxe Anglaise"
                className="mt-3 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
              />
              <p className="mono mt-3 text-[12px] text-ink-soft">
                Votre adresse : klubster.fr/<span className="text-ink">{slug}</span>
              </p>
            </div>
          )}

          {etape === 2 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 03 — COULEURS<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">La couleur du club.</h1>
              <p className="mt-3 text-ink-soft">Elle habillera votre site en touches d&apos;accent.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {COULEURS.map((c) => (
                  <button
                    key={c}
                    onClick={() => { setCouleur(c); setHexSaisie(""); }}
                    aria-label={c}
                    className="h-10 w-10 border"
                    style={{ background: c, borderColor: couleur === c ? "#111" : "transparent", outline: couleur === c ? "2px solid #111" : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>

              <p className="mono mt-10 text-[11px] uppercase tracking-label text-ink-soft">OU VOTRE COULEUR EXACTE<Cur /></p>
              <div className="mt-3 flex items-center gap-3">
                <input
                  value={hexSaisie}
                  onChange={(e) => appliquerHex(e.target.value)}
                  placeholder="#1A6FB5"
                  maxLength={7}
                  spellCheck={false}
                  className="mono w-36 border border-line bg-paper px-4 py-3 uppercase outline-none focus:border-ink"
                />
                <label
                  className="relative h-11 w-11 cursor-pointer overflow-hidden border border-line"
                  style={{ background: couleur }}
                  title="Ouvrir le sélecteur de couleur"
                >
                  <input
                    type="color"
                    value={couleur}
                    onChange={(e) => { setCouleur(e.target.value.toUpperCase()); setHexSaisie(e.target.value.toUpperCase()); }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Sélecteur de couleur"
                  />
                </label>
                <span className="mono text-[12px] text-ink-soft">
                  Couleur choisie : <span className="text-ink">{couleur}</span>
                </span>
              </div>
              <p className="mt-3 text-[13px] text-ink-soft">
                Collez le code hexadécimal de votre couleur (logo, maillot…) ou cliquez sur le carré pour la choisir.
              </p>
            </div>
          )}

          {etape === 3 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 04 — INFOS<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Infos pratiques.</h1>
              <p className="mt-3 text-ink-soft">Pour la page contact et la carte. Optionnel.</p>
              <div className="mt-8 space-y-4">
                <Champ label="ADRESSE" value={adresse} onChange={setAdresse} placeholder="2 rue du Stade, 82000 Montauban" />
                <Champ label="EMAIL" value={email} onChange={setEmail} placeholder="contact@club.fr" />
                <Champ label="TÉLÉPHONE" value={tel} onChange={setTel} placeholder="06 12 34 56 78" />
              </div>
            </div>
          )}

          {etape === 4 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 05 — COURS &amp; TARIFS<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Vos cours.</h1>
              <p className="mt-3 text-ink-soft">
                Ajoutez vos cours et tarifs annuels. Optionnel — tout reste modifiable dans votre Cockpit.
              </p>
              <div className="mt-8 space-y-3">
                {cours.map((c, i) => (
                  <div key={i} className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-[1fr_1fr_110px_44px]">
                    <input
                      value={c.nom}
                      onChange={(e) => majCours(i, { nom: e.target.value })}
                      placeholder="Nom du cours — ex. Ados"
                      className="bg-paper px-4 py-3 outline-none focus:bg-bg-alt"
                    />
                    <input
                      value={c.public_cible}
                      onChange={(e) => majCours(i, { public_cible: e.target.value })}
                      placeholder="Public — ex. 12-17 ans"
                      className="bg-paper px-4 py-3 outline-none focus:bg-bg-alt"
                    />
                    <input
                      value={c.tarif}
                      onChange={(e) => majCours(i, { tarif: e.target.value })}
                      placeholder="€ /an"
                      inputMode="decimal"
                      className="mono bg-paper px-4 py-3 text-right outline-none focus:bg-bg-alt"
                    />
                    <button
                      onClick={() => setCours((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ ...ROW_VIDE }]))}
                      aria-label="Supprimer ce cours"
                      className="mono bg-paper text-[14px] text-ink-faint hover:text-ink"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCours((rows) => [...rows, { ...ROW_VIDE }])}
                className="mono mt-4 border border-line px-4 py-2 text-[12px] text-ink-soft hover:border-ink hover:text-ink"
              >
                + AJOUTER UN COURS
              </button>
            </div>
          )}

          {dernier && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 06 — PUBLIER<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Prêt à publier.</h1>
              <p className="mt-3 max-w-prose text-ink-soft">
                On crée votre club et on l&apos;envoie en ligne sur{" "}
                <span className="mono text-ink">klubster.fr/{slug}</span>.
              </p>
              <label className="mt-8 flex cursor-pointer items-start gap-3 border border-line bg-bg-alt px-4 py-3 text-[13px]">
                <input type="checkbox" checked={accepte} onChange={(e) => setAccepte(e.target.checked)} className="mt-1" />
                <span>
                  J&apos;accepte les <a href="/cgv" target="_blank" className="underline">CGV</a> et le{" "}
                  <a href="/sous-traitance" target="_blank" className="underline">contrat de sous-traitance (DPA)</a>,
                  en qualité de représentant habilité de l&apos;association.
                </span>
              </label>
              {err ? <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{err}</p> : null}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <button onClick={precedent} disabled={etape === 0 || loading} className="mono text-[12px] text-ink-soft hover:text-ink disabled:opacity-30">
              ← PRÉCÉDENT
            </button>
            {!dernier ? (
              <button
                onClick={suivant}
                disabled={!peutContinuer}
                className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 disabled:opacity-30"
              >
                CONTINUER →
              </button>
            ) : (
              <button
                onClick={publier}
                disabled={loading || !nom.trim() || !accepte}
                className="mono px-6 py-3 text-[12px] text-white disabled:opacity-40"
                style={{ background: couleur }}
              >
                {loading ? "PUBLICATION…" : "PUBLIER →"}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Champ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="mono block text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
    </div>
  );
}
