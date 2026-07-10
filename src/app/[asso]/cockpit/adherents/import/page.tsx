import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import ImportAdherents from "@/components/site/ImportAdherents";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function Import({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents/import`);
  }
  const cours = await getCoursByOrganisation(org.id);
  const accent = org.couleur_primaire ?? "#111111";

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit/adherents`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← ADHÉRENTS
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          IMPORT<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">Importer vos adhérents.</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Vous venez d’un tableur ou d’un autre logiciel. Personne ne devrait ressaisir trois cents
          fiches à la main.
        </p>

        <ImportAdherents
          slug={org.slug}
          cours={cours.map((c) => ({ id: c.id, nom: c.nom }))}
          accent={accent}
        />
      </div>
    </main>
  );
}
