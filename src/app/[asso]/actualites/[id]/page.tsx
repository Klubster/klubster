import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getOrganisationPubliqueBySlug, getActualite } from "@/lib/queries";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";

export const dynamic = "force-dynamic";

// Un id qui n'est pas un uuid ferait échouer le cast Postgres (erreur loguée pour
// rien) : on écarte d'emblée et on répond 404 comme pour une actu inexistante.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Org (par slug) + actu (filtrée par organisation : l'actu d'un autre club = 404).
async function charger(asso: string, id: string) {
  const org = await getOrganisationPubliqueBySlug(asso);
  if (!org || !UUID.test(id)) return null;
  const actu = await getActualite(org.id, id);
  if (!actu) return null;
  return { org, actu };
}

export async function generateMetadata(
  props: { params: Promise<{ asso: string; id: string }> }
): Promise<Metadata> {
  const { asso, id } = await props.params;
  const res = await charger(asso, id);
  if (!res) return { title: "Actualité introuvable" };
  return {
    title: `${res.actu.titre} — ${res.org.nom}`,
    description: res.actu.texte.slice(0, 300),
  };
}

export default async function ActualiteDetailPage(
  props: { params: Promise<{ asso: string; id: string }> }
) {
  const { asso, id } = await props.params;
  const res = await charger(asso, id);
  if (!res) notFound();
  const { org, actu } = res;
  const accent = org.couleur_primaire ?? "#111111";

  return (
    <ThemeVitrine org={org}>
      <main className="min-h-screen text-ink">
        {/* Header vitrine minimal, dans le thème du club — même gabarit que l'inscription. */}
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
          <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ACTUALITÉ<span style={{ color: accent }}>_</span>
          </span>
        </header>

        {actu.image_url ? (
          <div className="relative h-64 w-full overflow-hidden border-b border-line md:h-96">
            {/* Photo uploadée telle quelle : next/image la redimensionne et la convertit.
                Pleine largeur, en haut de page → priority. */}
            <Image src={actu.image_url} alt={actu.titre} fill priority sizes="100vw" className="object-cover" />
          </div>
        ) : null}

        <article className="mx-auto max-w-2xl px-6 py-14 md:px-8">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            {new Date(actu.publie_le).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
            <span style={{ color: accent }}>_</span>
          </p>
          <h1 className="mt-6 text-3xl font-medium leading-tight md:text-4xl">{actu.titre}</h1>
          {/* Paragraphes séparés par une ligne vide ; les retours simples restent des
              retours à la ligne (whitespace-pre-line). */}
          <div className="mt-8 space-y-5">
            {actu.texte.split(/\n{2,}/).map((p, i) => (
              <p key={i} className="whitespace-pre-line text-lg leading-relaxed text-ink-soft">{p}</p>
            ))}
          </div>
          <Link
            href={`/${org.slug}`}
            className="mono mt-12 inline-block border border-ink px-6 py-3 text-[13px] hover:bg-ink hover:text-paper"
          >
            ← RETOUR AU SITE
          </Link>
        </article>
      </main>
    </ThemeVitrine>
  );
}
