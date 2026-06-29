import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

const SECTIONS = [
  { t: "Équipage", d: "Liste, recherche et fiches des adhérents. Segmentation par cours / statut." },
  { t: "Paiements", d: "Encaissés, en attente, échoués. Reversés directement sur votre compte." },
  { t: "Configuration", d: "Modifier cours, tarifs, infos et design du site." },
  { t: "Tour de contrôle", d: "Emailing : tous, un cours précis, ou par statut. Export CSV." },
];

export default async function Cockpit({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  return (
    <main className="min-h-screen bg-bg-alt">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <span className="font-mono text-sm font-bold">Cockpit · {org.nom}</span>
          <Link href={`/${org.slug}`} className="text-sm text-ink-soft hover:text-ink">Voir le site →</Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
        <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">back-office</p>
        <h1 className="mt-2 text-3xl font-bold">Pilotez {org.nom}</h1>
        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <div key={s.t} className="rounded-card border border-line bg-surface p-6 shadow-sm">
              <h2 className="text-lg font-bold">{s.t}</h2>
              <p className="mt-2 text-ink-soft">{s.d}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 font-mono text-xs text-ink-soft">
          Accès réservé (admin asso / encadrant) — authentification : jalon suivant.
        </p>
      </div>
    </main>
  );
}
