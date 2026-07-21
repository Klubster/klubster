"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { stripeConfigured, createCheckoutForClub, createCheckoutEcheancesForClub, bornerEcheances } from "@/lib/stripe";
import { envoyerEmail } from "@/lib/resend";
import { verifierSoumissionPublique } from "@/lib/antiabus";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { compteConnecte } from "@/lib/stripe-org";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

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

  // Adresse postale — champ de la base commune (licences, attestations, courriers).
  const adressePostale = String(formData.get("adresse") ?? "").trim();
  if (adressePostale) infos["Adresse"] = adressePostale.slice(0, 300);

  // Date de naissance — champ de la base commune. Stockée sur la fiche : elle
  // n'était persistée que via le questionnaire de santé, désormais optionnel.
  const dateNaissance = String(formData.get("naissance") ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateNaissance)) infos["Date de naissance"] = dateNaissance;

  // Responsable légal (affiché automatiquement quand l'adhérent est mineur)
  const respPrenom = String(formData.get("resp_prenom") ?? "").trim();
  const respNom = String(formData.get("resp_nom") ?? "").trim();
  const respEmail = String(formData.get("resp_email") ?? "").trim();
  const respTel = String(formData.get("resp_tel") ?? "").trim();
  // Autorisations parentales (mineurs) : on trace Oui/Non pour chaque autorisation
  // configurée par le club — la valeur « Non » est aussi une information (ex. l'enfant
  // ne doit PAS quitter seul l'entraînement).
  const respPrenomBrut = String(formData.get("resp_prenom") ?? "").trim();
  const estInscriptionMineur = Boolean(respPrenomBrut);
  if (estInscriptionMineur) {
    for (const a of org.form_config?.mineur?.autorisations ?? []) {
      const coche = formData.get(`autorisation_${a.id}`) === "oui";
      infos[`Autorisation — ${a.label.slice(0, 120)}`] = coche ? "Oui" : "Non";
    }
  }

  // RÉDUCTIONS (Pass'Sport…) — calcul strictement côté serveur : les montants
  // viennent de la configuration du club (form_config.remises), jamais du
  // navigateur. Le code justificatif est tracé sur la fiche pour vérification
  // par le club (portail officiel pour le Pass'Sport).
  let remiseTotaleCentimes = 0;
  for (const r of org.form_config?.remises ?? []) {
    if (formData.get(`remise_${r.id}`) !== "oui") continue;
    const codeRemise = String(formData.get(`remise_code_${r.id}`) ?? "").trim();
    if (r.exigeCode && !codeRemise) continue; // pas de code = pas de remise
    const montantRemise = Number.isFinite(r.montant_centimes) ? Math.max(0, Math.round(r.montant_centimes)) : 0;
    if (montantRemise === 0) continue;
    remiseTotaleCentimes += montantRemise;
    infos[`Réduction — ${r.label.slice(0, 80)}`] = `−${(montantRemise / 100).toLocaleString("fr-FR")} €`;
    if (codeRemise) infos[`Réduction — ${r.label.slice(0, 80)} — code`] = codeRemise.slice(0, 60);
  }

  const respQualite = String(formData.get("resp_qualite") ?? "").trim();
  if (respPrenom || respNom) {
    infos["Responsable légal"] = [respPrenom, respNom].filter(Boolean).join(" ");
    if (respQualite) infos["Responsable légal — qualité"] = respQualite.slice(0, 60);
    if (respEmail) infos["Responsable légal — email"] = respEmail;
    if (respTel) infos["Responsable légal — téléphone"] = respTel;
  }

  const supabase = createSupabaseServerClient();

  // Les écritures d'inscription passent par la service_role, jamais par la clé anonyme.
  // Conséquence : `register_adherent_full` et `enregistrer_questionnaire_sante` peuvent être
  // fermées à `anon` — sinon n'importe qui pouvait déposer un faux questionnaire de santé
  // (donnée art. 9) sur une adhésion dont il devinait l'identifiant.
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("inscrireAdherent : service_role indisponible");
    redirect(`/${slug}/inscription?erreur=1`);
  }

  // Compte adhérent (mot de passe)
  // signUp() écrit les cookies de session de la personne inscrite : si quelqu'un est
  // déjà connecté (cas courant — le président teste son propre formulaire d'inscription
  // juste après avoir publié son club, constaté à l'audit du 21/07/2026), il se retrouvait
  // déconnecté et renvoyé vers /connexion à la navigation suivante. On mémorise donc la
  // session en cours pour la rétablir juste après.
  const { data: sessionAvant } = await supabase.auth.getSession();
  let userId: string | null = null;
  if (email && password) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { prenom, nom, role: "adherent" }, emailRedirectTo: `${BASE}/auth/callback` },
    });
    if (sessionAvant.session) {
      await supabase.auth.setSession({
        access_token: sessionAvant.session.access_token,
        refresh_token: sessionAvant.session.refresh_token,
      });
    }
    if (error) redirect(`/${slug}/inscription?erreur=compte`);
    // Email déjà enregistré : Supabase renvoie un faux utilisateur (anti-énumération, identities vides).
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      redirect(`/${slug}/inscription?erreur=compte_existant`);
    }
    userId = data.user?.id ?? null;
  }

  const { data: adhesionId, error } = await admin.rpc("register_adherent_full", {
    p_slug: slug,
    p_user_id: userId,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_tel: tel,
    p_cours_id: coursId || null,
    p_infos: infos,
    p_mode: mode === "en_ligne_echeances" ? "en_ligne" : mode,
  });
  if (error || !adhesionId) {
    console.error("register_adherent_full", error?.message);
    redirect(`/${slug}/inscription?erreur=1`);
  }

  // La jauge a pu placer l'adhésion en liste d'attente (cours complet) : dans ce cas, on ne
  // demande aucun paiement — la personne n'a pas encore de place — et on la prévient.
  const { data: adhLigne } = await admin.from("adhesions").select("statut").eq("id", String(adhesionId)).maybeSingle();
  const enListeAttente = (adhLigne as { statut: string } | null)?.statut === "liste_attente";

  // Questionnaire de santé + signature.
  //
  // Le résultat est RECALCULÉ ici à partir des réponses transmises : auparavant le
  // serveur reprenait tel quel un champ masqué `qsante_resultat`, qu'il suffisait de
  // modifier dans la requête pour se déclarer apte sans avoir répondu (audit du
  // 21/07/2026). Les réponses ne servent qu'à ce calcul et ne sont jamais enregistrées.
  const qType = String(formData.get("qsante_type") ?? "adulte");
  const reponsesBrutes = String(formData.get("qsante_reponses") ?? "")
    .split(",")
    .map((r) => r.trim().toLowerCase());
  const aRepondu = reponsesBrutes.filter((r) => r === "oui" || r === "non");
  const qResultat =
    // Un seul « oui » suffit. Un questionnaire incomplet est traité comme le cas le
    // plus prudent : certificat demandé, plutôt qu'attestation accordée par défaut.
    aRepondu.length === 0 || aRepondu.length !== reponsesBrutes.length || aRepondu.includes("oui")
      ? "certificat_requis"
      : "atteste_negatif";
  const qNaissance = String(formData.get("naissance") ?? "");
  const qSignature = String(formData.get("qsante_signature") ?? "");
  const qSignataire = String(formData.get("qsante_signataire") ?? "").trim();
  const qQualite = String(formData.get("qsante_qualite") ?? "adherent");
  if (qNaissance && qSignature) {
    // RGPD — minimisation des données de santé : on ne conserve que le résultat
    // (atteste_negatif / certificat_requis) + signature + date, jamais le détail des réponses.
    const { error: qErr } = await admin.rpc("enregistrer_questionnaire_sante", {
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
  // Filtré par organisation : sans cela, un coursId d'un autre club (tarif plus bas)
  // pouvait servir de base au montant du checkout.
  const { data: coursChoisi } = await supabase
    .from("cours")
    .select("nom, tarif_centimes")
    .eq("id", coursId)
    .eq("organisation_id", org.id)
    .maybeSingle();
  const coursNom = (coursChoisi as { nom: string } | null)?.nom ?? "Cours";
  const tarifCentimes = (coursChoisi as { tarif_centimes: number } | null)?.tarif_centimes ?? 0;

  // Le montant dû de l'adhésion reflète la remise éventuelle (le RPC l'avait fixé
  // au tarif plein du cours).
  const montantDuCentimes = Math.max(0, tarifCentimes - remiseTotaleCentimes);
  if (remiseTotaleCentimes > 0) {
    const { error: majErr } = await admin
      .from("adhesions")
      .update({ montant_centimes: montantDuCentimes })
      .eq("id", String(adhesionId));
    if (majErr) console.error("remise montant adhesion", majErr.message);
  }

  // Emails de confirmation (non bloquants — l'inscription est déjà enregistrée)
  const echeancesChoisies = Math.min(
    bornerEcheances(formData.get("echeances") ?? 1),
    bornerEcheances(org.echeances_max ?? 1)
  );
  const libelleMode =
    mode === "en_ligne_echeances" ? `En ligne — ${echeancesChoisies} mensualités (carte bancaire)`
    : mode === "en_ligne" ? "En ligne (carte bancaire)"
    : mode === "cheque" ? "Par chèque, à remettre au club"
    : "En espèces, à remettre au club";
  try {
    if (email) {
      await envoyerEmail({
        to: email,
        fromNom: `${org.nom} via Klubster`,
        replyTo: org.email_contact,
        objet: enListeAttente ? `Liste d'attente — ${org.nom}` : `Votre inscription — ${org.nom}`,
        texte: enListeAttente
          ? `Bonjour ${prenom},\n\n` +
            `Le cours « ${coursNom} » est complet pour le moment : vous êtes inscrit(e) sur la liste d'attente.\n\n` +
            `Aucun paiement ne vous est demandé pour l'instant. Nous vous préviendrons dès qu'une place se libère.\n\n` +
            `Sportivement,\n${org.nom}`
          : `Bonjour ${prenom},\n\n` +
            `Votre inscription au ${org.nom} est bien enregistrée.\n\n` +
            `Cours : ${coursNom}\n` +
            `Cotisation : ${(montantDuCentimes / 100).toLocaleString("fr-FR")} € / an` +
            (remiseTotaleCentimes > 0
              ? ` (${(tarifCentimes / 100).toLocaleString("fr-FR")} € − ${(remiseTotaleCentimes / 100).toLocaleString("fr-FR")} € de réduction)`
              : "") +
            `\nRèglement : ${libelleMode}\n\n` +
            `Votre espace adhérent (dossier, pièces à déposer, carte de membre) :\n` +
            `${BASE}/${slug}/espace\n\n` +
            `Pensez à confirmer votre adresse email si ce n'est pas déjà fait (un email séparé vous a été envoyé).\n\n` +
            `Sportivement,\n${org.nom}`,
      });
    }
    // Destinataire de l'alerte club : l'email de contact public s'il existe, sinon celui
    // du président. L'étape « Infos » du wizard étant optionnelle, un club créé en 5 minutes
    // n'a souvent aucun email de contact — et ne recevait alors AUCUNE notification
    // d'inscription (constaté à l'audit du 21/07/2026). Les inscriptions n'existaient que
    // pour qui pensait à ouvrir son cockpit.
    let destinataireClub = org.email_contact;
    if (!destinataireClub) {
      const { data: president } = await admin
        .from("profiles")
        .select("email")
        .eq("organisation_id", org.id)
        // super_admin inclus : l'éditeur est rattaché à son propre club et en reste le
        // président, son rôle ne doit pas le priver des notifications d'inscription.
        .in("role", ["admin_asso", "super_admin"])
        .not("email", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      destinataireClub = president?.email ?? null;
    }
    if (destinataireClub) {
      await envoyerEmail({
        to: destinataireClub,
        objet: enListeAttente ? `Liste d'attente — ${prenom} ${nom}` : `Nouvelle inscription — ${prenom} ${nom}`,
        texte:
          (enListeAttente
            ? `Le cours « ${coursNom} » étant complet, cette personne a été placée en liste d'attente :\n\n`
            : `Une nouvelle inscription vient d'arriver au ${org.nom} :\n\n`) +
          `${prenom} ${nom}\n` +
          `Cours : ${coursNom}\n` +
          (enListeAttente ? `` : `Règlement : ${libelleMode}\n`) +
          `\nÀ retrouver dans votre cockpit :\n${BASE}/${slug}/cockpit\n\n` +
          `— Klubster`,
      });
    }
  } catch (e) {
    console.error("emails inscription", e);
  }

  // Sur liste d'attente : on ne facture pas, la personne n'a pas encore de place.
  if (enListeAttente) {
    redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&attente=1`);
  }

  // Paiement en ligne (si choisi + club connecté + plateforme configurée)
  const enLigne = mode === "en_ligne" || mode === "en_ligne_echeances";
  const compteClub = compteConnecte(org);
  // montantDuCentimes === 0 (remise couvrant tout) : rien à encaisser, pas de checkout.
  if (enLigne && compteClub && stripeConfigured() && montantDuCentimes > 0) {
    const cours = coursChoisi;
    if (cours) {
      const optsCommunes = {
        clubAccount: compteClub,
        coursNom: (cours as { nom: string }).nom,
        // Montant après réduction éventuelle — calculé serveur, jamais côté client.
        montantCentimes: montantDuCentimes,
        successUrl: `${BASE}/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&paye=1`,
        cancelUrl: `${BASE}/${slug}/inscription?annule=1`,
        adhesionId: String(adhesionId),
        clientEmail: email || null,
      };
      // L'adhérent choisit son nombre de mensualités, mais jamais au-delà du plafond du club.
      const demandees = bornerEcheances(formData.get("echeances") ?? 1);
      const plafond = bornerEcheances(org.echeances_max ?? 1);
      const echeances = Math.min(demandees, plafond);

      let urlPaiement: string | null = null;
      try {
        const session =
          mode === "en_ligne_echeances" && echeances > 1
            ? await createCheckoutEcheancesForClub({ ...optsCommunes, echeances })
            : await createCheckoutForClub(optsCommunes);
        urlPaiement = (session?.url as string) ?? null;
      } catch (e) {
        console.error("stripe checkout", e);
      }

      // ⚠️ redirect() lève NEXT_REDIRECT : appelé DANS le try, il était avalé par le catch
      // et l'adhérent n'était jamais envoyé chez Stripe. Il doit rester en dehors.
      if (urlPaiement) redirect(urlPaiement);
    }
  }

  redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}&mode=${mode}`);
}
