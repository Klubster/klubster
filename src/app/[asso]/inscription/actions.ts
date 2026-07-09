"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { stripeConfigured, createCheckoutForClub, createCheckout3xForClub } from "@/lib/stripe";
import { envoyerEmail } from "@/lib/resend";
import { verifierSoumissionPublique } from "@/lib/antiabus";

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

  // Formulaire public : on filtre les robots AVANT tout envoi d'email ou création de compte.
  const verdict = await verifierSoumissionPublique(formData, slug);
  if (!verdict.ok) redirect(`/${slug}/inscription?erreur=${verdict.raison}`);

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

  // Responsable légal (affiché automatiquement quand l'adhérent est mineur)
  const respPrenom = String(formData.get("resp_prenom") ?? "").trim();
  const respNom = String(formData.get("resp_nom") ?? "").trim();
  const respEmail = String(formData.get("resp_email") ?? "").trim();
  const respTel = String(formData.get("resp_tel") ?? "").trim();
  if (respPrenom || respNom) {
    infos["Responsable légal"] = [respPrenom, respNom].filter(Boolean).join(" ");
    if (respEmail) infos["Responsable légal — email"] = respEmail;
    if (respTel) infos["Responsable légal — téléphone"] = respTel;
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
    // Email déjà enregistré : Supabase renvoie un faux utilisateur (anti-énumération, identities vides).
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      redirect(`/${slug}/inscription?erreur=compte_existant`);
    }
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
    p_mode: mode === "en_ligne_3x" ? "en_ligne" : mode,
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

  // Cours choisi (pour les emails de confirmation et le paiement en ligne)
  const { data: coursChoisi } = await supabase.from("cours").select("nom, tarif_centimes").eq("id", coursId).maybeSingle();
  const coursNom = (coursChoisi as { nom: string } | null)?.nom ?? "Cours";
  const tarifCentimes = (coursChoisi as { tarif_centimes: number } | null)?.tarif_centimes ?? 0;

  // Emails de confirmation (non bloquants — l'inscription est déjà enregistrée)
  const libelleMode =
    mode === "en_ligne_3x" ? "En ligne — 3 mensualités (carte bancaire)"
    : mode === "en_ligne" ? "En ligne (carte bancaire)"
    : mode === "cheque" ? "Par chèque, à remettre au club"
    : "En espèces, à remettre au club";
  try {
    if (email) {
      await envoyerEmail({
        to: email,
        fromNom: `${org.nom} via Klubster`,
        replyTo: org.email_contact,
        objet: `Votre inscription — ${org.nom}`,
        texte:
          `Bonjour ${prenom},\n\n` +
          `Votre inscription au ${org.nom} est bien enregistrée.\n\n` +
          `Cours : ${coursNom}\n` +
          `Cotisation : ${(tarifCentimes / 100).toLocaleString("fr-FR")} € / an\n` +
          `Règlement : ${libelleMode}\n\n` +
          `Votre espace adhérent (dossier, pièces à déposer, carte de membre) :\n` +
          `${BASE}/${slug}/espace\n\n` +
          `Pensez à confirmer votre adresse email si ce n'est pas déjà fait (un email séparé vous a été envoyé).\n\n` +
          `Sportivement,\n${org.nom}`,
      });
    }
    if (org.email_contact) {
      await envoyerEmail({
        to: org.email_contact,
        objet: `Nouvelle inscription — ${prenom} ${nom}`,
        texte:
          `Une nouvelle inscription vient d'arriver au ${org.nom} :\n\n` +
          `${prenom} ${nom}\n` +
          `Cours : ${coursNom}\n` +
          `Règlement : ${libelleMode}\n\n` +
          `À retrouver dans votre cockpit :\n${BASE}/${slug}/cockpit\n\n` +
          `— Klubster`,
      });
    }
  } catch (e) {
    console.error("emails inscription", e);
  }

  // Paiement en ligne (si choisi + club connecté + plateforme configurée)
  const enLigne = mode === "en_ligne" || mode === "en_ligne_3x";
  const troisFoisActif = org.form_config?.paiement?.troisFois === true;
  if (enLigne && org.stripe_account_id && stripeConfigured()) {
    const cours = coursChoisi;
    if (cours) {
      const optsCommunes = {
        clubAccount: org.stripe_account_id,
        coursNom: (cours as { nom: string }).nom,
        montantCentimes: (cours as { tarif_centimes: number }).tarif_centimes,
        successUrl: `${BASE}/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&paye=1`,
        cancelUrl: `${BASE}/${slug}/inscription?annule=1`,
        adhesionId: String(adhesionId),
        clientEmail: email || null,
      };
      try {
        const session =
          mode === "en_ligne_3x" && troisFoisActif
            ? await createCheckout3xForClub(optsCommunes)
            : await createCheckoutForClub(optsCommunes);
        if (session?.url) redirect(session.url as string);
      } catch (e) {
        console.error("stripe checkout", e);
      }
    }
  }

  redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&mode=${mode}`);
}
