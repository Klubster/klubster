import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getActualites } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { ajouterActualite, supprimerActualite } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

// « 4 septembre 2026 » — même format que la vitrine.
function dateActu(d: string): string {
  return new Date(d).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

export default async function ActualitePage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ ok?: string; supprime?: string; erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/actualite`);
  }
  // Le fil complet du club (la vitrine, elle, n'en montre que 3).
  const actus = await getActualites(org.id, 50);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER · ACTUALITÉS<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LA VIE DU CLUB — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Vos actualités.</h1>
        <p className="mt-3 text-ink-soft">
          Chaque actualité a sa page sur votre site. La plus récente s&apos;affiche « À la une »
          tout en haut de votre vitrine, et les trois dernières dans le chapitre « La vie du club ».
        </p>

        {searchParams?.ok ? <p className="mono mt-6 text-[12px] text-brand">✓ Actualité publiée — visible sur votre vitrine.</p> : null}
        {searchParams?.supprime ? <p className="mono mt-6 text-[12px] text-ink-soft">Actualité supprimée.</p> : null}
        {searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "image"
              ? "L’image n’a pas pu être envoyée. Utilisez un JPEG, PNG ou WebP."
              : searchParams.erreur === "vide"
                ? "Rien n’a été publié : le titre et le texte sont obligatoires."
                : "L’enregistrement a échoué. Reconnectez-vous, puis réessayez."}
          </p>
        ) : null}

        {/* ——— Publier une actualité ——— */}
        <form action={ajouterActualite.bind(null, org.slug)} className="mt-8 space-y-6">
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TITRE</label>
            <input
              name="titre"
              required
              maxLength={120}
              placeholder="Reprise des cours le 4 septembre"
              className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TEXTE</label>
            <textarea
              name="texte"
              rows={5}
              required
              placeholder="Le détail — il s’affiche sur la page de l’actualité. Une ligne vide sépare deux paragraphes."
              className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border border-line bg-paper px-5 py-4">
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">DATE DE PUBLICATION</label>
              <input
                type="date"
                name="publie_le"
                defaultValue={new Date().toISOString().slice(0, 10)}
                className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
              />
            </div>
            <div className="border border-line bg-paper px-5 py-4">
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">IMAGE (OPTIONNELLE)</label>
              <input type="file" name="image" accept="image/*" className="mt-2 block w-full text-[13px]" />
              <p className="mono mt-2 text-[11px] text-ink-faint">JPG ou PNG, format paysage conseillé.</p>
            </div>
          </div>
          <button className="mono w-full bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 sm:w-auto">PUBLIER →</button>
        </form>

        {/* ——— Les actualités publiées ——— */}
        {actus.length > 0 ? (
          <div className="mt-12">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">DÉJÀ PUBLIÉES<Cur /></p>
            <div className="mt-4 border-t border-line">
              {actus.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
                  <div className="min-w-0">
                    <p className="mono text-[11px] text-ink-faint">{dateActu(a.publie_le)}</p>
                    <p className="mt-1 truncate text-[15px] font-medium">{a.titre}</p>
                    <Link
                      href={`/${org.slug}/actualites/${a.id}`}
                      className="mono mt-1 inline-block text-[11px] text-ink-soft hover:text-ink"
                    >
                      VOIR LA PAGE →
                    </Link>
                  </div>
                  {/* Pas d'édition en v1 : supprimer puis republier fait le travail. */}
                  <form action={supprimerActualite.bind(null, org.slug, a.id)}>
                    <button className="mono shrink-0 border border-line px-3 py-2 text-[11px] uppercase tracking-wide hover:border-ink" style={{ color: "#B23B3B" }}>
                      Supprimer
                    </button>
                  </form>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
