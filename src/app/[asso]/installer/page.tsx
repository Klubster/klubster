import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import GuideInstallation from "./GuideInstallation";

export const dynamic = "force-dynamic";

export default async function InstallerPage(props: { params: Promise<{ asso: string }> }) {
  const { asso } = await props.params;
  const org = await getOrganisationBySlug(asso);
  if (!org) notFound();
  const accent = org.couleur_primaire ?? "#111111";

  return (
    <ThemeVitrine org={org}>
      <main className="min-h-screen text-ink">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
          <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">
            ← {org.nom}
          </Link>
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
            INSTALLER L&apos;APP<span style={{ color: accent }}>_</span>
          </span>
        </header>

        <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
          <h1 className="text-3xl font-medium leading-tight md:text-4xl">
            {org.nom} sur votre écran d&apos;accueil.
          </h1>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Ajoutez le club à votre téléphone comme une application : votre carte de membre, votre dossier
            et les inscriptions s&apos;ouvrent alors d&apos;un seul tap, sans passer par le navigateur. C&apos;est
            gratuit, ça ne prend rien sur votre téléphone, et il n&apos;y a rien à télécharger sur un store.
          </p>

          <GuideInstallation accent={accent} />

          <div className="mt-12 border-t border-line pt-8">
            <Link
              href={`/${org.slug}/espace`}
              className="mono px-6 py-3 text-[13px] text-white transition-opacity hover:opacity-90"
              style={{ background: accent }}
            >
              OUVRIR MON ESPACE →
            </Link>
          </div>
        </div>
      </main>
    </ThemeVitrine>
  );
}
