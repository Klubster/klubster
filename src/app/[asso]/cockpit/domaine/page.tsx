import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { statutDomaine, vercelConfigured } from "@/lib/vercel";
import { connecterDomaine, deconnecterDomaine } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function DomainePage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ ok?: string; erreur?: string; retire?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/domaine`);
  }

  const domaine = org.domaine_custom;
  const statut = domaine ? await statutDomaine(domaine) : null;
  const connecterAvecSlug = connecterDomaine.bind(null, org.slug);
  const deconnecterAvecSlug = deconnecterDomaine.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">VOTRE DOMAINE<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">VOTRE DOMAINE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Votre club, votre adresse.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Aujourd&apos;hui votre site vit sur <span className="mono text-ink">klubster.fr/{org.slug}</span>.
          Connectez votre propre nom de domaine pour qu&apos;il vive chez vous.
        </p>

        {searchParams?.ok ? (
          <p className="mono mt-6 text-[12px] text-brand">✓ Domaine connecté — configurez les DNS ci-dessous, puis patientez quelques minutes.</p>
        ) : null}
        {searchParams?.retire ? (
          <p className="mono mt-6 text-[12px] text-ink-soft">Domaine retiré. Votre site reste accessible sur klubster.fr/{org.slug}.</p>
        ) : null}
        {searchParams?.erreur === "format" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Ce nom de domaine n&apos;est pas valide (ex. attendu : monclub.fr).</p>
        ) : searchParams?.erreur === "deja_pris" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Ce domaine est déjà utilisé par un autre club.</p>
        ) : searchParams?.erreur === "config" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>La connexion de domaines n&apos;est pas encore activée sur la plateforme.</p>
        ) : searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>La connexion a échoué. Vérifiez le domaine et réessayez.</p>
        ) : null}

        {!domaine ? (
          <>
            {vercelConfigured() ? (
              <form action={connecterAvecSlug} className="mt-10">
                <label className="mono text-[10px] uppercase tracking-label text-ink-soft">VOTRE NOM DE DOMAINE</label>
                {/* Champ puis bouton empilés sur mobile : côte à côte, il restait
                    à peine 12 caractères visibles pour saisir le domaine. */}
                <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                  <input
                    name="domaine"
                    placeholder="monclub.fr"
                    required
                    className="mono w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink sm:flex-1"
                  />
                  <button className="mono whitespace-nowrap bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                    CONNECTER →
                  </button>
                </div>
                <p className="mono mt-3 text-[11px] text-ink-faint">
                  Le domaine doit déjà vous appartenir (acheté chez OVH, Gandi, Ionos…).
                </p>
              </form>
            ) : (
              <p className="mono mt-10 text-[12px] text-ink-soft">
                La connexion de domaines arrive bientôt. En attendant, écrivez-nous et nous la ferons pour vous.
              </p>
            )}
          </>
        ) : (
          <div className="mt-10 space-y-6">
            <div className="border border-line bg-paper px-5 py-4">
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">DOMAINE CONNECTÉ</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
                <span className="mono text-[16px] font-bold">{domaine}</span>
                {statut?.verifie ? (
                  <span className="mono text-[12px] text-brand">✓ ACTIF — SSL en place</span>
                ) : (
                  <span className="mono text-[12px]" style={{ color: "#8A6508" }}>● EN ATTENTE DES DNS</span>
                )}
              </div>
            </div>

            {!statut?.verifie ? (
              <div className="border border-line bg-paper px-5 py-4">
                <p className="mono text-[10px] uppercase tracking-label text-ink-soft">
                  À CONFIGURER CHEZ VOTRE REGISTRAR (OVH, GANDI…)<Cur />
                </p>
                <div className="mono mt-4 space-y-2 text-[13px]">
                  <div className="flex flex-wrap gap-x-6 gap-y-1 border-b border-line pb-2">
                    <span className="w-14 text-ink-faint">Type A</span>
                    <span className="text-ink-soft">{domaine}</span>
                    <span className="font-bold">76.76.21.21</span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 pt-1">
                    <span className="w-14 text-ink-faint">CNAME</span>
                    <span className="text-ink-soft">www.{domaine}</span>
                    <span className="font-bold">cname.vercel-dns.com.</span>
                  </div>
                </div>
                <p className="mono mt-4 text-[11px] leading-relaxed text-ink-faint">
                  Une fois les DNS enregistrés (souvent moins d&apos;une heure), le certificat HTTPS est émis
                  automatiquement. Rechargez cette page pour voir le statut passer au vert.
                </p>
              </div>
            ) : (
              <p className="max-w-prose text-[15px] text-ink-soft">
                Votre site répond sur <a href={`https://${domaine}`} className="mono text-ink underline">{domaine}</a> —
                partagez cette adresse à vos adhérents. L&apos;adresse klubster.fr/{org.slug} continue de fonctionner.
              </p>
            )}

            <form action={deconnecterAvecSlug}>
              <button className="mono text-[12px] text-ink-faint hover:text-ink">RETIRER CE DOMAINE ×</button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
