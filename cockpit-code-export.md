# Klubster — Code du Cockpit (export pour analyse)

Contexte : Next.js 14 App Router + TypeScript + Tailwind + Supabase (RLS multi-tenant par organisation_id) + Stripe Connect. Le Cockpit est l'espace admin d'un club, sous /[asso]/cockpit. Généré le 2026-07-02.

---

## src/app/[asso]/cockpit/actualite/actions.ts

```tsx
"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";

async function gardeAdmin(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect(`/${slug}/cockpit`);
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/actualite`);
  }
  return org;
}

export async function enregistrerActualite(slug: string, formData: FormData) {
  const org = await gardeAdmin(slug);
  const supabase = createSupabaseServerClient();

  const texte = String(formData.get("texte") ?? "").trim();
  let imageUrl: string | null = org.actualite?.image_url ?? null;

  const file = formData.get("image");
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    const f = file as File;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${org.id}/hero-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("actualites")
      .upload(path, f, { upsert: true, contentType: f.type || undefined });
    if (upErr) {
      console.error("upload actualite", upErr.message);
    } else {
      imageUrl = supabase.storage.from("actualites").getPublicUrl(path).data.publicUrl;
    }
  }

  const actualite = texte || imageUrl ? { texte: texte || null, image_url: imageUrl } : null;
  const { error } = await supabase.from("organisations").update({ actualite }).eq("id", org.id);
  if (error) console.error("enregistrerActualite", error.message);

  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?ok=1`);
}

export async function supprimerActualite(slug: string) {
  const org = await gardeAdmin(slug);
  const supabase = createSupabaseServerClient();
  await supabase.from("organisations").update({ actualite: null }).eq("id", org.id);
  revalidatePath(`/${slug}`);
  redirect(`/${slug}/cockpit/actualite?supprime=1`);
}
```

---

## src/app/[asso]/cockpit/actualite/page.tsx

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { enregistrerActualite, supprimerActualite } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function ActualitePage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { ok?: string; supprime?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/actualite`);
  }
  const act = org.actualite;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER · ACTUALITÉ<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">À LA UNE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Une actualité dans votre hero.</h1>
        <p className="mt-3 text-ink-soft">
          Un message — et/ou une image — affiché tout en haut de votre vitrine. Laissez tout vide pour ne rien afficher.
        </p>

        {searchParams?.ok ? <p className="mono mt-6 text-[12px] text-brand">✓ Actualité enregistrée — visible sur votre vitrine.</p> : null}
        {searchParams?.supprime ? <p className="mono mt-6 text-[12px] text-ink-soft">Actualité supprimée.</p> : null}

        {act?.image_url ? (
          <div className="mt-8">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">IMAGE ACTUELLE</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={act.image_url} alt="Actualité" className="mt-2 h-44 w-full border border-line object-cover" />
          </div>
        ) : null}

        <form action={enregistrerActualite.bind(null, org.slug)} className="mt-8 space-y-6">
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">MESSAGE</label>
            <textarea
              name="texte"
              rows={3}
              defaultValue={act?.texte ?? ""}
              placeholder="Reprise des cours le 4 septembre. Inscriptions ouvertes."
              className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">IMAGE (OPTIONNELLE)</label>
            <input type="file" name="image" accept="image/*" className="mt-2 block w-full text-[13px]" />
            <p className="mono mt-2 text-[11px] text-ink-faint">JPG ou PNG, format paysage conseillé. Remplace l&apos;image actuelle.</p>
          </div>
          <button className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90">ENREGISTRER →</button>
        </form>

        {act ? (
          <form action={supprimerActualite.bind(null, org.slug)} className="mt-4">
            <button className="mono text-[12px] text-ink-soft hover:text-ink">Supprimer l&apos;actualité</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
```

---

## src/app/[asso]/cockpit/communication/Communication.tsx

```tsx
"use client";

import { useMemo, useState } from "react";

type Membre = { email: string; coursIds: string[] };
type Cours = { id: string; nom: string };

export default function Communication({
  membres,
  cours,
  contactEmail,
}: {
  membres: Membre[];
  cours: Cours[];
  contactEmail: string | null;
}) {
  const [groupe, setGroupe] = useState<string>("tous");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [copie, setCopie] = useState(false);

  const emails = useMemo(() => {
    const list = groupe === "tous" ? membres : membres.filter((m) => m.coursIds.includes(groupe));
    return Array.from(new Set(list.map((m) => m.email)));
  }, [groupe, membres]);

  const mailto =
    `mailto:${contactEmail ?? ""}` +
    `?bcc=${encodeURIComponent(emails.join(","))}` +
    `&subject=${encodeURIComponent(objet)}` +
    `&body=${encodeURIComponent(message)}`;

  const trop = emails.length > 80;

  async function copier() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papier indisponible */
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="border border-line bg-paper px-5 py-4">
        <label className="mono text-[10px] uppercase tracking-label text-ink-soft">DESTINATAIRES</label>
        <select
          value={groupe}
          onChange={(e) => setGroupe(e.target.value)}
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        >
          <option value="tous">Tous les adhérents</option>
          {cours.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <p className="mono mt-2 text-[11px] text-ink-soft">
          {emails.length} destinataire{emails.length > 1 ? "s" : ""} avec un email
        </p>
      </div>

      <div className="border border-line bg-paper px-5 py-4">
        <label className="mono text-[10px] uppercase tracking-label text-ink-soft">OBJET</label>
        <input
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="Reprise des cours le 4 septembre"
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        />
        <label className="mono mt-5 block text-[10px] uppercase tracking-label text-ink-soft">MESSAGE</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        />
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={emails.length ? mailto : undefined}
          className={`mono px-6 py-3 text-[12px] ${emails.length ? "bg-brand text-white hover:opacity-90" : "pointer-events-none bg-bg-alt text-ink-faint"}`}
        >
          OUVRIR MON EMAIL →
        </a>
        <button onClick={copier} className="mono text-[12px] text-ink-soft hover:text-ink">
          {copie ? "✓ adresses copiées" : "copier les adresses"}
        </button>
      </div>

      <p className="mono text-[11px] leading-relaxed text-ink-faint">
        L’email s’ouvre dans votre messagerie, adresses en copie cachée (Cci) — personne ne voit les autres.
        {trop ? " Au-delà de ~80 destinataires, certaines messageries tronquent la liste : utilisez « copier les adresses »." : ""}
      </p>
    </div>
  );
}
```

---

## src/app/[asso]/cockpit/communication/page.tsx

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Communication from "./Communication";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function MessageriePage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/communication`);
  }

  const supabase = createSupabaseServerClient();
  const { data: adhData } = await supabase.from("adherents").select("id, email").eq("organisation_id", org.id);
  const { data: insData } = await supabase.from("adhesions").select("adherent_id, cours_id").eq("organisation_id", org.id);
  const { data: coursData } = await supabase.from("cours").select("id, nom").eq("organisation_id", org.id).order("ordre");

  const adherents = (adhData ?? []) as { id: string; email: string | null }[];
  const adhesions = (insData ?? []) as { adherent_id: string; cours_id: string | null }[];
  const cours = (coursData ?? []) as { id: string; nom: string }[];

  const coursByAdh = new Map<string, string[]>();
  for (const r of adhesions) {
    if (!r.cours_id) continue;
    const arr = coursByAdh.get(r.adherent_id) ?? [];
    arr.push(r.cours_id);
    coursByAdh.set(r.adherent_id, arr);
  }
  const membres = adherents
    .filter((a) => a.email)
    .map((a) => ({ email: a.email as string, coursIds: coursByAdh.get(a.id) ?? [] }));

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Écrire à vos adhérents.</h1>
        <p className="mt-3 text-ink-soft">
          Choisissez un groupe, écrivez votre message : Klubster prépare l’email et l’ouvre dans votre messagerie,
          les adhérents en copie cachée.
        </p>

        {membres.length === 0 ? (
          <p className="mono mt-8 text-[12px] text-ink-soft">Aucun adhérent avec un email pour le moment.</p>
        ) : (
          <Communication membres={membres} cours={cours} contactEmail={org.email_contact} />
        )}
      </div>
    </main>
  );
}
```

---

## src/app/[asso]/cockpit/formulaire/FormBuilder.tsx

```tsx
"use client";
import { useState } from "react";
import Link from "next/link";
import { saveFormConfig } from "./actions";
import { TYPE_LABELS, type FormConfig, type Champ, type ChampType, type Page, type Piece } from "@/types/form";

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

export default function FormBuilder({ slug, nom, initial }: { slug: string; nom: string; initial: FormConfig }) {
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
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">FORMULAIRE D&apos;INSCRIPTION<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Votre formulaire d&apos;inscription.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Prénom, nom, email et choix du cours sont toujours présents. Ajoutez ici vos champs et vos
          pièces, page par page.
        </p>

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
```

---

## src/app/[asso]/cockpit/formulaire/actions.ts

```tsx
"use server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { FormConfig } from "@/types/form";

export async function saveFormConfig(slug: string, config: FormConfig): Promise<{ ok?: boolean; error?: string }> {
  const org = await getOrganisationBySlug(slug);
  const profile = await getProfile();
  if (!org || !profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    return { error: "Non autorisé." };
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ form_config: config }).eq("id", org.id);
  if (error) return { error: error.message };
  return { ok: true };
}
```

---

## src/app/[asso]/cockpit/formulaire/page.tsx

```tsx
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import FormBuilder from "./FormBuilder";
import type { FormConfig } from "@/types/form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/formulaire`);
  }
  const config: FormConfig = org.form_config ?? { pages: [], pieces: [] };
  return <FormBuilder slug={org.slug} nom={org.nom} initial={config} />;
}
```

---

## src/app/[asso]/cockpit/page.tsx

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCockpitStats } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { deconnexion } from "@/app/connexion/actions";
import { connecterStripe } from "./stripe-actions";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const NAV = ["AUJOURD'HUI", "ÉQUIPAGE", "TOUR DE CONTRÔLE", "TRÉSORERIE", "MESSAGERIE", "DOSSIERS", "JOURNAL", "ATELIER"];

export default async function Cockpit({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { stripe?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  const profile = await getProfile();
  const autorise = profile && (profile.organisation_id === org.id || profile.role === "super_admin");
  if (!autorise) redirect(`/connexion?next=/${org.slug}/cockpit`);

  const s = await getCockpitStats(org.slug);
  const aMettreAJour = s.enAttente + s.enRetard;
  const prenom = profile?.prenom?.trim();
  const stripeConnecte = !!org.stripe_account_id;
  const connecterAvecSlug = connecterStripe.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <div className="flex items-center gap-5">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">{org.nom} · MISSION 2026</span>
          <form action={deconnexion}>
            <button className="mono text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">DÉCONNEXION</button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        <nav className="border-b border-line px-6 py-6 md:border-b-0 md:border-r md:px-7">
          {NAV.map((label, i) => {
            const actif = i === 0;
            return (
              <div key={label} className={`mono py-[10px] text-[12px] tracking-wide ${actif ? "font-bold text-ink" : "text-ink-soft"}`}>
                {String(i + 1).padStart(2, "0")} {label}
                {actif ? <Cur /> : <span className="text-ink-faint">_</span>}
              </div>
            );
          })}
          <div className="mono mt-6 border-t border-line pt-5">
            <div className="text-[10px] uppercase tracking-label text-ink-soft">TRÉSORERIE</div>
            <div className="mt-2 text-[12px] text-brand">✓ reversée direct</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">0 % commission</div>
          </div>
        </nav>

        <div>
          <div className="border-b border-line px-6 py-8 md:px-10 md:py-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              AUJOURD&apos;HUI<Cur /> <span className="text-ink-faint">· Mission du jour</span>
            </p>
            <h1 className="mt-4 text-[26px] font-medium tracking-[-0.01em] md:text-[30px]">
              Bonsoir{prenom ? `, ${prenom}` : ""}.
            </h1>
            <p className="mt-3 max-w-prose text-lg text-ink-soft">
              Tout est prêt pour le prochain entraînement.{" "}
              {aMettreAJour > 0 ? (
                <span className="text-ink">Il reste {aMettreAJour} dossier{aMettreAJour > 1 ? "s" : ""} à mettre à jour.</span>
              ) : (
                <span className="text-ink">Tous les dossiers sont à jour.</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <Kpi n={s.equipage.toLocaleString("fr-FR")} label="EN ÉQUIPAGE" />
            <Kpi n={String(s.enAttente)} label="DOSSIERS EN ATTENTE" />
            <Kpi n={String(s.enRetard)} label="COTISATIONS EN RETARD" />
            <Kpi n={formatPrix(s.tresorerieCentimes)} label="TRÉSORERIE · SAISON" />
          </div>

          {/* PAIEMENTS / STRIPE */}
          <div className="border-b border-line px-6 py-7 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENTS<Cur /></p>
            {stripeConnecte ? (
              <p className="mt-4 text-[15px]">
                <span className="mono text-brand">✓</span> Stripe connecté. Les cotisations sont encaissées
                directement sur le compte du club — Klubster ne prend aucune commission.
              </p>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-prose text-[15px] text-ink-soft">
                  Connectez Stripe pour encaisser les cotisations en ligne — l&apos;argent arrive
                  directement sur votre compte, <span className="text-ink">0 % de commission</span>.
                </p>
                <form action={connecterAvecSlug}>
                  <button className="mono whitespace-nowrap bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                    CONNECTER STRIPE →
                  </button>
                </form>
              </div>
            )}
            {searchParams?.stripe === "nonconfig" ? (
              <p className="mono mt-3 text-[11px] text-ink-faint">
                Stripe n&apos;est pas encore configuré côté plateforme (clé API manquante).
              </p>
            ) : null}
          </div>

          {/* CONFIGURATION */}
          <div className="border-b border-line px-6 py-7 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER<Cur /></p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/${org.slug}/cockpit/actualite`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">ACTUALITÉ À LA UNE →</Link>
              <Link href={`/${org.slug}/cockpit/communication`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">MESSAGERIE →</Link>
              <Link href={`/${org.slug}/cockpit/formulaire`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">FORMULAIRE D&apos;INSCRIPTION →</Link>
              <Link href={`/${org.slug}/cockpit/scanner`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">SCANNER / APPEL →</Link>
              <Link href={`/${org.slug}/cockpit/paiements`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">ENCAISSEMENTS →</Link>
            </div>
          </div>

          <div className="px-6 pt-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              TOUR DE CONTRÔLE<Cur /> <span className="text-ink-faint">03</span>
            </p>
          </div>
          <div className="px-6 pb-10 pt-3 md:px-10">
            <Ligne idx="01" action>Cotisations en retard — <span className="mono">{s.enRetard}</span> adhérents</Ligne>
            <Ligne idx="02" action>Dossiers en attente — <span className="mono">{s.enAttente}</span> adhérents</Ligne>
            <Ligne idx="03" ok>Paiements à jour — <span className="mono">{s.paye}</span> adhérents</Ligne>
          </div>
        </div>
      </div>

      <div className="mono flex justify-between border-t border-line px-6 py-4 text-[11px] md:px-8">
        <span className="text-ink-soft">JOURNAL DE BORD</span>
        <span className="text-ink-faint">klubster.fr/{org.slug}/cockpit</span>
      </div>
    </main>
  );
}

function Kpi({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-paper px-5 py-6 md:px-7">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-2 text-[30px] font-bold tracking-[-0.02em]">{n}</div>
    </div>
  );
}

function Ligne({ idx, children, action, ok }: { idx: string; children: React.ReactNode; action?: boolean; ok?: boolean }) {
  return (
    <div className="flex items-center gap-5 border-b border-line py-4 last:border-b-0">
      <span className="mono text-[11px] text-ink-faint">{idx}</span>
      <span className="flex-1 text-[15px]">{children}</span>
      {action ? <button className="mono border border-ink px-3 py-1.5 text-[11px] hover:bg-ink hover:text-paper">RELANCER →</button> : null}
      {ok ? <span className="mono text-[12px] text-brand">✓ À JOUR</span> : null}
    </div>
  );
}
```

---

## src/app/[asso]/cockpit/paiements/actions.ts

```tsx
"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function marquerEncaisse(slug: string, adhesionId: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/paiements`);
  }
  const supabase = createSupabaseServerClient();
  await supabase.rpc("marquer_encaisse", { p_adhesion_id: adhesionId });
  redirect(`/${slug}/cockpit/paiements`);
}
```

---

## src/app/[asso]/cockpit/paiements/page.tsx

```tsx
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";
import { marquerEncaisse } from "./actions";

export const dynamic = "force-dynamic";

function Cur() { return <span className="cur">_</span>; }

export default async function PaiementsPage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/paiements`);
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, mode_paiement, adherent:adherents(prenom, nom), cours:cours(nom)")
    .eq("organisation_id", org.id).eq("statut", "en_attente").in("mode_paiement", ["cheque", "especes"])
    .order("created_at", { ascending: false });
  const lignes = (data ?? []) as unknown as Array<{
    id: string; montant_centimes: number; mode_paiement: string;
    adherent: { prenom: string; nom: string } | null; cours: { nom: string } | null;
  }>;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">TRÉSORERIE · ENCAISSEMENTS<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">RÈGLEMENTS À ENCAISSER — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Chèques &amp; espèces.</h1>
        <p className="mt-3 text-ink-soft">Marquez un règlement comme reçu : l&apos;adhésion passe en « payé ».</p>

        <div className="mt-10 divide-y divide-line border border-line bg-paper">
          {lignes.length === 0 ? (
            <p className="px-5 py-6 text-[15px] text-ink-soft">Aucun règlement en attente. Tout est à jour.</p>
          ) : null}
          {lignes.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex-1">
                <div className="text-[15px] font-medium">{l.adherent ? `${l.adherent.prenom} ${l.adherent.nom}` : "Adhérent"}</div>
                <div className="text-[13px] text-ink-soft">{l.cours?.nom ?? "—"} · {l.mode_paiement === "cheque" ? "Chèque" : "Espèces"}</div>
              </div>
              <span className="mono text-[15px] font-bold">{formatPrix(l.montant_centimes)}</span>
              <form action={marquerEncaisse.bind(null, org.slug, l.id)}>
                <button className="mono border border-ink px-4 py-2 text-[11px] hover:bg-ink hover:text-paper">MARQUER ENCAISSÉ →</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
```

---

## src/app/[asso]/cockpit/scanner/Scanner.tsx

```tsx
"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { verifierAdherent, marquerPresent, rechercher, type VerifResult } from "./actions";

function Cur() { return <span className="cur">_</span>; }

export default function Scanner({ slug, nom, accent }: { slug: string; nom: string; accent: string }) {
  const [cam, setCam] = useState(false);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<VerifResult | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ id: string; prenom: string; nom: string }[]>([]);
  const [present, setPresent] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function verifier(id: string) {
    setCurrentId(id);
    const r = await verifierAdherent(slug, id);
    setResult(r);
    setPresent(!!r.present);
  }

  useEffect(() => {
    if (!cam) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    async function start() {
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (!BD) { setCamOk(false); return; }
      try {
        const detector = new BD({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamOk(true);
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) { setCam(false); verifier(codes[0].rawValue.trim()); return; }
          } catch { /* ignore */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch { setCamOk(false); }
    }
    start();
    return () => { stopped = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">SCANNER · APPEL<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PRÉSENCE — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Faire l&apos;appel.</h1>

        {/* Caméra */}
        <div className="mt-8">
          {!cam ? (
            <button onClick={() => { setCam(true); setCamOk(null); }} className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
              SCANNER UN QR CODE →
            </button>
          ) : (
            <div className="border border-line bg-paper p-3">
              <video ref={videoRef} className="w-full" muted playsInline />
              <div className="mt-2 flex items-center justify-between">
                <span className="mono text-[11px] text-ink-soft">Présentez le QR du membre…</span>
                <button onClick={() => setCam(false)} className="mono text-[11px] text-ink-soft hover:text-ink">ARRÊTER</button>
              </div>
            </div>
          )}
          {camOk === false ? (
            <p className="mono mt-3 text-[11px] text-ink-faint">Caméra non disponible sur ce navigateur — utilisez la recherche par nom.</p>
          ) : null}
        </div>

        {/* Recherche par nom */}
        <div className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">OU RECHERCHER<Cur /></p>
          <input
            value={q}
            onChange={async (e) => { const v = e.target.value; setQ(v); setList(await rechercher(slug, v)); }}
            placeholder="Nom ou prénom"
            className="mt-3 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          {list.length > 0 ? (
            <div className="mt-2 divide-y divide-line border border-line bg-paper">
              {list.map((m) => (
                <button key={m.id} onClick={() => { setQ(""); setList([]); verifier(m.id); }} className="block w-full px-4 py-3 text-left text-[14px] hover:bg-bg-alt">
                  {m.prenom} {m.nom}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Résultat */}
        {result ? (
          <div className="mt-10 border border-line bg-paper p-6">
            {!result.ok ? (
              <p className="mono text-[13px]" style={{ color: "#B23B3B" }}>{result.error}</p>
            ) : (
              <>
                <div className="text-2xl font-medium">{result.prenom} {result.nom}</div>
                <div className="text-ink-soft">{result.cours ?? "—"}</div>
                <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
                  <Etat label="RÈGLEMENT" ok={result.regle} okText="À jour" koText="Non réglé" />
                  <Etat label="DOSSIER" ok={(result.piecesManquantes ?? 0) === 0} okText="Complet" koText={`${result.piecesManquantes} pièce(s) manquante(s)`} />
                </div>
                <div className="mt-6">
                  {present ? (
                    <span className="mono text-[13px]" style={{ color: accent }}>✓ PRÉSENT AUJOURD&apos;HUI</span>
                  ) : (
                    <button
                      onClick={async () => { if (currentId) { const r = await marquerPresent(slug, currentId); if (r.ok) setPresent(true); } }}
                      className="mono px-6 py-3 text-[13px] text-white"
                      style={{ background: accent }}
                    >
                      MARQUER PRÉSENT →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Etat({ label, ok, okText, koText }: { label: string; ok?: boolean; okText: string; koText: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-2 text-[15px] font-bold" style={{ color: ok ? "#279B65" : "#B23B3B" }}>
        {ok ? `✓ ${okText}` : `✕ ${koText}`}
      </div>
    </div>
  );
}
```

---

## src/app/[asso]/cockpit/scanner/actions.ts

```tsx
"use server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface VerifResult {
  ok: boolean;
  prenom?: string; nom?: string; cours?: string | null;
  regle?: boolean; piecesManquantes?: number; present?: boolean;
  error?: string;
}

async function guard(slug: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) return null;
  return org;
}

export async function verifierAdherent(slug: string, adherentId: string): Promise<VerifResult> {
  if (!(await guard(slug))) return { ok: false, error: "Non autorisé." };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verifier_adherent", { p_adherent_id: adherentId });
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (error || !row) return { ok: false, error: "Adhérent introuvable." };
  return {
    ok: true,
    prenom: row.prenom as string, nom: row.nom as string, cours: (row.cours as string) ?? null,
    regle: row.regle as boolean, piecesManquantes: row.pieces_manquantes as number, present: row.present_aujourdhui as boolean,
  };
}

export async function marquerPresent(slug: string, adherentId: string): Promise<{ ok: boolean }> {
  if (!(await guard(slug))) return { ok: false };
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("marquer_present", { p_adherent_id: adherentId });
  return { ok: !error };
}

export async function rechercher(slug: string, q: string): Promise<{ id: string; prenom: string; nom: string }[]> {
  const org = await guard(slug);
  if (!org) return [];
  const clean = q.replace(/[^a-zà-ÿ0-9 -]/gi, "").trim();
  if (clean.length < 2) return [];
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adherents").select("id, prenom, nom").eq("organisation_id", org.id)
    .or(`nom.ilike.%${clean}%,prenom.ilike.%${clean}%`).order("nom").limit(12);
  return (data as { id: string; prenom: string; nom: string }[]) ?? [];
}
```

---

## src/app/[asso]/cockpit/scanner/page.tsx

```tsx
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import Scanner from "./Scanner";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/scanner`);
  }
  return <Scanner slug={org.slug} nom={org.nom} accent={org.couleur_primaire ?? "#111111"} />;
}
```

---

## src/app/[asso]/cockpit/stripe-actions.ts

```tsx
"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createConnectedAccount, createAccountLink, stripeConfigured } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

export async function connecterStripe(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }
  if (!stripeConfigured()) redirect(`/${slug}/cockpit?stripe=nonconfig`);

  const supabase = createSupabaseServerClient();
  let acct = org.stripe_account_id;
  if (!acct) {
    const account = await createConnectedAccount(org.email_contact);
    acct = account.id as string;
    await supabase.from("organisations").update({ stripe_account_id: acct }).eq("id", org.id);
  }
  const link = await createAccountLink(acct, `${BASE}/${slug}/cockpit`, `${BASE}/${slug}/cockpit?stripe=ok`);
  redirect(link.url as string);
}
```

---

## Dépendances utilisées par le Cockpit

### src/lib/auth.ts

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  organisation_id: string | null;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  role: string;
}

export async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}
```

### src/lib/queries.ts

```ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Organisation, Cours } from "@/types/db";

// Charge une association publiée par son slug (ex. "usmboxe").
// La lecture publique est autorisée par la politique RLS "publie = true".
export async function getOrganisationBySlug(slug: string): Promise<Organisation | null> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("organisations")
    .select("*")
    .eq("slug", slug)
    .eq("publie", true)
    .maybeSingle();
  if (error) {
    console.error("getOrganisationBySlug", error.message);
    return null;
  }
  return data as Organisation | null;
}

export async function getCoursByOrganisation(organisationId: string): Promise<Cours[]> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cours")
    .select("*")
    .eq("organisation_id", organisationId)
    .order("ordre", { ascending: true });
  if (error) {
    console.error("getCoursByOrganisation", error.message);
    return [];
  }
  return (data ?? []) as Cours[];
}

export interface CockpitStats {
  equipage: number;
  enAttente: number;
  enRetard: number;
  paye: number;
  tresorerieCentimes: number;
}

// Agrégats du Cockpit via une fonction SECURITY DEFINER (aucune donnée personnelle exposée).
export async function getCockpitStats(slug: string): Promise<CockpitStats> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cockpit_stats", { p_slug: slug });
  const row = (data as Array<Record<string, number>> | null)?.[0];
  if (error || !row) {
    if (error) console.error("getCockpitStats", error.message);
    return { equipage: 0, enAttente: 0, enRetard: 0, paye: 0, tresorerieCentimes: 0 };
  }
  return {
    equipage: row.equipage,
    enAttente: row.en_attente,
    enRetard: row.en_retard,
    paye: row.paye,
    tresorerieCentimes: Number(row.tresorerie_centimes),
  };
}
```

### src/lib/format.ts

```ts
import type { Cours, Creneau } from "@/types/db";

const JOURS_ORDRE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export function formatPrix(centimes: number): string {
  if (!centimes) return "Gratuit";
  const euros = centimes / 100;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: euros % 1 === 0 ? 0 : 2,
  }).format(euros);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// Construit une grille planning : pour chaque jour, la liste des créneaux (cours + horaire).
export interface CreneauAffiche extends Creneau {
  coursNom: string;
}
export function planningParJour(cours: Cours[]): { jour: string; creneaux: CreneauAffiche[] }[] {
  const map = new Map<string, CreneauAffiche[]>();
  for (const c of cours) {
    for (const cr of c.creneaux ?? []) {
      const arr = map.get(cr.jour) ?? [];
      arr.push({ ...cr, coursNom: c.nom });
      map.set(cr.jour, arr);
    }
  }
  return JOURS_ORDRE.filter((j) => map.has(j)).map((jour) => ({
    jour,
    creneaux: (map.get(jour) ?? []).sort((a, b) => a.debut.localeCompare(b.debut)),
  }));
}

// Lien Google Maps (carte "où nous trouver") à partir d'une adresse.
export function lienCarte(adresse: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adresse)}`;
}
export function embedCarte(adresse: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(adresse)}&output=embed`;
}
```

### src/types/db.ts

```ts
// Types reflétant le schéma multi-tenant Supabase (public.*).
// Chaque ligne porte un organisation_id (isolation RLS).
import type { FormConfig } from "@/types/form";

export type Role = "super_admin" | "admin_asso" | "encadrant" | "adherent";
export type PlanAbonnement = "starter" | "club" | "club_plus";
export type StatutAdhesion =
  | "en_attente" | "paye" | "en_retard" | "rembourse" | "annule";

export interface Creneau {
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
  debut: string; // "18:30"
  fin: string;   // "20:00"
  note?: string;
}

export interface Organisation {
  id: string;
  slug: string;
  nom: string;
  sport: string | null;
  theme_template: string | null; // template de design du site (src/lib/themes.ts)
  theme_mode: string | null;     // "blanc" | "noir"
  logo_url: string | null;
  couleur_primaire: string | null;
  adresse: string | null;
  email_contact: string | null;
  telephone: string | null;
  stripe_account_id: string | null;
  abonnement_plan: PlanAbonnement | null;
  publie: boolean;
  created_at: string;
  accroche: string | null;
  presentation: string | null;
  infos_pratiques: string | null;
  form_config: FormConfig | null;
  actualite: Actualite | null;
}

// Actualité « à la une » affichée dans le hero de la vitrine du club.
export interface Actualite {
  texte: string | null;
  image_url: string | null;
}

export interface Cours {
  id: string;
  organisation_id: string;
  nom: string;
  description: string | null;
  public_cible: string | null;
  age_min: number | null;
  age_max: number | null;
  tarif_centimes: number;
  places_max: number | null;
  creneaux: Creneau[];
  ordre: number | null;
}

export interface Adherent {
  id: string;
  organisation_id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  created_at: string;
}

export interface Adhesion {
  id: string;
  organisation_id: string;
  adherent_id: string;
  cours_id: string | null;
  saison: string | null;
  montant_centimes: number;
  statut: StatutAdhesion;
  created_at: string;
}
```

### src/types/form.ts

```ts
export type ChampType = "texte" | "zone" | "date" | "tel" | "nombre" | "choix" | "case";

export interface Champ {
  id: string;
  type: ChampType;
  label: string;
  obligatoire: boolean;
  options?: string[];
}
export interface Page {
  id: string;
  titre: string;
  champs: Champ[];
}
export interface Piece {
  id: string;
  label: string;
  obligatoire: boolean;
  mode: "upload" | "email" | "deux";
}
export interface FormConfig {
  pages: Page[];
  pieces: Piece[];
}

export const FORM_CONFIG_VIDE: FormConfig = { pages: [], pieces: [] };

export const TYPE_LABELS: Record<ChampType, string> = {
  texte: "Texte court",
  zone: "Texte long",
  date: "Date",
  tel: "Téléphone",
  nombre: "Nombre",
  choix: "Liste de choix",
  case: "Case à cocher",
};
```

### src/lib/supabase/server.ts

```ts
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";

type CookieToSet = { name: string; value: string; options: CookieOptions };

// Valeurs publiques (publishable) — fallback si les variables d'env ne sont pas définies.
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9mCWkp80McBNZeRTdFx7sw_Kb3NJhKR";

// Client Supabase côté serveur (Server Components / Route Handlers).
// Utilise la clé publishable (anon) : la sécurité repose sur les politiques RLS.
export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll appelé depuis un Server Component : ignoré (géré par le middleware).
        }
      },
    },
  });
}
```

### src/lib/supabase/admin.ts

```ts
import { createClient } from "@supabase/supabase-js";

// Client service-role (serveur uniquement) — utilisé seulement par le webhook Stripe vérifié.
export function createSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}
```
