"use client";
import { useState } from "react";
import Link from "next/link";

function Cur() {
  return <span className="cur">_</span>;
}

const TEMPLATES = [
  ["boxe", "Club de boxe"],
  ["judo", "Club de judo"],
  ["danse", "École de danse"],
  ["foot", "Club de foot"],
  ["tennis", "Club de tennis"],
  ["autre", "Autre association"],
];

const ETAPES = ["TEMPLATE", "IDENTITÉ", "COULEURS", "INFOS", "COURS & TARIFS", "PUBLIER"];

export default function CreerPage() {
  const [etape, setEtape] = useState(0);
  const [template, setTemplate] = useState<string | null>(null);
  const [nom, setNom] = useState("");
  const slug = nom ? nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "") : "monclub";

  const suivant = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  const precedent = () => setEtape((e) => Math.max(e - 1, 0));
  const dernier = etape === ETAPES.length - 1;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          ÉTAPE {String(etape + 1).padStart(2, "0")}/06 — {ETAPES[etape]}<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8 md:py-16">
        {/* Progression indexée */}
        <div className="mb-12 grid grid-cols-6 gap-px border border-line bg-line">
          {ETAPES.map((label, i) => (
            <div key={label} className={`bg-paper px-3 py-3 ${i <= etape ? "" : "opacity-40"}`}>
              <div className="mono text-[10px]" style={{ color: i <= etape ? "#279B65" : undefined }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div className="mono mt-1 truncate text-[9px] uppercase tracking-wider text-ink-soft">{label}</div>
            </div>
          ))}
        </div>

        <div className="border border-line bg-paper p-8 md:p-10">
          {etape === 0 && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 01 — TEMPLATE<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Quel type d&apos;association ?</h1>
              <p className="mt-3 text-ink-soft">On pré-remplit cours, créneaux et pièces pour vous.</p>
              <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
                {TEMPLATES.map(([id, label]) => (
                  <button
                    key={id}
                    onClick={() => setTemplate(id)}
                    className={`bg-paper px-5 py-4 text-left text-[15px] ${template === id ? "font-medium" : "text-ink-soft hover:text-ink"}`}
                  >
                    <span className="mono mr-2 text-[11px]" style={{ color: template === id ? "#279B65" : "#C2C2BD" }}>
                      {template === id ? "■" : "□"}
                    </span>
                    {label}
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

          {etape > 1 && !dernier && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                SECTION {String(etape + 1).padStart(2, "0")} — {ETAPES[etape]}<Cur />
              </p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">{ETAPES[etape]}.</h1>
              <p className="mt-3 max-w-prose text-ink-soft">
                Cette étape sera branchée au prochain jalon : couleurs et logo, infos pratiques, puis
                cours / tarifs / créneaux pré-remplis par le template choisi.
              </p>
            </div>
          )}

          {dernier && (
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 06 — PUBLIER<Cur /></p>
              <h1 className="mt-6 text-2xl font-medium md:text-3xl">Prêt à publier.</h1>
              <p className="mt-3 max-w-prose text-ink-soft">
                On crée l&apos;organisation en base et on redirige vers klubster.fr/{slug}.
                (Création réelle + Stripe Connect : prochain jalon produit.)
              </p>
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-line pt-6">
            <button onClick={precedent} disabled={etape === 0} className="mono text-[12px] text-ink-soft hover:text-ink disabled:opacity-30">
              ← PRÉCÉDENT
            </button>
            {!dernier ? (
              <button
                onClick={suivant}
                disabled={etape === 0 && !template}
                className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 disabled:opacity-30"
              >
                CONTINUER →
              </button>
            ) : (
              <button disabled className="mono border border-ink px-6 py-3 text-[12px] opacity-40">PUBLIER (BIENTÔT)</button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
