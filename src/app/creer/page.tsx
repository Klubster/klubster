"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/ui/Layout";

const TEMPLATES = [
  { id: "boxe", label: "Club de boxe" },
  { id: "judo", label: "Club de judo" },
  { id: "danse", label: "École de danse" },
  { id: "foot", label: "Club de foot" },
  { id: "autre", label: "Autre association" },
];

const ETAPES = ["Template", "Identité", "Couleurs", "Infos", "Cours & tarifs", "Publier"];

export default function CreerPage() {
  const [etape, setEtape] = useState(0);
  const [template, setTemplate] = useState<string | null>(null);
  const [nom, setNom] = useState("");

  const suivant = () => setEtape((e) => Math.min(e + 1, ETAPES.length - 1));
  const precedent = () => setEtape((e) => Math.max(e - 1, 0));

  return (
    <main className="min-h-screen bg-bg-alt">
      <header className="border-b border-line bg-surface">
        <Container className="flex items-center justify-between py-3">
          <Link href="/" className="font-mono text-lg font-bold lowercase">klubster</Link>
          <span className="font-mono text-xs text-ink-soft">
            étape {etape + 1}/{ETAPES.length} · {ETAPES[etape]}
          </span>
        </Container>
      </header>

      <Container className="py-12">
        {/* progression */}
        <div className="mb-8 flex gap-1.5">
          {ETAPES.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= etape ? "bg-brand" : "bg-line"}`} />
          ))}
        </div>

        <div className="mx-auto max-w-xl rounded-card border border-line bg-surface p-8 shadow-sm">
          {etape === 0 && (
            <div>
              <h1 className="text-2xl font-bold">Quel type d&apos;association ?</h1>
              <p className="mt-2 text-ink-soft">On pré-remplit cours, créneaux et pièces pour vous.</p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplate(t.id)}
                    className={`rounded-control border p-4 text-left text-sm transition-colors ${
                      template === t.id ? "border-ink bg-bg-alt" : "border-line hover:bg-bg-alt"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {etape === 1 && (
            <div>
              <h1 className="text-2xl font-bold">Le nom de votre club</h1>
              <label className="mt-6 block text-sm font-medium text-ink">Nom de l&apos;association</label>
              <input
                value={nom}
                onChange={(e) => setNom(e.target.value)}
                placeholder="Ex. USM Boxe Anglaise"
                className="mt-2 w-full rounded-control border border-line px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
              />
              <p className="mt-2 font-mono text-xs text-ink-soft">
                Votre adresse : klubster.fr/{nom ? nom.toLowerCase().replace(/[^a-z0-9]+/g, "") : "monclub"}
              </p>
            </div>
          )}

          {etape > 1 && etape < ETAPES.length - 1 && (
            <div>
              <h1 className="text-2xl font-bold">{ETAPES[etape]}</h1>
              <p className="mt-2 text-ink-soft">
                Cette étape sera branchée au prochain jalon (logo/couleurs, infos pratiques, cours &
                tarifs avec valeurs par défaut du template).
              </p>
            </div>
          )}

          {etape === ETAPES.length - 1 && (
            <div>
              <h1 className="text-2xl font-bold">Prêt à publier 🎉</h1>
              <p className="mt-2 text-ink-soft">
                À ce stade, on crée l&apos;organisation en base et on redirige vers
                klubster.fr/&lt;slug&gt;. (Création réelle + Stripe Connect : jalon suivant.)
              </p>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={precedent} disabled={etape === 0}>
              ← Précédent
            </Button>
            {etape < ETAPES.length - 1 ? (
              <Button onClick={suivant} disabled={etape === 0 && !template}>
                Continuer →
              </Button>
            ) : (
              <Button disabled>Publier (bientôt)</Button>
            )}
          </div>
        </div>
      </Container>
    </main>
  );
}
