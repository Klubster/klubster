import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { enregistrerActualite, supprimerActualite } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function ActualitePage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ ok?: string; supprime?: string }>;
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
  const act = org.actualite;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER · ACTUALITÉ<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">À LA UNE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Une actualité dans votre hero.</h1>
        <p className="mt-3 text-ink-soft">
          Un message — et/ou une image — affiché tout en haut de votre vitrine. Laissez tout vide pour ne rien afficher.
        </p>

        {searchParams?.ok ? <p className="mono mt-6 text-[12px] text-brand">✓ Actualité enregistrée — visible sur votre vitrine.</p> : null}
        {searchParams?.supprime ? <p className="mono mt-6 text-[12px] text-ink-soft">Actualité supprimée.</p> : null}

        {act?.image_url ? (
          <div className="mt-8">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">IMAGE ACTUELLE</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={act.image_url} alt="Actualité" className="mt-2 h-44 w-full border border-line object-cover" />
          </div>
        ) : null}

        <form action={enregistrerActualite.bind(null, org.slug)} className="mt-8 space-y-6">
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">MESSAGE</label>
            <textarea
              name="texte"
              rows={3}
              defaultValue={act?.texte ?? ""}
              placeholder="Reprise des cours le 4 septembre. Inscriptions ouvertes."
              className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
          <div className="border border-line bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">IMAGE (OPTIONNELLE)</label>
            <input type="file" name="image" accept="image/*" className="mt-2 block w-full text-[13px]" />
            <p className="mono mt-2 text-[11px] text-ink-faint">JPG ou PNG, format paysage conseillé. Remplace l&apos;image actuelle.</p>
          </div>
          <button className="mono w-full bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 sm:w-auto">ENREGISTRER →</button>
        </form>

        {act ? (
          <form action={supprimerActualite.bind(null, org.slug)} className="mt-4">
            <button className="mono text-[12px] text-ink-soft hover:text-ink">Supprimer l&apos;actualité</button>
          </form>
        ) : null}
      </div>
    </main>
  );
}
