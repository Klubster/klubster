"use client";
import { useState } from "react";
import Link from "next/link";
import { SPORTS, TEMPLATES_COURS } from "@/lib/templates";
import { creerClub } from "./actions";

function Cur() {
  return <span className="cur">_</span>;
}

const ETAPES = ["TEMPLATE", "IDENTITÉ", "COULEURS", "INFOS", "COURS & TARIFS", "PUBLIER"];
const COULEURS = ["#189460", "#2D5B7A", "#A03C6E", "#1E7A4F", "#B5651D", "#7A4D8C", "#B23B3B", "#111111"];

export default function CreerWizard() {
  const [etape, setEtape] = useState(0);
  const [sport, setSport] = useState<string | null>(null);
  const [couleur, setCouleur] = useState("#189460");
  const [nom, setNom] = useState("");
  const [adresse, setAdresse] = useState("");
  const [email, setEmail] = useState("");
  const [tel, setTel] = useState("");
  const [accepte, setAccepte] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const slug = nom ? nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "") : "monclub";
  const cours = sport ? TEMPLATES_COURS[sport] ?? [] : [];
  const suivant = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  const precedent = () => setEtape((e) => Math.max(e - 1, 0));
  const dernier = etape === ETAPES.length - 1;
  const peutContinuer = (etape === 0 && !sport) || (etape === 1 && !nom.trim()) ? false : true;

  function choisirSport(id: string) {
    setSport(id);
    setCouleur(SPORTS.find((s) => s.id === id)?.couleur ?? "#111111");
  }

  async function publier() {
    setErr(null);
    setLoading(true);
    try {
      await creerClub({ nom, sport: sport ?? "autre", couleur, adresse, email, tel, accepteCGV: accepte });
    } catch (e: unknown) {
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setErr(e instanceof Error ? e.message : "Création impossible.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-ink">
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
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Quel type d&apos;association ?</h1>
              <p className="mt-3 text-ink-soft">On pré-remplit cours, créneaux et tarifs pour vous.</p>
              <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
                {SPORTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => choisirSport(s.id)}
                    className={`bg-paper px-5 py-4 text-left text-[15px] ${sport === s.id ? "font-medium" : "text-ink-soft hover:text-ink"}`}
                  >
                    <span className="mono mr-2 text-[11px]" style={{ color: sport === s.id ? s.couleur : "#C2C2BD" }}>
                      {sport === s.id ? "■" : "□"}
                    </span>
                    {s.label}
                  </button>
                ))}
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
              <p className="mt-3 text-ink-soft">Elle habillera votre site. Le reste reste noir &amp; blanc.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                {COULEURS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCouleur(c)}
                    aria-label={c}
                    className="h-10 w-10 border"
                    style={{ background: c, borderColor: couleur === c ? "#111" : "transparent", outline: couleur === c ? "2px solid #111" : "none", outlineOffset: 2 }}
                  />
                ))}
              </div>
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
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Vos cours, pré-remplis.</h1>
              <p className="mt-3 text-ink-soft">Modifiables plus tard dans votre Cockpit.</p>
              <div className="mt-8 border-t border-line">
                {cours.map((c, i) => (
                  <div key={i} className="flex items-baseline justify-between gap-4 border-b border-line py-3">
                    <span className="mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 text-[15px]">{c.nom}</span>
                    <span className="hidden flex-1 text-[13px] text-ink-soft sm:block">{c.public_cible}</span>
                    <span className="mono text-[14px] font-bold" style={{ color: couleur }}>
                      {Math.round(c.tarif_centimes / 100)} € /an
                    </span>
                  </div>
                ))}
              </div>
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
