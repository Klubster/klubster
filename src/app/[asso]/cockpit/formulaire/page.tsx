import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import FormBuilder from "./FormBuilder";
import type { FormConfig } from "@/types/form";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/formulaire`);
  }
  const config: FormConfig = org.form_config ?? { pages: [], pieces: [] };
  return <FormBuilder slug={org.slug} nom={org.nom} initial={config} />;
}
