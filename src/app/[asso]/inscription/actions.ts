"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { stripeConfigured, createCheckoutForClub } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

export async function inscrireAdherent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const prenom = String(formData.get("prenom") ?? "");
  const nom = String(formData.get("nom") ?? "");
  const email = String(formData.get("email") ?? "");
  const tel = String(formData.get("tel") ?? "");
  const coursId = String(formData.get("cours") ?? "");

  const supabase = createSupabaseServerClient();
  const { data: adhesionId, error } = await supabase.rpc("register_adherent", {
    p_slug: slug,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_tel: tel,
    p_cours_id: coursId || null,
  });

  if (error || !adhesionId) {
    console.error("inscrireAdherent", error?.message);
    redirect(`/${slug}/inscription?erreur=1`);
  }

  // Si le club a connecté Stripe et que la plateforme est configurée → paiement en ligne.
  const org = await getOrganisationBySlug(slug);
  if (org?.stripe_account_id && stripeConfigured()) {
    const { data: cours } = await supabase
      .from("cours")
      .select("nom, tarif_centimes")
      .eq("id", coursId)
      .maybeSingle();
    if (cours) {
      try {
        const session = await createCheckoutForClub({
          clubAccount: org.stripe_account_id,
          coursNom: (cours as { nom: string }).nom,
          montantCentimes: (cours as { tarif_centimes: number }).tarif_centimes,
          successUrl: `${BASE}/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&paye=1`,
          cancelUrl: `${BASE}/${slug}/inscription?annule=1`,
          adhesionId: String(adhesionId),
          clientEmail: email || null,
        });
        if (session?.url) redirect(session.url as string);
      } catch (e) {
        console.error("stripe checkout", e);
      }
    }
  }

  redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}`);
}
