import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationPubliqueBySlug, getCoursByOrganisation } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saisonCourante } from "@/lib/saison";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import { compteConnecte, accesClub } from "@/lib/stripe-org";
import FormulaireInscription from "./FormulaireInscription";

export const dynamic = "force-dynamic";

export default async function InscriptionPage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ erreur?: string }>;
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

  // Jauge : un cours dont la capacité est atteinte est signalé « complet » (→ liste d'attente).
  const supabase = await createSupabaseServerClient();
  const saisonAct = saisonCourante(org);
  const [{ data: placesRows }, { data: adhCount }] = await Promise.all([
    supabase.from("cours").select("id, places_max").eq("organisation_id", org.id),
    supabase.from("adhesions").select("cours_id, statut, saison").eq("organisation_id", org.id),
  ]);
  const placesMax = new Map((placesRows ?? []).map((r) => [r.id as string, r.places_max as number | null]));
  const actifs = new Map<string, number>();
  for (const a of (adhCount ?? []) as { cours_id: string | null; statut: string | null; saison: string | null }[]) {
    if (a.cours_id && a.saison === saisonAct && ["en_attente", "en_retard", "paye"].includes(a.statut ?? "")) {
      actifs.set(a.cours_id, (actifs.get(a.cours_id) ?? 0) + 1);
    }
  }
  const estComplet = (id: string) => {
    const pm = placesMax.get(id);
    return pm != null && pm > 0 && (actifs.get(id) ?? 0) >= pm;
  };

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
              complet: estComplet(c.id),
            }))}
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
