import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationPubliqueBySlug, getCoursByOrganisation } from "@/lib/queries";
import { coursComplets } from "@/lib/complets";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import { compteConnecte, accesClub } from "@/lib/stripe-org";
import FormulaireInscription from "./FormulaireInscription";

export const dynamic = "force-dynamic";

export default async function InscriptionPage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ erreur?: string; cours?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationPubliqueBySlug(params.asso);
  if (!org) notFound();

  // Club dont l'abonnement est suspendu : les inscriptions en ligne sont fermées. On
  // l'affiche clairement plutôt que de laisser remplir un formulaire refusé à l'envoi.
  if (accesClub(org) === "suspendu") {
    const accentF = org.couleur_primaire ?? "#111111";
    return (
      <ThemeVitrine org={org}>
        <main className="min-h-screen text-ink">
          <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
            <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
            <span className="mono text-[11px] uppercase tracking-label text-ink-soft">INSCRIPTION<span style={{ color: accentF }}>_</span></span>
          </header>
          <div className="mx-auto max-w-2xl px-6 py-20 text-center md:px-8">
            <h1 className="text-2xl font-medium md:text-3xl">Les inscriptions en ligne sont momentanément fermées.</h1>
            <p className="mt-4 text-ink-soft">
              Rapprochez-vous directement de {org.nom} pour connaître les modalités d&apos;adhésion.
            </p>
            {org.email_contact ? (
              <a href={`mailto:${org.email_contact}`} className="mono mt-8 inline-block border border-ink px-6 py-3 text-[13px] hover:bg-bg-alt">
                CONTACTER LE CLUB
              </a>
            ) : null}
          </div>
        </main>
      </ThemeVitrine>
    );
  }

  const cours = await getCoursByOrganisation(org.id);

  // Jauge : un cours dont la capacité est atteinte est signalé « complet » (→ liste
  // d'attente). Mécanisme partagé avec la vitrine (lib/complets.ts) : mêmes requêtes,
  // même règle de saison — les deux pages disent la même chose.
  const complets = await coursComplets(org);

  // Cours présélectionné (bouton « S'inscrire à ce cours » de la vitrine) : l'id est
  // validé contre la liste réelle — un id étranger ou périmé est simplement ignoré.
  const coursPreselectionne = cours.some((c) => c.id === searchParams?.cours)
    ? (searchParams!.cours as string)
    : null;

  const accent = org.couleur_primaire ?? "#111111";

  return (
    <ThemeVitrine org={org}>
      <main className="min-h-screen text-ink">
        <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
          <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">INSCRIPTION<span style={{ color: accent }}>_</span></span>
        </header>

        <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 01 — ADHÉSION<span style={{ color: accent }}>_</span></p>
          <h1 className="mt-6 text-3xl font-medium md:text-4xl">Rejoindre {org.nom}.</h1>
          <p className="mt-4 max-w-prose text-ink-soft">
            Créez votre compte adhérent : vous pourrez ensuite suivre votre dossier, déposer vos pièces
            et voir votre carte de membre.
          </p>

          {/* Le formulaire vit dans un composant client : les erreurs de l'action
              reviennent en état (useActionState) sans vider la saisie. */}
          <FormulaireInscription
            slug={org.slug}
            accent={accent}
            cours={cours.map((c) => ({
              id: c.id,
              nom: c.nom,
              tarif_centimes: c.tarif_centimes,
              complet: complets.has(c.id),
            }))}
            coursPreselectionne={coursPreselectionne}
            pages={org.form_config?.pages ?? []}
            pieces={org.form_config?.pieces ?? []}
            remises={org.form_config?.remises ?? []}
            autorisations={org.form_config?.mineur?.autorisations ?? []}
            questionnaireActif={Boolean(org.form_config?.sante?.questionnaire)}
            paiementEnLigne={Boolean(compteConnecte(org))}
            chequeParDefaut={!org.stripe_account_id}
            echeancesMax={org.echeances_max ?? 1}
            erreurInitiale={searchParams?.erreur ?? null}
          />
        </div>
      </main>
    </ThemeVitrine>
  );
}
