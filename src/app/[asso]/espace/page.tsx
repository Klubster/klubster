import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { StatutBadge } from "@/components/ui/StatutBadge";

export const dynamic = "force-dynamic";

export default async function EspaceAdherent({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  return (
    <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
      <Link href={`/${org.slug}`} className="text-sm text-ink-soft hover:text-ink">← {org.nom}</Link>
      <h1 className="mt-4 text-3xl font-bold">Mon espace</h1>
      <p className="mt-2 text-ink-soft">Tableau de bord de l&apos;adhérent (connexion requise — jalon suivant).</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-3">
        <Stat label="Dossier" value="80 %" hint="1 pièce manquante" />
        <Stat label="Cotisation" value="" badge />
        <Stat label="Carte de membre" value="QR" hint="à présenter à l'accueil" />
      </div>

      <div className="mt-8 rounded-card border border-line bg-surface p-6 shadow-sm">
        <h2 className="font-bold">Mes pièces</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Certificat médical, photo, pièce d&apos;identité… Dépôt et suivi : jalon « Pièces & dossier ».
        </p>
      </div>
    </main>
  );
}

function Stat({ label, value, hint, badge }: { label: string; value: string; hint?: string; badge?: boolean }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-sm">
      <p className="font-mono text-xs uppercase tracking-wider text-ink-soft">{label}</p>
      <div className="mt-2 text-2xl font-bold">
        {badge ? <StatutBadge statut="paye" /> : <span className="tabular font-mono">{value}</span>}
      </div>
      {hint ? <p className="mt-1 text-xs text-ink-soft">{hint}</p> : null}
    </div>
  );
}
