import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MerciPage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { prenom?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const accent = org.couleur_primaire ?? "#111111";
  const prenom = searchParams?.prenom?.trim();

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          INSCRIPTION<span style={{ color: accent }}>_</span>
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label" style={{ color: accent }}>C&apos;EST FAIT<span style={{ color: accent }}>_</span></p>
        <h1 className="mt-6 text-3xl font-medium md:text-4xl">
          {prenom ? `Bienvenue, ${prenom}.` : "Bienvenue."}
        </h1>
        <p className="mt-4 max-w-prose text-lg text-ink-soft">
          Votre inscription à {org.nom} est enregistrée. Le club vous recontacte pour la première
          séance et la finalisation (pièces et paiement).
        </p>

        <div className="mt-12 border border-line bg-paper">
          <div className="flex items-center gap-4 border-b border-line px-6 py-4">
            <span className="mono text-[12px]" style={{ color: accent }}>✓</span>
            <span className="text-[15px]">Inscription reçue par le club</span>
          </div>
          <div className="flex items-center gap-4 border-b border-line px-6 py-4 text-ink-soft">
            <span className="mono text-[12px] text-ink-faint">○</span>
            <span className="text-[15px]">Pièces à déposer (certificat médical, photo…)</span>
          </div>
          <div className="flex items-center gap-4 px-6 py-4 text-ink-soft">
            <span className="mono text-[12px] text-ink-faint">○</span>
            <span className="text-[15px]">Paiement en ligne sécurisé (Stripe) — bientôt</span>
          </div>
        </div>

        <Link href={`/${org.slug}`} className="mono mt-10 inline-block border border-ink px-6 py-3 text-[12px] hover:bg-ink hover:text-paper">
          ← RETOUR AU CLUB
        </Link>
      </div>
    </main>
  );
}
