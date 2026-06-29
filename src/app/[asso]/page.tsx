import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix, embedCarte, lienCarte } from "@/lib/format";
import { SiteHeader } from "@/components/site/SiteHeader";
import { PlanningGrid } from "@/components/site/PlanningGrid";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { asso: string };
}): Promise<Metadata> {
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
  const accent = org.couleur_primaire ?? "#0B1220";

  return (
    <main>
      <SiteHeader org={org} />

      {/* HERO */}
      <section className="border-b border-line">
        <div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
          <div className="max-w-prose">
            {org.sport ? (
              <p className="mb-4 font-mono text-xs uppercase tracking-[0.18em]" style={{ color: accent }}>
                {org.sport}
              </p>
            ) : null}
            <h1 className="text-4xl font-bold leading-tight md:text-5xl">
              {org.accroche ?? org.nom}
            </h1>
            {org.presentation ? (
              <p className="mt-6 text-lg text-ink-soft">{org.presentation}</p>
            ) : null}
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href={`/${org.slug}/inscription`}
                className="inline-flex items-center rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
                style={{ background: accent }}
              >
                S&apos;inscrire
              </Link>
              <a
                href="#cours"
                className="inline-flex items-center rounded-full border border-ink/15 px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-bg-alt"
              >
                Découvrir les cours
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* PRESENTATION */}
      {org.presentation ? (
        <section id="presentation" className="bg-bg-alt py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Le club</p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">À propos de {org.nom}</h2>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">{org.presentation}</p>
          </div>
        </section>
      ) : null}

      {/* COURS / DISCIPLINES */}
      <section id="cours" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Nos cours</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Disciplines proposées</h2>
          {cours.length === 0 ? (
            <p className="mt-6 text-ink-soft">Les cours seront bientôt en ligne.</p>
          ) : (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {cours.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-col rounded-card border border-line bg-surface p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <h3 className="text-lg font-bold">{c.nom}</h3>
                  {c.public_cible ? (
                    <p className="mt-1 text-sm text-ink-soft">{c.public_cible}</p>
                  ) : null}
                  {c.description ? (
                    <p className="mt-3 text-sm text-ink-soft">{c.description}</p>
                  ) : null}
                  <div className="mt-auto pt-4">
                    <span className="tabular font-mono text-sm font-bold" style={{ color: accent }}>
                      {formatPrix(c.tarif_centimes)}
                    </span>
                    <span className="text-xs text-ink-soft"> / an</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* PLANNING */}
      <section id="planning" className="bg-bg-alt py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Planning</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Créneaux de la semaine</h2>
          <div className="mt-8">
            <PlanningGrid cours={cours} accent={accent} />
          </div>
        </div>
      </section>

      {/* TARIFS */}
      <section id="tarifs" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Tarifs</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Cotisations annuelles</h2>
          <div className="mt-8 overflow-hidden rounded-card border border-line">
            <table className="w-full text-left text-sm">
              <thead className="bg-bg-alt text-ink-soft">
                <tr>
                  <th className="px-5 py-3 font-medium">Cours</th>
                  <th className="px-5 py-3 font-medium">Public</th>
                  <th className="px-5 py-3 text-right font-medium">Tarif / an</th>
                </tr>
              </thead>
              <tbody>
                {cours.map((c, i) => (
                  <tr key={c.id} className={i % 2 ? "bg-bg-alt/40" : ""}>
                    <td className="px-5 py-3 font-medium text-ink">{c.nom}</td>
                    <td className="px-5 py-3 text-ink-soft">{c.public_cible ?? "—"}</td>
                    <td className="tabular px-5 py-3 text-right font-mono font-bold text-ink">
                      {formatPrix(c.tarif_centimes)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-ink-soft">
            Paiement en ligne sécurisé, en une fois ou en plusieurs échéances. Pass&apos;Sport et
            réductions acceptés.
          </p>
        </div>
      </section>

      {/* INFOS PRATIQUES */}
      {org.infos_pratiques ? (
        <section className="bg-bg-alt py-16 md:py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-8">
            <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">
              Infos pratiques
            </p>
            <h2 className="mt-2 text-2xl font-bold md:text-3xl">Avant de venir</h2>
            <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">
              {org.infos_pratiques}
            </p>
          </div>
        </section>
      ) : null}

      {/* CONTACT + OÙ NOUS TROUVER */}
      <section id="contact" className="py-16 md:py-24">
        <div className="mx-auto max-w-6xl px-5 md:px-8">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">Contact</p>
          <h2 className="mt-2 text-2xl font-bold md:text-3xl">Où nous trouver</h2>
          <div className="mt-8 grid gap-8 md:grid-cols-2">
            <div className="space-y-5">
              {org.adresse ? (
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Adresse</p>
                  <p className="mt-1 text-ink">{org.adresse}</p>
                  <a
                    href={lienCarte(org.adresse)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-sm font-medium underline-offset-4 hover:underline"
                    style={{ color: accent }}
                  >
                    Itinéraire →
                  </a>
                </div>
              ) : null}
              {org.email_contact ? (
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Email</p>
                  <a href={`mailto:${org.email_contact}`} className="mt-1 inline-block text-ink hover:underline">
                    {org.email_contact}
                  </a>
                </div>
              ) : null}
              {org.telephone ? (
                <div>
                  <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">Téléphone</p>
                  <a href={`tel:${org.telephone.replace(/\s/g, "")}`} className="mt-1 inline-block text-ink hover:underline">
                    {org.telephone}
                  </a>
                </div>
              ) : null}
            </div>
            {org.adresse ? (
              <div className="overflow-hidden rounded-card border border-line shadow-sm">
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
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-line py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 text-sm text-ink-soft md:flex-row md:px-8">
          <span>© {new Date().getFullYear()} {org.nom}</span>
          <a href="https://klubster.fr" className="font-mono hover:text-ink">
            Créé avec <span className="font-bold text-ink">klubster</span>
          </a>
        </div>
      </footer>
    </main>
  );
}
