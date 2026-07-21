import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import Scanner from "./Scanner";

export const dynamic = "force-dynamic";

export default async function Page(props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/scanner`);
  }
  return <Scanner slug={org.slug} nom={org.nom} accent={org.couleur_primaire ?? "#111111"} />;
}
