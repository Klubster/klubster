"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createConnectedAccount, createAccountLink, stripeConfigured, bornerEcheances } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

/**
 * Le club fixe le nombre maximal de mensualités proposées à ses adhérents (1 à 12).
 * L'adhérent choisira ensuite librement dans cette limite.
 */
export async function definirEcheancesMax(slug: string, formData: FormData) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }

  const max = bornerEcheances(formData.get("echeances_max"));
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ echeances_max: max }).eq("id", org.id);
  if (error) {
    console.error("echeances_max", error.message);
    redirect(`/${slug}/cockpit?stripe=erreur`);
  }
  redirect(`/${slug}/cockpit?stripe=echeances`);
}

export async function connecterStripe(slug: string) {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit`);
  }
  if (!stripeConfigured()) redirect(`/${slug}/cockpit?stripe=nonconfig`);

  const supabase = createSupabaseServerClient();
  let acct = org.stripe_account_id;
  if (!acct) {
    const account = await createConnectedAccount(org.email_contact);
    acct = account.id as string;
    await supabase.from("organisations").update({ stripe_account_id: acct }).eq("id", org.id);
  }
  const link = await createAccountLink(acct, `${BASE}/${slug}/cockpit`, `${BASE}/${slug}/cockpit?stripe=ok`);
  redirect(link.url as string);
}
