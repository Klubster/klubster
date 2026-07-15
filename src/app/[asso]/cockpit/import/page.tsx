import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import ImportClient from "./ImportClient";

export const dynamic = "force-dynamic";

/** Import CSV des adhérents — migration depuis un tableur, en trois temps :
    fichier → correspondance des colonnes → aperçu et import. */
export default async function ImportPage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/import`);
  }
  return <ImportClient slug={org.slug} nom={org.nom} />;
}
