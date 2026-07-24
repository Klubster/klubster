"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { THEME_TEMPLATES, THEME_MODES, type ThemeTemplateId, type ThemeMode } from "@/lib/themes";
import { creerClub, creerCompteWizard, connexionWizard, type CoursInput, type CreneauInput } from "./actions";

function Cur() {
  return <span className="cur">_</span>;
}

// Sans compte, une étape COMPTE s'insère juste avant PUBLIER : le visiteur construit
// d'abord son club (il investit), le compte n'arrive qu'au moment où il devient
// nécessaire. Connecté, le parcours reste identique à avant.
// IDENTITÉ avant TEMPLATE : le nom est demandé en premier (question facile,
// engagement) pour que les aperçus des templates se rendent AVEC le nom du club
// — sinon ils affichent tous « Mon association » et le choix reste abstrait.
const ETAPES_BASE = ["IDENTITÉ", "TEMPLATE", "COULEURS", "INFOS", "COURS & TARIFS", "PUBLIER"];
const ETAPES_AVEC_COMPTE = ["IDENTITÉ", "TEMPLATE", "COULEURS", "INFOS", "COURS & TARIFS", "COMPTE", "PUBLIER"];

// Brouillon du wizard (localStorage) : si Supabase exige la confirmation d'email,
// le visiteur part cliquer le lien et revient sur /creer — sans ça, tout son travail
// (template, nom, cours…) serait perdu. Le logo (File) n'est pas persistable : re-choisi.
const CLE_BROUILLON = "klubster-creer-brouillon-v1";
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
  "#8A6508", "#5C7A1D", "#444441", "#111111",
];

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

interface CreneauRow {
  jour: string;
  debut: string;
  fin: string;
}

interface CoursRow {
  nom: string;
  public_cible: string;
  tarif: string; // € /an, saisi librement
  creneaux: CreneauRow[];
}

const ROW_VIDE: CoursRow = { nom: "", public_cible: "", tarif: "", creneaux: [] };

export default function CreerWizard({ connecte: connecteInitial = true }: { connecte?: boolean }) {
  const [connecte, setConnecte] = useState(connecteInitial);
  const [etape, setEtape] = useState(0);
  const [template, setTemplate] = useState<ThemeTemplateId | null>(null);
  const [typeAsso, setTypeAsso] = useState<"sportive" | "culturelle">("sportive");
  const [mode, setMode] = useState<ThemeMode>("blanc");
  const [couleur, setCouleur] = useState("#189460");
  const [hexSaisie, setHexSaisie] = useState("");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [cours, setCours] = useState<CoursRow[]>([{ ...ROW_VIDE, creneaux: [] }]);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoErr, setLogoErr] = useState<string | null>(null);
  const [accepte, setAccepte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Étape COMPTE (visiteurs non connectés uniquement).
  const [compteMode, setCompteMode] = useState<"signup" | "login">("signup");
  const [cPrenom, setCPrenom] = useState("");
  const [cNom, setCNom] = useState("");
  const [cEmail, setCEmail] = useState("");
  const [cMdp, setCMdp] = useState("");
  const [compteMsg, setCompteMsg] = useState<string | null>(null);

  const ETAPES = connecte ? ETAPES_BASE : ETAPES_AVEC_COMPTE;
  const etapeCompte = connecte ? -1 : ETAPES_AVEC_COMPTE.indexOf("COMPTE");

  // Restauration du brouillon (client uniquement : pas de mismatch d'hydratation).
  useEffect(() => {
    try {
      const brut = localStorage.getItem(CLE_BROUILLON);
      if (!brut) return;
      const b = JSON.parse(brut);
      if (typeof b !== "object" || !b) return;
      if (b.template) setTemplate(b.template);
      if (b.typeAsso === "sportive" || b.typeAsso === "culturelle") setTypeAsso(b.typeAsso);
      if (b.mode) setMode(b.mode);
      if (b.couleur) setCouleur(b.couleur);
      if (b.nom) setNom(b.nom);
      if (b.adresse) setAdresse(b.adresse);
      if (b.email) setEmail(b.email);
      if (b.tel) setTel(b.tel);
      if (Array.isArray(b.cours) && b.cours.length) setCours(b.cours);
      if (typeof b.etape === "number") setEtape(Math.min(b.etape, ETAPES.length - 1));
    } catch {
      /* brouillon illisible : on repart de zéro */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sauvegarde continue du brouillon (sans le logo ni le mot de passe).
  useEffect(() => {
    try {
      localStorage.setItem(
        CLE_BROUILLON,
        JSON.stringify({ template, typeAsso, mode, couleur, nom, adresse, email, tel, cours, etape })
      );
    } catch {
      /* stockage plein ou bloqué : tant pis, le wizard reste utilisable */
    }
  }, [template, typeAsso, mode, couleur, nom, adresse, email, tel, cours, etape]);

  const slug = nom ? nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "") : "monclub";
  const suivant = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  const precedent = () => setEtape((e) => Math.max(e - 1, 0));
  const dernier = etape === ETAPES.length - 1;
  const surCompte = etape === etapeCompte;
  const peutContinuer =
    (etape === 0 && !template) ||
    (etape === 1 && !nom.trim()) ||
    (surCompte && (!cEmail.trim() || !cMdp || (compteMode === "signup" && !cPrenom.trim())))
      ? false
      : true;

  // Étape COMPTE : crée le compte (ou connecte) puis avance. Sans redirection :
  // le wizard garde tout son état en mémoire.
  async function validerCompte() {
    setErr(null);
    setCompteMsg(null);
    setLoading(true);
    try {
      if (compteMode === "signup") {
        const r = await creerCompteWizard({ email: cEmail.trim(), password: cMdp, prenom: cPrenom.trim(), nom: cNom.trim() });
        if (r.error) { setErr(r.error); return; }
        if (r.confirmation) {
          setCompteMsg(
            "Compte créé. Confirmez votre adresse via l'email que nous venons d'envoyer : " +
            "le lien vous ramène ici, votre brouillon est conservé."
          );
          return;
        }
      } else {
        const r = await connexionWizard({ email: cEmail.trim(), password: cMdp });
        if (r.error) { setErr(r.error); return; }
      }
      setConnecte(true);
      // Les index de PUBLIER coïncident : COMPTE disparaît, PUBLIER prend sa place.
      setEtape(ETAPES_BASE.length - 1);
    } catch {
      setErr("Une erreur est survenue. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  function majCours(i: number, patch: Partial<CoursRow>) {
    setCours((rows) => rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  }

  function majCreneau(i: number, j: number, patch: Partial<CreneauRow>) {
    setCours((rows) =>
      rows.map((r, x) =>
        x === i ? { ...r, creneaux: r.creneaux.map((k, y) => (y === j ? { ...k, ...patch } : k)) } : r
      )
    );
  }

  function ajouterCreneau(i: number) {
    setCours((rows) =>
      rows.map((r, x) => (x === i ? { ...r, creneaux: [...r.creneaux, { jour: "lundi", debut: "", fin: "" }] } : r))
    );
  }

  function retirerCreneau(i: number, j: number) {
    setCours((rows) => rows.map((r, x) => (x === i ? { ...r, creneaux: r.creneaux.filter((_, y) => y !== j) } : r)));
  }

  function choisirLogo(f: File | null) {
    setLogoErr(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    if (!f) {
      setLogo(null);
      setLogoPreview(null);
      return;
    }
    if (!f.type.startsWith("image/")) {
      setLogo(null); setLogoPreview(null);
      setLogoErr("Format non reconnu : choisissez une image (PNG, JPG, SVG…).");
      return;
    }
    if (f.size > 3 * 1024 * 1024) {
      setLogo(null); setLogoPreview(null);
      setLogoErr("Image trop lourde (3 Mo maximum).");
      return;
    }
    setLogo(f);
    setLogoPreview(URL.createObjectURL(f));
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
          creneaux: c.creneaux.filter((k): k is CreneauInput => Boolean(k.jour && k.debut && k.fin)),
        }));
      let logoFd: FormData | null = null;
      if (logo) {
        logoFd = new FormData();
        logoFd.append("logo", logo);
      }
      await creerClub(
        {
          nom,
          template: template ?? "editorial",
          mode,
          couleur,
          adresse,
          email,
          tel,
          cours: coursValides,
          accepteCGV: accepte,
          typeAsso,
        },
        logoFd
      );
    } catch (e: unknown) {
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) {
        // Club créé : le brouillon a rempli son office.
        try { localStorage.removeItem(CLE_BROUILLON); } catch { /* sans conséquence */ }
        throw e;
      }
      setErr(e instanceof Error ? e.message : "Création impossible.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-ink">
      {/* Polices des 6 templates (aperçus de l'étape 01) : auto-hébergées par next/font,
          exposées par le layout de /creer — plus de <link> vers Google Fonts. */}
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          ÉTAPE {String(etape + 1).padStart(2, "0")}/{String(ETAPES.length).padStart(2, "0")} — {ETAPES[etape]}<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        <div
          className="mb-12 grid gap-px border border-line bg-line"
          style={{ gridTemplateColumns: `repeat(${ETAPES.length}, minmax(0, 1fr))` }}
        >
          {ETAPES.map((label, i) => (
            <button
              key={label}
              onClick={() => i < etape && setEtape(i)}
              className={`bg-paper px-3 py-3 text-left ${i <= etape ? "" : "opacity-40"}`}
            >
              <div className="mono text-[10px]" style={{ color: i <= etape ? "#279B65" : undefined }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mono mt-1 hidden truncate text-[9px] uppercase tracking-wider text-ink-soft sm:block">{label}</div>
            </button>
          ))}
        </div>

        <div className="border border-line bg-paper p-8 md:p-10">
          {etape === 1 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 02 — TEMPLATE<Cur /></p>
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

          {etape === 0 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 01 — IDENTITÉ<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Le nom de votre club.</h1>
              <label htmlFor="creer-nom" className="mono mt-8 block text-[11px] uppercase tracking-label text-ink-soft">NOM DE L&apos;ASSOCIATION</label>
              <input
                id="creer-nom"
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. USM Boxe Anglaise"
                className="mt-3 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
              />
              <p className="mono mt-3 text-[12px] text-ink-soft">
                Votre adresse : klubster.fr/<span className="text-ink">{slug}</span>
              </p>

              {/* Le type d'association pré-remplit le formulaire d'inscription (champs
                  d'urgence, autorisations, certificat médical…) — tout reste modifiable. */}
              <label className="mono mt-10 block text-[11px] uppercase tracking-label text-ink-soft">VOTRE ASSOCIATION EST PLUTÔT…</label>
              <div className="mt-3 inline-flex border border-line">
                {([["sportive", "SPORTIVE"], ["culturelle", "CULTURELLE"]] as const).map(([val, label]) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setTypeAsso(val)}
                    className={`mono px-5 py-2 text-[11px] uppercase tracking-wider ${
                      typeAsso === val ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[13px] text-ink-soft">
                Votre formulaire d&apos;inscription arrivera pré-rempli : contact d&apos;urgence, autorisations
                {typeAsso === "sportive" ? ", certificat médical et pièces à fournir" : " et niveau de pratique"}.
                Modifiable à tout moment.
              </p>

              <label className="mono mt-10 block text-[11px] uppercase tracking-label text-ink-soft">LOGO — OPTIONNEL</label>
              <div className="mt-3 flex items-center gap-4">
                {logoPreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={logoPreview} alt="Aperçu du logo" className="h-14 w-14 border border-line object-cover" />
                ) : (
                  <span
                    className="grid h-14 w-14 place-items-center border border-line bg-bg-alt text-[18px] font-bold"
                    style={{ color: couleur }}
                    aria-hidden
                  >
                    {(nom.trim() || "K").charAt(0).toUpperCase()}
                  </span>
                )}
                <label className="mono cursor-pointer border border-line px-4 py-2 text-[12px] text-ink-soft hover:border-ink hover:text-ink">
                  {logo ? "CHANGER LE LOGO" : "AJOUTER UN LOGO"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => choisirLogo(e.target.files?.[0] ?? null)}
                  />
                </label>
                {logo ? (
                  <button onClick={() => choisirLogo(null)} className="mono text-[12px] text-ink-faint hover:text-ink">
                    RETIRER ×
                  </button>
                ) : null}
              </div>
              {logoErr ? (
                <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>{logoErr}</p>
              ) : (
                <p className="mt-3 text-[13px] text-ink-soft">PNG, JPG ou SVG, 3 Mo max. Sans logo, l&apos;initiale du club fait le travail.</p>
              )}
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
              <div className="mt-8 space-y-4">
                {cours.map((c, i) => (
                  <div key={i} className="border border-line">
                    <div className="grid grid-cols-[1fr_90px_44px] gap-px bg-line sm:grid-cols-[1fr_1fr_110px_44px]">
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
                        className="order-last col-span-3 bg-paper px-4 py-3 outline-none focus:bg-bg-alt sm:order-none sm:col-span-1"
                      />
                      <input
                        value={c.tarif}
                        onChange={(e) => majCours(i, { tarif: e.target.value })}
                        placeholder="€ /an"
                        inputMode="decimal"
                        className="mono bg-paper px-4 py-3 text-right outline-none focus:bg-bg-alt"
                      />
                      <button
                        onClick={() => setCours((rows) => (rows.length > 1 ? rows.filter((_, j) => j !== i) : [{ ...ROW_VIDE, creneaux: [] }]))}
                        aria-label="Supprimer ce cours"
                        className="mono bg-paper text-[14px] text-ink-faint hover:text-ink"
                      >
                        ×
                      </button>
                    </div>

                    {/* Créneaux horaires du cours (plusieurs possibles) */}
                    <div className="border-t border-line bg-bg-alt px-4 py-3">
                      {c.creneaux.map((k, j) => (
                        <div key={j} className="flex flex-wrap items-center gap-2 py-1.5">
                          <select
                            value={k.jour}
                            onChange={(e) => majCreneau(i, j, { jour: e.target.value })}
                            className="mono border border-line bg-paper px-2 py-1.5 text-[12px] capitalize outline-none focus:border-ink"
                          >
                            {JOURS.map((jr) => (
                              <option key={jr} value={jr}>{jr}</option>
                            ))}
                          </select>
                          <input
                            type="time"
                            value={k.debut}
                            onChange={(e) => majCreneau(i, j, { debut: e.target.value })}
                            className="mono border border-line bg-paper px-2 py-1.5 text-[12px] outline-none focus:border-ink"
                          />
                          <span className="mono text-[12px] text-ink-faint">–</span>
                          <input
                            type="time"
                            value={k.fin}
                            onChange={(e) => majCreneau(i, j, { fin: e.target.value })}
                            className="mono border border-line bg-paper px-2 py-1.5 text-[12px] outline-none focus:border-ink"
                          />
                          <button
                            onClick={() => retirerCreneau(i, j)}
                            aria-label="Supprimer ce créneau"
                            className="mono px-1 text-[13px] text-ink-faint hover:text-ink"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => ajouterCreneau(i)}
                        className="mono mt-1 text-[11px] uppercase tracking-wider text-ink-soft hover:text-ink"
                      >
                        + AJOUTER UN CRÉNEAU
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setCours((rows) => [...rows, { ...ROW_VIDE, creneaux: [] }])}
                className="mono mt-4 border border-line px-4 py-2 text-[12px] text-ink-soft hover:border-ink hover:text-ink"
              >
                + AJOUTER UN COURS
              </button>
            </div>
          )}

          {surCompte && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                SECTION {String(etapeCompte + 1).padStart(2, "0")} — COMPTE<Cur />
              </p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Dernière chose : votre compte.</h1>
              <p className="mt-3 max-w-prose text-ink-soft">
                Pour publier <span className="text-ink">{nom.trim() || "votre club"}</span> et vous en donner les clés.
                Gratuit, sans engagement — votre brouillon est conservé.
              </p>

              <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line">
                <button
                  type="button"
                  onClick={() => { setCompteMode("signup"); setErr(null); setCompteMsg(null); }}
                  className={`mono bg-paper py-3 text-[12px] tracking-wide ${compteMode === "signup" ? "font-bold text-ink" : "text-ink-soft"}`}
                >
                  CRÉER UN COMPTE{compteMode === "signup" ? <Cur /> : null}
                </button>
                <button
                  type="button"
                  onClick={() => { setCompteMode("login"); setErr(null); setCompteMsg(null); }}
                  className={`mono bg-paper py-3 text-[12px] tracking-wide ${compteMode === "login" ? "font-bold text-ink" : "text-ink-soft"}`}
                >
                  J&apos;AI DÉJÀ UN COMPTE{compteMode === "login" ? <Cur /> : null}
                </button>
              </div>

              <div className="mt-6 space-y-4">
                {compteMode === "signup" && (
                  <div className="grid grid-cols-2 gap-3">
                    <ChampCompte label="PRÉNOM" value={cPrenom} onChange={setCPrenom} autoComplete="given-name" />
                    <ChampCompte label="NOM" value={cNom} onChange={setCNom} autoComplete="family-name" />
                  </div>
                )}
                <ChampCompte label="EMAIL" type="email" value={cEmail} onChange={setCEmail} autoComplete="email" />
                <ChampCompte
                  label="MOT DE PASSE"
                  type="password"
                  value={cMdp}
                  onChange={setCMdp}
                  autoComplete={compteMode === "signup" ? "new-password" : "current-password"}
                />
              </div>

              {compteMsg ? <p className="mono mt-4 text-[12px]" style={{ color: "#1E7A4F" }}>{compteMsg}</p> : null}
              {err ? <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{err}</p> : null}
            </div>
          )}

          {dernier && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION {String(ETAPES.length).padStart(2, "0")} — PUBLIER<Cur /></p>
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
                onClick={surCompte ? validerCompte : suivant}
                disabled={!peutContinuer || loading}
                className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 disabled:opacity-30"
              >
                {surCompte ? (loading ? "…" : compteMode === "signup" ? "CRÉER MON COMPTE →" : "SE CONNECTER →") : "CONTINUER →"}
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

/** Champ de l'étape COMPTE : label associé (a11y) + autocomplete natif. */
function ChampCompte({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  const id = "compte-" + label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div>
      <label htmlFor={id} className="mono block text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
    </div>
  );
}

function Champ({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  // Même patron que ChampCompte : label associé à l'input (a11y).
  const id = "infos-" + label.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  return (
    <div>
      <label htmlFor={id} className="mono block text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
    </div>
  );
}
