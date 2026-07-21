import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import FormBuilder from "./FormBuilder";
import type { FormConfig } from "@/types/form";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/formulaire`);
  }
  const config: FormConfig = org.form_config ?? { pages: [], pieces: [] };
  const cours = await getCoursByOrganisation(org.id);
  return (
    <FormBuilder
      slug={org.slug}
      nom={org.nom}
      initial={config}
      cours={cours.map((c) => ({ id: c.id, nom: c.nom }))}
      stripeConnecte={!!org.stripe_account_id}
    />
  );
}
