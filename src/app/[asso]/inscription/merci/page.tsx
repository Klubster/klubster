import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function MerciPage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { prenom?: string; mode?: string; paye?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const accent = org.couleur_primaire ?? "#111111";
  const prenom = searchParams?.prenom?.trim();
  const paye = searchParams?.paye === "1";
  const mode = searchParams?.mode;
  const reglement =
    mode === "cheque" ? "Règlement par chèque : à remettre au club."
    : mode === "especes" ? "Règlement en espèces : à remettre au club."
    : null;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">INSCRIPTION<span style={{ color: accent }}>_</span></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-20 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label" style={{ color: accent }}>C&apos;EST FAIT<span style={{ color: accent }}>_</span></p>
        <h1 className="mt-6 text-3xl font-medium md:text-4xl">{prenom ? `Bienvenue, ${prenom}.` : "Bienvenue."}</h1>
        <p className="mt-4 max-w-prose text-lg text-ink-soft">
          Votre inscription à {org.nom} est enregistrée et votre compte adhérent est créé.
        </p>

        <div className="mt-12 border border-line bg-paper">
          <Etape ok>{paye ? "Paiement reçu" : "Inscription reçue par le club"}</Etape>
          <Etape>Confirmez votre email pour activer votre espace</Etape>
          {reglement ? <Etape>{reglement}</Etape> : null}
          <Etape>Déposez vos pièces dans votre espace adhérent</Etape>
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link href={`/${org.slug}/espace`} className="mono px-6 py-3 text-[12px] text-white" style={{ background: accent }}>ACCÉDER À MON ESPACE →</Link>
          <Link href={`/${org.slug}`} className="mono border border-ink px-6 py-3 text-[12px] hover:bg-ink hover:text-paper">← RETOUR AU CLUB</Link>
        </div>
      </div>
    </main>
  );
}

function Etape({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <div className="flex items-center gap-4 border-b border-line px-6 py-4 last:border-b-0">
      <span className={`mono text-[12px] ${ok ? "text-brand" : "text-ink-faint"}`}>{ok ? "✓" : "○"}</span>
      <span className={`text-[15px] ${ok ? "" : "text-ink-soft"}`}>{children}</span>
    </div>
  );
}
