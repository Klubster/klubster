"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createConnectedAccount, createAccountLink, stripeConfigured } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

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
