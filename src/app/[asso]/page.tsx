import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix, embedCarte, lienCarte } from "@/lib/format";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PlanningGrid } from "@/components/site/PlanningGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { asso: string } }): Promise<Metadata> {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) return { title: "Association introuvable" };
  return {
    title: `${org.nom} — inscriptions, cours & planning`,
    description: org.accroche ?? org.presentation ?? org.nom,
  };
}

export default async function VitrinePage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const cours = await getCoursByOrganisation(org.id);
  const accent = org.couleur_primaire ?? "#111111";

  function Label({ n, children }: { n: string; children: React.ReactNode }) {
    return (
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        SECTION {n} — {children}
        <span style={{ color: accent }}>_</span>
      </p>
    );
  }

  return (
    <main className="text-ink">
      <SiteHeader org={org} />

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

      {/* PRÉSENTATION */}
      {org.presentation ? (
        <section id="presentation" className="border-b border-line">
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n="01">LE CLUB</Label>
            <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">
              À propos de {org.nom}
            </h2>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{org.presentation}</p>
          </div>
        </section>
      ) : null}

      {/* COURS / DISCIPLINES */}
      <section id="cours" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label n="02">DISCIPLINES</Label>
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
      </section>

      {/* PLANNING */}
      <section id="planning" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label n="03">PLANNING</Label>
          <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Créneaux de la semaine.</h2>
          <div className="mt-12">
            <PlanningGrid cours={cours} accent={accent} />
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="border-b border-line">
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
          <Label n="04">TARIFS</Label>
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
      </section>

      {/* INFOS PRATIQUES */}
      {org.infos_pratiques ? (
        <section className="border-b border-line">
          <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
            <Label n="05">INFOS PRATIQUES</Label>
            <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">Avant de venir.</h2>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{org.infos_pratiques}</p>
          </div>
        </section>
      ) : null}

      {/* CONTACT / OÙ NOUS TROUVER */}
      <section id="contact" className="border-b border-line">
        <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
          <div className="px-6 py-20 md:px-8 md:py-24">
            <Label n="06">OÙ NOUS TROUVER</Label>
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
      </section>

      {/* FOOTER — signature Klubster */}
      <footer>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-12 md:flex-row md:items-center md:px-8">
          <span className="mono text-[12px] text-ink-soft">© {new Date().getFullYear()} {org.nom}</span>
          <a href="https://klubster.vercel.app" className="mono text-[12px] text-ink-soft hover:text-ink">
            Créé avec <span className="font-logo font-semibold text-ink">k<span className="cur">_</span></span>
          </a>
        </div>
      </footer>
    </main>
  );
}
