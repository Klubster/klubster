"use client";
import { useState } from "react";
import Link from "next/link";
import { saveFormConfig } from "./actions";
import { TYPE_LABELS, type FormConfig, type Champ, type ChampType, type Page, type Piece } from "@/types/form";
import { formulaireType } from "@/lib/formulaires-types";

function Cur() {
  return <span className="cur">_</span>;
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}
function move<T>(arr: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return arr;
  const copy = [...arr];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy;
}

const TYPES: ChampType[] = ["texte", "zone", "date", "tel", "nombre", "choix", "case"];

export default function FormBuilder({
  slug,
  nom,
  initial,
  cours = [],
  stripeConnecte = false,
}: {
  slug: string;
  nom: string;
  initial: FormConfig;
  cours?: { id: string; nom: string }[];
  stripeConnecte?: boolean;
}) {
  const [config, setConfig] = useState<FormConfig>(initial.pages || initial.pieces ? initial : { pages: [], pieces: [] });
  const [state, setState] = useState<"idle" | "saving" | "ok" | "err">("idle");

  const setPages = (pages: Page[]) => setConfig((c) => ({ ...c, pages }));
  const setPieces = (pieces: Piece[]) => setConfig((c) => ({ ...c, pieces }));

  function patchPage(pid: string, patch: Partial<Page>) {
    setPages(config.pages.map((p) => (p.id === pid ? { ...p, ...patch } : p)));
  }
  function patchChamp(pid: string, cid: string, patch: Partial<Champ>) {
    setPages(config.pages.map((p) => (p.id === pid ? { ...p, champs: p.champs.map((ch) => (ch.id === cid ? { ...ch, ...patch } : ch)) } : p)));
  }

  async function save() {
    setState("saving");
    const res = await saveFormConfig(slug, config);
    setState(res?.ok ? "ok" : "err");
  }

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">FORMULAIRE D&apos;INSCRIPTION<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Votre formulaire d&apos;inscription.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          La base ci-dessous est intégrée d&apos;office. Ajoutez ensuite vos champs et vos pièces,
          page par page.
        </p>

        {/* BASE VERROUILLÉE — visible dans le builder pour que le président voie le
            formulaire complet, pas seulement ses ajouts (retour de Mathieu, 15/07/2026 :
            « il n'y a pas le bloc identité »). Non modifiable : c'est le socle commun. */}
        <div className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">BASE DU FORMULAIRE — TOUJOURS PRÉSENTE<Cur /></p>
          <div className="mt-4 border border-line bg-bg-alt">
            <div className="mono flex items-center justify-between border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-label text-ink-faint">
              <span>IDENTITÉ &amp; CONTACT</span>
              <span>VERROUILLÉ</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              {[
                "Prénom *",
                "Nom *",
                "Date de naissance *",
                "Adresse *",
                "Email *",
                "Téléphone",
              ].map((c) => (
                <div key={c} className="bg-bg-alt px-4 py-3 text-[13px] text-ink-soft">{c}</div>
              ))}
            </div>
            <div className="mono border-t border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-label text-ink-faint">
              PUIS, AUTOMATIQUEMENT
            </div>
            <div className="divide-y divide-line">
              <div className="px-4 py-3 text-[13px] text-ink-soft">Choix du cours — vos cours et tarifs, à jour en permanence</div>
              <div className="px-4 py-3 text-[13px] text-ink-soft">Responsable légal (identité, email, téléphone) — dès que la date de naissance indique un mineur</div>
              <div className="px-4 py-3 text-[13px] text-ink-soft">Questionnaire de santé QS-SPORT — version majeur ou mineur selon la date de naissance</div>
              <div className="px-4 py-3 text-[13px] text-ink-soft">Création du compte adhérent (mot de passe) et paiement selon vos réglages</div>
            </div>
          </div>
        </div>

        {/* Formulaire encore vide : proposer un modèle complet plutôt qu'une page blanche.
            Le modèle se charge dans l'éditeur — rien n'est enregistré avant le clic ENREGISTRER. */}
        {config.pages.length === 0 && config.pieces.length === 0 ? (
          <div className="mt-8 border border-line bg-bg-alt p-5">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PARTEZ D&apos;UN MODÈLE<Cur /></p>
            <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
              Contact d&apos;urgence, autorisations, pièces à fournir : chargez une base complète,
              puis ajustez chaque champ à votre club.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setConfig(formulaireType("sportive"))}
                className="mono border border-line bg-paper px-5 py-3 text-[12px] text-ink hover:border-ink"
              >
                ASSOCIATION SPORTIVE →
              </button>
              <button
                type="button"
                onClick={() => setConfig(formulaireType("culturelle"))}
                className="mono border border-line bg-paper px-5 py-3 text-[12px] text-ink hover:border-ink"
              >
                ASSOCIATION CULTURELLE →
              </button>
            </div>
            <p className="mono mt-3 text-[11px] text-ink-faint">
              Sportive : certificat médical, pièce d&apos;identité, urgence. Culturelle : niveau de pratique, autorisations.
            </p>
          </div>
        ) : null}

        {/* PAGES */}
        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAGES<Cur /></p>
          <div className="mt-6 space-y-6">
            {config.pages.map((page, pi) => (
              <div key={page.id} className="border border-line bg-paper">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <span className="mono text-[11px] text-ink-faint">{String(pi + 1).padStart(2, "0")}</span>
                  <input
                    value={page.titre}
                    onChange={(e) => patchPage(page.id, { titre: e.target.value })}
                    placeholder="Titre de la page"
                    className="flex-1 border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
                  />
                  <Btn onClick={() => setPages(move(config.pages, pi, -1))}>↑</Btn>
                  <Btn onClick={() => setPages(move(config.pages, pi, 1))}>↓</Btn>
                  <Btn onClick={() => setPages(config.pages.filter((p) => p.id !== page.id))}>✕</Btn>
                </div>

                <div className="divide-y divide-line">
                  {page.champs.map((ch, ci) => (
                    <div key={ch.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                      <select
                        value={ch.type}
                        onChange={(e) => patchChamp(page.id, ch.id, { type: e.target.value as ChampType })}
                        className="border border-line bg-paper px-2 py-2 text-[13px] outline-none focus:border-ink"
                      >
                        {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                      </select>
                      <input
                        value={ch.label}
                        onChange={(e) => patchChamp(page.id, ch.id, { label: e.target.value })}
                        placeholder="Libellé du champ"
                        className="min-w-[180px] flex-1 border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
                      />
                      {ch.type === "choix" ? (
                        <input
                          value={(ch.options ?? []).join(", ")}
                          onChange={(e) => patchChamp(page.id, ch.id, { options: e.target.value.split(",").map((o) => o.trim()).filter(Boolean) })}
                          placeholder="Choix (séparés par des virgules)"
                          className="min-w-[160px] flex-1 border border-line bg-paper px-3 py-2 text-[13px] outline-none focus:border-ink"
                        />
                      ) : null}
                      <label className="mono flex items-center gap-1.5 text-[11px] text-ink-soft">
                        <input type="checkbox" checked={ch.obligatoire} onChange={(e) => patchChamp(page.id, ch.id, { obligatoire: e.target.checked })} />
                        OBLIGATOIRE
                      </label>
                      <Btn onClick={() => patchPage(page.id, { champs: move(page.champs, ci, -1) })}>↑</Btn>
                      <Btn onClick={() => patchPage(page.id, { champs: move(page.champs, ci, 1) })}>↓</Btn>
                      <Btn onClick={() => patchPage(page.id, { champs: page.champs.filter((c) => c.id !== ch.id) })}>✕</Btn>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line px-4 py-3">
                  <Btn onClick={() => patchPage(page.id, { champs: [...page.champs, { id: uid(), type: "texte", label: "", obligatoire: true }] })}>
                    + AJOUTER UN CHAMP
                  </Btn>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPages([...config.pages, { id: uid(), titre: `Page ${config.pages.length + 1}`, champs: [] }])}
            className="mono mt-6 border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
          >
            + AJOUTER UNE PAGE
          </button>
        </div>

        {/* PIÈCES */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PIÈCES À FOURNIR<Cur /></p>
          <div className="mt-6 divide-y divide-line border border-line bg-paper">
            {config.pieces.length === 0 ? (
              <p className="px-4 py-4 text-[14px] text-ink-soft">Aucune pièce demandée pour l&apos;instant.</p>
            ) : null}
            {config.pieces.map((pc, i) => (
              <div key={pc.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <input
                  value={pc.label}
                  onChange={(e) => setPieces(config.pieces.map((p) => (p.id === pc.id ? { ...p, label: e.target.value } : p)))}
                  placeholder="Ex. Certificat médical"
                  className="min-w-[180px] flex-1 border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
                />
                <select
                  value={pc.mode}
                  onChange={(e) => setPieces(config.pieces.map((p) => (p.id === pc.id ? { ...p, mode: e.target.value as Piece["mode"] } : p)))}
                  className="border border-line bg-paper px-2 py-2 text-[13px] outline-none focus:border-ink"
                >
                  <option value="upload">Téléverser</option>
                  <option value="email">Par email</option>
                  <option value="deux">Les deux</option>
                </select>
                <select
                  value={pc.cours_id ?? ""}
                  onChange={(e) => setPieces(config.pieces.map((p) => (p.id === pc.id ? { ...p, cours_id: e.target.value || null } : p)))}
                  className="border border-line bg-paper px-2 py-2 text-[13px] outline-none focus:border-ink"
                  title="Cette pièce n'est demandée que pour ce cours"
                >
                  <option value="">Tous les cours</option>
                  {cours.map((c) => (
                    <option key={c.id} value={c.id}>{c.nom} uniquement</option>
                  ))}
                </select>
                <label className="mono flex items-center gap-1.5 text-[11px] text-ink-soft">
                  <input type="checkbox" checked={pc.obligatoire} onChange={(e) => setPieces(config.pieces.map((p) => (p.id === pc.id ? { ...p, obligatoire: e.target.checked } : p)))} />
                  OBLIGATOIRE
                </label>
                <Btn onClick={() => setPieces(move(config.pieces, i, -1))}>↑</Btn>
                <Btn onClick={() => setPieces(move(config.pieces, i, 1))}>↓</Btn>
                <Btn onClick={() => setPieces(config.pieces.filter((p) => p.id !== pc.id))}>✕</Btn>
              </div>
            ))}
          </div>
          <button
            onClick={() => setPieces([...config.pieces, { id: uid(), label: "", obligatoire: true, mode: "deux" }])}
            className="mono mt-6 border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
          >
            + AJOUTER UNE PIÈCE
          </button>
        </div>

        {/* PAIEMENT */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENT<Cur /></p>
          <div className="mt-6 border border-line bg-paper px-5 py-4">
            {/* Le réglage vit désormais dans le cockpit, à côté de Stripe : un seul endroit,
                une seule vérité. Deux écrans qui pilotent la même chose finissent par se contredire. */}
            <p className="text-[15px] font-medium">Paiement en plusieurs fois</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Le nombre maximal de mensualités (jusqu&apos;à 12) se règle dans le cockpit, sous la
              carte Stripe. L&apos;adhérent choisit ensuite librement dans cette limite.
            </p>
            <p className="mono mt-4 border-t border-line pt-4 text-[11px] leading-relaxed" style={{ color: "#8A6508" }}>
              ⚠ ATTENTION — Stripe facture des frais à CHAQUE prélèvement (≈ 1,5 % + 0,25 € par
              transaction pour une carte européenne). Plus il y a d&apos;échéances, plus la part fixe
              est prélevée souvent : le club perçoit un peu moins qu&apos;en paiement unique.
            </p>
            {!stripeConnecte ? (
              <p className="mono mt-3 text-[11px] text-ink-faint">
                Stripe n&apos;est pas encore connecté : cette option ne s&apos;affichera aux adhérents
                qu&apos;une fois Stripe connecté depuis Aujourd&apos;hui_.
              </p>
            ) : null}
          </div>
        </div>

        {/* SAVE */}
        <div className="mt-14 flex items-center gap-5 border-t border-line pt-6">
          <button onClick={save} disabled={state === "saving"} className="mono bg-ink px-6 py-3 text-[13px] text-paper hover:bg-ink/90 disabled:opacity-40">
            {state === "saving" ? "ENREGISTREMENT…" : "ENREGISTRER →"}
          </button>
          {state === "ok" ? <span className="mono text-[12px] text-brand">✓ Enregistré</span> : null}
          {state === "err" ? <span className="mono text-[12px]" style={{ color: "#B23B3B" }}>Erreur d&apos;enregistrement</span> : null}
          <Link href={`/${slug}/inscription`} className="mono ml-auto text-[12px] text-ink-soft hover:text-ink">VOIR LE FORMULAIRE →</Link>
        </div>
      </div>
    </main>
  );
}

function Btn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} type="button" className="mono border border-line px-2 py-1.5 text-[11px] text-ink-soft hover:border-ink hover:text-ink">
      {children}
    </button>
  );
}
