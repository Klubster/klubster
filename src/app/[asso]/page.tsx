import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { formatPrix, embedCarte, lienCarte } from "@/lib/format";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PlanningGrid } from "@/components/site/PlanningGrid";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import { normaliserPageConfig } from "@/lib/page-config";
import { deplacerSection, ajouterSection, supprimerSection } from "./edition-actions";
import type { SectionCustom } from "@/types/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { asso: string } }): Promise<Metadata> {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) return { title: "Association introuvable" };
  return {
    title: `${org.nom} — inscriptions, cours & planning`,
    description: org.accroche ?? org.presentation ?? org.nom,
  };
}

export default async function VitrinePage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { edition?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const cours = await getCoursByOrganisation(org.id);
  const accent = org.couleur_primaire ?? "#111111";

  // Admin de CE club (ou super-admin) : accès Cockpit + mode Édition de page.
  const profile = await getProfile();
  const estAdmin = Boolean(
    profile && (profile.role === "super_admin" || (profile.organisation_id === org.id && profile.role === "admin_asso"))
  );
  const edition = estAdmin && searchParams?.edition === "1";
  const pc = normaliserPageConfig(org.page_config);

  function Label({ n, children }: { n: string; children: React.ReactNode }) {
    return (
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        SECTION {n} — {children}
        <span style={{ color: accent }}>_</span>
      </p>
    );
  }

  // Sections de la page, dans l'ordre choisi par le club (page_config.ordre).
  const rendus: { cle: string; id?: string; custom: boolean; node: (n: string) => React.ReactNode }[] = [];
  for (const cle of pc.ordre) {
    const sc = pc.custom.find((c) => c.id === cle);
    if (sc) {
      rendus.push({ cle, id: sc.id, custom: true, node: (n) => <SectionCustomView s={sc} n={n} accent={accent} /> });
      continue;
    }
    if (cle === "presentation" && org.presentation) {
      rendus.push({
        cle,
        id: "presentation",
        custom: false,
        node: (n) => (
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n={n}>LE CLUB</Label>
            <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">
              À propos de {org.nom}
            </h2>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{org.presentation}</p>
          </div>
        ),
      });
    }
    if (cle === "cours") {
      rendus.push({
        cle,
        id: "cours",
        custom: false,
        node: (n) => (
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n={n}>DISCIPLINES</Label>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Nos cours.</h2>
            {cours.length === 0 ? (
              <p className="mt-8 text-ink-soft">Les cours seront bientôt en ligne.</p>
            ) : (
              <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line lg:grid-cols-3">
                {cours.map((c, i) => (
                  <div key={c.id} className="flex flex-col bg-paper px-6 py-7" style={{ minHeight: 168 }}>
                    <span className="mono text-[10px] tracking-wider text-ink-faint">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="mt-4 text-[16px] font-medium">{c.nom}</div>
                    {c.public_cible ? (
                      <div className="mt-1 text-[13px] text-ink-soft">{c.public_cible}</div>
                    ) : null}
                    <div className="mono mt-auto pt-5 text-[26px] font-bold tracking-[-0.02em]" style={{ color: accent }}>
                      {Math.round(c.tarif_centimes / 100)}
                      <span className="text-[11px] font-normal text-ink-soft"> € /an</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      });
    }
    if (cle === "planning") {
      rendus.push({
        cle,
        id: "planning",
        custom: false,
        node: (n) => (
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n={n}>PLANNING</Label>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Créneaux de la semaine.</h2>
            <div className="mt-12">
              <PlanningGrid cours={cours} accent={accent} />
            </div>
          </div>
        ),
      });
    }
    if (cle === "tarifs") {
      rendus.push({
        cle,
        id: "tarifs",
        custom: false,
        node: (n) => (
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n={n}>TARIFS</Label>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Cotisations annuelles.</h2>
            <div className="mt-12 border-t border-line">
              {cours.map((c) => (
                <div key={c.id} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
                  <span className="text-[15px]">{c.nom}</span>
                  <span className="hidden flex-1 text-[13px] text-ink-soft sm:block">{c.public_cible ?? ""}</span>
                  <span className="mono text-[15px] font-bold" style={{ color: accent }}>
                    {formatPrix(c.tarif_centimes)}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-prose text-ink-soft">
              Paiement en ligne sécurisé, en une fois ou en plusieurs échéances. Pass&apos;Sport et
              réductions acceptés.
            </p>
          </div>
        ),
      });
    }
    if (cle === "infos" && org.infos_pratiques) {
      rendus.push({
        cle,
        custom: false,
        node: (n) => (
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n={n}>INFOS PRATIQUES</Label>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Avant de venir.</h2>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{org.infos_pratiques}</p>
          </div>
        ),
      });
    }
    if (cle === "contact") {
      rendus.push({
        cle,
        id: "contact",
        custom: false,
        node: (n) => (
          <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
            <div className="px-6 py-20 md:px-8 md:py-24">
              <Label n={n}>OÙ NOUS TROUVER</Label>
              <div className="mt-10 space-y-6">
                {org.adresse ? (
                  <div>
                    <p className="mono text-[10px] uppercase tracking-label text-ink-soft">ADRESSE</p>
                    <p className="mt-2 text-ink">{org.adresse}</p>
                    <a
                      href={lienCarte(org.adresse)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mono mt-2 inline-block text-[12px]"
                      style={{ color: accent }}
                    >
                      ITINÉRAIRE →
                    </a>
                  </div>
                ) : null}
                {org.email_contact ? (
                  <div>
                    <p className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL</p>
                    <a href={`mailto:${org.email_contact}`} className="mt-2 inline-block text-ink hover:underline">
                      {org.email_contact}
                    </a>
                  </div>
                ) : null}
                {org.telephone ? (
                  <div>
                    <p className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</p>
                    <a href={`tel:${org.telephone.replace(/\s/g, "")}`} className="mt-2 inline-block text-ink hover:underline">
                      {org.telephone}
                    </a>
                  </div>
                ) : null}
              </div>
            </div>
            {org.adresse ? (
              <div className="border-t border-line md:border-l md:border-t-0">
                <iframe
                  title={`Carte — ${org.nom}`}
                  src={embedCarte(org.adresse)}
                  className="h-72 w-full md:h-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </div>
        ),
      });
    }
  }

  return (
    <ThemeVitrine org={org}>
    <main className="text-ink">
      <SiteHeader org={org} estAdmin={estAdmin} edition={edition} />

      {/* BARRE DU MODE ÉDITION */}
      {edition ? (
        <div className="border-b border-line bg-bg-alt">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-8">
            <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
              MODE ÉDITION — déplacez vos sections avec ↑ ↓, ajoutez-en en bas de page
              <span style={{ color: accent }}>_</span>
            </span>
            <Link href={`/${org.slug}`} className="mono border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper">
              TERMINER →
            </Link>
          </div>
        </div>
      ) : null}

      {/* ACTUALITÉ À LA UNE (éditable par le club) */}
      {org.actualite && (org.actualite.texte || org.actualite.image_url) ? (
        <section className="border-b border-line">
          {org.actualite.image_url ? (
            <div className="relative h-64 w-full overflow-hidden md:h-80">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={org.actualite.image_url} alt="Actualité du club" className="absolute inset-0 h-full w-full object-cover" />
              {org.actualite.texte ? (
                <div className="absolute inset-x-0 bottom-0 bg-ink/70 px-6 py-5 md:px-8">
                  <p className="mono text-[10px] uppercase tracking-label text-paper/70">À LA UNE<span style={{ color: accent }}>_</span></p>
                  <p className="mt-1 max-w-prose text-paper md:text-lg">{org.actualite.texte}</p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mx-auto max-w-5xl px-6 py-6 md:px-8">
              <div className="border-l-2 pl-4" style={{ borderColor: accent }}>
                <p className="mono text-[10px] uppercase tracking-label" style={{ color: accent }}>À LA UNE_</p>
                <p className="mt-1 max-w-prose text-lg">{org.actualite.texte}</p>
              </div>
            </div>
          )}
        </section>
      ) : null}

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-32">
          {org.sport ? (
            <p className="mono text-[11px] uppercase tracking-label" style={{ color: accent }}>
              {org.sport}<span style={{ color: accent }}>_</span>
            </p>
          ) : null}
          <h1 className="mt-8 max-w-[18ch] text-[38px] font-medium leading-[1.05] tracking-[-0.015em] md:text-[54px]">
            {org.accroche ?? org.nom}
          </h1>
          {org.presentation ? (
            <p className="mt-8 max-w-prose text-lg text-ink-soft">{org.presentation}</p>
          ) : null}
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href={`/${org.slug}/inscription`}
              className="mono px-6 py-3 text-[13px] text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              S&apos;INSCRIRE →
            </Link>
            <a href="#cours" className="mono border border-ink px-6 py-3 text-[13px] hover:bg-bg-alt">
              DÉCOUVRIR LES COURS
            </a>
          </div>
        </div>
      </section>

      {/* SECTIONS — ordre piloté par page_config, réorganisable en mode édition */}
      {rendus.map((r, idx) => (
        <section key={r.cle} id={r.id} className={`border-b border-line ${edition ? "relative" : ""}`}>
          {edition ? (
            <Controles slug={org.slug} cle={r.cle} first={idx === 0} last={idx === rendus.length - 1} custom={r.custom} />
          ) : null}
          {r.node(String(idx + 1).padStart(2, "0"))}
        </section>
      ))}

      {/* AJOUTER UNE SECTION (mode édition) */}
      {edition ? <AjouterSectionForm slug={org.slug} accent={accent} /> : null}

      {/* FOOTER — signature Klubster */}
      <footer>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-12 md:flex-row md:items-center md:px-8">
          <span className="mono text-[12px] text-ink-soft">© {new Date().getFullYear()} {org.nom}</span>
          <div className="flex items-center gap-6">
            <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-faint hover:text-ink">
              Admin
            </Link>
            <a href="https://klubster.vercel.app" className="mono text-[12px] text-ink-soft hover:text-ink">
              Créé avec <span className="font-logo font-semibold text-ink">k<span className="cur">_</span></span>
            </a>
          </div>
        </div>
      </footer>
    </main>
    </ThemeVitrine>
  );
}

/* ——— Mode édition : contrôles ↑ ↓ (× pour les sections ajoutées) ——— */
function Controles({ slug, cle, first, last, custom }: { slug: string; cle: string; first: boolean; last: boolean; custom: boolean }) {
  return (
    <div className="absolute right-3 top-3 z-20 flex gap-px border border-line bg-line shadow-sm">
      <form action={deplacerSection.bind(null, slug, cle, -1)}>
        <button disabled={first} title="Remonter la section" className="mono bg-paper px-3 py-2 text-[13px] hover:bg-bg-alt disabled:opacity-30">
          ↑
        </button>
      </form>
      <form action={deplacerSection.bind(null, slug, cle, 1)}>
        <button disabled={last} title="Descendre la section" className="mono bg-paper px-3 py-2 text-[13px] hover:bg-bg-alt disabled:opacity-30">
          ↓
        </button>
      </form>
      {custom ? (
        <form action={supprimerSection.bind(null, slug, cle)}>
          <button title="Supprimer la section" className="mono bg-paper px-3 py-2 text-[13px] hover:bg-bg-alt" style={{ color: "#B23B3B" }}>
            ×
          </button>
        </form>
      ) : null}
    </div>
  );
}

/* ——— Sections personnalisées (templates photo/texte) ——— */
function SectionCustomView({ s, n, accent }: { s: SectionCustom; n: string; accent: string }) {
  const label = (s.titre ?? "Le club").toUpperCase();
  const img = s.image_url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={s.image_url} alt={s.titre ?? "Photo du club"} className="absolute inset-0 h-full w-full object-cover" />
  ) : null;

  if (s.type === "triptyque") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          SECTION {n} — {label}
          <span style={{ color: accent }}>_</span>
        </p>
        {s.titre ? <h2 className="mt-8 max-w-[24ch] text-3xl font-medium leading-tight md:text-4xl">{s.titre}</h2> : null}
        <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
          <p className="bg-paper px-6 py-8 text-lg leading-relaxed text-ink-soft">{s.texte}</p>
          <div className="relative h-72 overflow-hidden bg-paper md:h-auto">{img}</div>
          <p className="bg-paper px-6 py-8 text-lg leading-relaxed text-ink-soft">{s.texte2}</p>
        </div>
      </div>
    );
  }

  const photoDroite = s.type === "photo-droite";
  const colonneTexte = (
    <div className="px-6 py-20 md:px-8 md:py-24">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        SECTION {n} — {label}
        <span style={{ color: accent }}>_</span>
      </p>
      {s.titre ? <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">{s.titre}</h2> : null}
      <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{s.texte}</p>
    </div>
  );
  const colonnePhoto = (
    <div
      className={`relative h-72 overflow-hidden md:h-auto ${
        photoDroite ? "border-t border-line md:border-l md:border-t-0" : "border-b border-line md:border-r md:border-b-0"
      }`}
    >
      {img}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
      {photoDroite ? (
        <>
          {colonneTexte}
          {colonnePhoto}
        </>
      ) : (
        <>
          {colonnePhoto}
          {colonneTexte}
        </>
      )}
    </div>
  );
}

/* ——— Formulaire d'ajout de section (mode édition) ——— */
function AjouterSectionForm({ slug, accent }: { slug: string; accent: string }) {
  return (
    <section className="border-b border-line bg-bg-alt">
      <div className="mx-auto max-w-5xl px-6 py-14 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          AJOUTER UNE SECTION
          <span style={{ color: accent }}>_</span>
        </p>
        <form action={ajouterSection.bind(null, slug)} className="mt-8 space-y-6">
          <div className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            <TemplateChoix value="photo-gauche" defaultChecked blocs={["P", "T"]} label="Photo à gauche" desc="Photo ½ page à gauche, texte à droite." />
            <TemplateChoix value="photo-droite" blocs={["T", "P"]} label="Photo à droite" desc="Texte ½ page à gauche, photo à droite." />
            <TemplateChoix value="triptyque" blocs={["T", "P", "T"]} label="Triptyque" desc="Photo au milieu, texte de chaque côté." />
          </div>
          <input
            name="titre"
            placeholder="Titre (optionnel) — ex. Notre salle"
            className="w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <textarea
              name="texte"
              rows={4}
              placeholder="Texte (colonne de gauche)"
              className="w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
            />
            <textarea
              name="texte2"
              rows={4}
              placeholder="Texte de droite (triptyque uniquement)"
              className="w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <input type="file" name="photo" accept="image/*" required className="mono text-[12px] text-ink-soft" />
            <button type="submit" className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90" style={{ background: accent }}>
              AJOUTER LA SECTION →
            </button>
          </div>
          <p className="text-[13px] text-ink-soft">
            Photo obligatoire, 5 Mo max. La section arrive en bas de page — remontez-la ensuite avec les flèches ↑.
          </p>
        </form>
      </div>
    </section>
  );
}

function TemplateChoix({
  value,
  label,
  desc,
  blocs,
  defaultChecked,
}: {
  value: string;
  label: string;
  desc: string;
  blocs: ("P" | "T")[];
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 bg-paper px-4 py-4 hover:bg-bg-alt">
      <input type="radio" name="type" value={value} defaultChecked={defaultChecked} className="mt-1" />
      <span className="flex-1">
        <span className="flex h-10 gap-1" aria-hidden>
          {blocs.map((b, i) =>
            b === "P" ? (
              <span key={i} className="mono grid flex-1 place-items-center border border-line bg-bg-alt text-[8px] tracking-wider text-ink-soft">
                PHOTO
              </span>
            ) : (
              <span key={i} className="flex-1 border border-line bg-paper p-1.5">
                <span className="mb-1 block h-1 w-4/5 bg-ink-faint" />
                <span className="mb-1 block h-1 w-3/5 bg-ink-faint" />
                <span className="block h-1 w-2/3 bg-ink-faint" />
              </span>
            )
          )}
        </span>
        <span className="mt-2 block text-[14px] font-medium">{label}</span>
        <span className="mt-0.5 block text-[12px] text-ink-soft">{desc}</span>
      </span>
    </label>
  );
}
