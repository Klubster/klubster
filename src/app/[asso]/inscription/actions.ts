"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { stripeConfigured, createCheckoutForClub } from "@/lib/stripe";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app";

export async function inscrireAdherent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const prenom = String(formData.get("prenom") ?? "").trim();
  const nom = String(formData.get("nom") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const tel = String(formData.get("tel") ?? "");
  const coursId = String(formData.get("cours") ?? "");
  const password = String(formData.get("password") ?? "");
  const mode = String(formData.get("mode") ?? "en_ligne");

  const org = await getOrganisationBySlug(slug);
  if (!org) redirect(`/${slug}/inscription?erreur=1`);

  // Réponses aux champs personnalisés
  const infos: Record<string, string> = {};
  for (const page of org.form_config?.pages ?? []) {
    for (const ch of page.champs) {
      const v = formData.get(`champ_${ch.id}`);
      if (v != null && String(v) !== "") infos[ch.label || ch.id] = String(v);
    }
  }

  const supabase = createSupabaseServerClient();

  // Compte adhérent (mot de passe)
  let userId: string | null = null;
  if (email && password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom, nom, role: "adherent" }, emailRedirectTo: `${BASE}/auth/callback` },
    });
    if (error) redirect(`/${slug}/inscription?erreur=compte`);
    userId = data.user?.id ?? null;
  }

  const { data: adhesionId, error } = await supabase.rpc("register_adherent_full", {
    p_slug: slug,
    p_user_id: userId,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_tel: tel,
    p_cours_id: coursId || null,
    p_infos: infos,
    p_mode: mode,
  });
  if (error || !adhesionId) {
    console.error("register_adherent_full", error?.message);
    redirect(`/${slug}/inscription?erreur=1`);
  }

  // Questionnaire de santé (remplace le certificat médical) + signature
  const qType = String(formData.get("qsante_type") ?? "adulte");
  const qResultat = String(formData.get("qsante_resultat") ?? "atteste_negatif");
  const qNaissance = String(formData.get("naissance") ?? "");
  const qSignature = String(formData.get("qsante_signature") ?? "");
  const qSignataire = String(formData.get("qsante_signataire") ?? "").trim();
  const qQualite = String(formData.get("qsante_qualite") ?? "adherent");
  if (qNaissance && qSignature) {
    // RGPD — minimisation des données de santé : on ne conserve que le résultat
    // (atteste_negatif / certificat_requis) + signature + date, jamais le détail des réponses.
    const { error: qErr } = await supabase.rpc("enregistrer_questionnaire_sante", {
      p_adhesion_id: String(adhesionId),
      p_type: qType,
      p_date_naissance: qNaissance,
      p_reponses: {},
      p_resultat: qResultat,
      p_signataire_nom: qSignataire || null,
      p_signataire_qualite: qQualite,
      p_signature: qSignature,
    });
    if (qErr) console.error("enregistrer_questionnaire_sante", qErr.message);
  }

  // Paiement en ligne (si choisi + club connecté + plateforme configurée)
  if (mode === "en_ligne" && org.stripe_account_id && stripeConfigured()) {
    const { data: cours } = await supabase.from("cours").select("nom, tarif_centimes").eq("id", coursId).maybeSingle();
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

  redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&mode=${mode}`);
}
