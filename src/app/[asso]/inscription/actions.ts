"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOrganisationPubliqueBySlug } from "@/lib/queries";
import { stripeConfigured, createCheckoutForClub, createCheckoutEcheancesForClub, bornerEcheances } from "@/lib/stripe";
import { envoyerEmail } from "@/lib/resend";
import { verifierSoumissionPublique } from "@/lib/antiabus";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { compteConnecte, accesClub } from "@/lib/stripe-org";
import { resultatDepuisReponses, estMineur, estDateNaissanceValide } from "@/lib/sante";

// Modes de paiement acceptés côté serveur. Un mode hors liste (requête forgée) ne doit
// pas devenir « null » en silence : il est refusé (4e audit).
const MODES_PAIEMENT = ["en_ligne", "en_ligne_echeances", "cheque", "especes"] as const;
import { gabaritEmail } from "@/lib/email-gabarit";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

/**
 * État retourné au formulaire via `useActionState`. Les erreurs sont RETOURNÉES
 * (et plus redirigées vers `?erreur=…`) : une redirection déclenche un GET qui
 * vide un formulaire de 20+ champs — la saisie est désormais conservée. Les
 * succès, eux, continuent de rediriger (merci, Stripe).
 */
export type EtatInscription = { erreur: string } | null;

export async function inscrireAdherent(_etatPrecedent: EtatInscription, formData: FormData): Promise<EtatInscription> {
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
  if (!verdict.ok) return { erreur: verdict.raison };

  const org = await getOrganisationPubliqueBySlug(slug);
  if (!org) return { erreur: "1" };

  // Abonnement du club suspendu (résilié, ou impayé au-delà de la grâce) : on ne prend
  // plus de nouvelles inscriptions. Lecture et export restent ouverts côté cockpit ; les
  // données existantes ne sont pas touchées. Les clubs pilotes (statut « aucun ») ne sont
  // jamais concernés.
  if (accesClub(org) === "suspendu") return { erreur: "suspendu" };

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
  // Vraie date calendaire, pas future : `2026-99-99` ne passe plus (4e audit).
  const dateValide = estDateNaissanceValide(dateNaissance);
  if (dateValide) infos["Date de naissance"] = dateNaissance;

  // La minorité est DÉDUITE de la date de naissance, jamais de la présence d'un champ
  // « responsable légal » dans la requête. Auparavant `Boolean(resp_prenom)` en tenait
  // lieu : un appel direct pouvait donc envoyer la date d'un mineur sans responsable et
  // passer pour un adulte (audit du 21/07/2026).
  const estInscriptionMineur = dateValide && estMineur(dateNaissance);

  // Responsable légal (affiché automatiquement quand l'adhérent est mineur)
  const respPrenom = String(formData.get("resp_prenom") ?? "").trim();
  const respNom = String(formData.get("resp_nom") ?? "").trim();
  const respEmail = String(formData.get("resp_email") ?? "").trim();
  const respTel = String(formData.get("resp_tel") ?? "").trim();
  // Autorisations parentales (mineurs) : on trace Oui/Non pour chaque autorisation
  // configurée par le club — la valeur « Non » est aussi une information (ex. l'enfant
  // ne doit PAS quitter seul l'entraînement).
  if (estInscriptionMineur) {
    for (const a of org.form_config?.mineur?.autorisations ?? []) {
      const coche = formData.get(`autorisation_${a.id}`) === "oui";
      infos[`Autorisation — ${a.label.slice(0, 120)}`] = coche ? "Oui" : "Non";
    }
  }

  // Questionnaire de santé + signature — lus ICI pour être validés avec le reste du
  // formulaire, AVANT toute création de compte ou d'adhésion.
  //
  // Le résultat est RECALCULÉ à partir des réponses transmises : auparavant le serveur
  // reprenait tel quel un champ masqué `qsante_resultat` (audit du 21/07/2026). Le TYPE
  // et la QUALITÉ du signataire sont imposés par le serveur d'après la minorité réelle —
  // jamais repris des champs masqués : un mineur exige la signature du représentant légal.
  const questionnaireActif = Boolean(org.form_config?.sante?.questionnaire);
  const qType = estInscriptionMineur ? ("mineur" as const) : ("adulte" as const);
  const qResultat = resultatDepuisReponses(qType, formData.get("qsante_reponses") as string | null);
  const qSignature = String(formData.get("qsante_signature") ?? "").trim().slice(0, 200000);
  const qSignataire = String(formData.get("qsante_signataire") ?? "").trim().slice(0, 120);
  const qQualite = estInscriptionMineur ? "representant_legal" : "adherent";
  // La case d'attestation sur l'honneur est vérifiée côté serveur : sans elle, on
  // n'enregistre aucune attestation, quelles que soient les réponses transmises.
  const qAtteste = formData.get("qsante_ok") === "on" || formData.get("qsante_ok") === "oui";
  // Une signature est une image dessinée (canvas → PNG en base64), pas une chaîne
  // arbitraire : on exige le format et une taille minimale — « x » ne signe rien.
  const signatureValide = /^data:image\/png;base64,[A-Za-z0-9+/=]{500,}$/.test(qSignature);

  // VALIDATION SERVEUR DU FORMULAIRE. Le navigateur marque les champs obligatoires, mais
  // un appel direct ne passe par aucun de ces contrôles : on reconstruit donc les règles
  // ici, à partir de la seule configuration du club et des données réellement reçues.
  const manque: string[] = [];
  // Base commune : identité, cours, date calendaire, adresse, email valide, mot de passe.
  // Le navigateur marque ces champs requis ; un appel direct ne passe par aucun de ces
  // contrôles, on les rejoue donc ici (4e audit).
  if (!prenom || !nom || !coursId || !dateValide) manque.push("base");
  if (!adressePostale) manque.push("adresse");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) manque.push("email");
  // Compte adhérent : mot de passe d'au moins 8 caractères. Sans lui, un appel direct
  // créait une fiche sans compte réellement exploitable.
  if (password.length < 8) manque.push("motdepasse");
  // Mode de paiement dans la liste blanche.
  if (!MODES_PAIEMENT.includes(mode as (typeof MODES_PAIEMENT)[number])) manque.push("mode");
  // Quand le club active le questionnaire de santé, il est OBLIGATOIRE : un appel direct
  // qui retire simplement les champs `qsante_*` ne doit plus aboutir (4e audit). Sans lui,
  // le club croirait le dossier en règle alors qu'aucune attestation n'existe.
  if (questionnaireActif && (!dateValide || !qAtteste || !signatureValide || qSignataire.length < 2)) {
    manque.push("questionnaire");
  }
  // Champs personnalisés déclarés obligatoires par le club.
  for (const page of org.form_config?.pages ?? []) {
    for (const ch of page.champs) {
      if (!ch.obligatoire) continue;
      const v = formData.get(`champ_${ch.id}`);
      if (v == null || String(v).trim() === "") manque.push(`champ:${ch.id}`);
    }
  }
  if (estInscriptionMineur) {
    // Un mineur exige un responsable légal identifiable et joignable.
    if (!respPrenom || !respNom || !respEmail) manque.push("responsable");
    // Autorisations parentales déclarées obligatoires.
    for (const a of org.form_config?.mineur?.autorisations ?? []) {
      if (a.obligatoire && formData.get(`autorisation_${a.id}`) !== "oui") manque.push(`autorisation:${a.id}`);
    }
  }
  if (manque.length > 0) {
    console.warn("inscription incomplète", slug, manque.join(","));
    return { erreur: "champs" };
  }

  // RÉDUCTIONS (Pass'Sport…) — DEMANDÉES à l'inscription, APPLIQUÉES après vérification
  // par le club.
  //
  // Auparavant la remise était déduite immédiatement du montant dû dès qu'un code non
  // vide était saisi — « x » suffisait à obtenir le Pass'Sport, et l'adhérent payait
  // moins avant toute vérification (audit du 21/07/2026). Un code justificatif (Pass'Sport,
  // aide locale) ne se valide pas à la volée : il se contrôle sur un portail officiel.
  //
  // On enregistre donc la demande sur la fiche, sans toucher au montant : l'adhérent paie
  // le tarif plein, et le club applique la réduction (avoir, remboursement partiel, ou
  // règlement du reliquat) une fois le justificatif vérifié. Aucune remise n'est plus
  // accordée automatiquement sur la foi d'un code non contrôlé.
  for (const r of org.form_config?.remises ?? []) {
    if (formData.get(`remise_${r.id}`) !== "oui") continue;
    const codeRemise = String(formData.get(`remise_code_${r.id}`) ?? "").trim();
    if (r.exigeCode && !codeRemise) continue; // demande sans code = ignorée
    const montant = Number.isFinite(r.montant_centimes) ? Math.max(0, Math.round(r.montant_centimes)) : 0;
    infos[`Réduction demandée — ${r.label.slice(0, 80)}`] =
      `−${(montant / 100).toLocaleString("fr-FR")} € — à valider par le club`;
    if (codeRemise) infos[`Réduction demandée — ${r.label.slice(0, 80)} — code`] = codeRemise.slice(0, 60);
  }
  // Le montant dû n'est PAS réduit ici : plus de remise appliquée avant validation.
  const remiseTotaleCentimes = 0;

  const respQualite = String(formData.get("resp_qualite") ?? "").trim();
  if (respPrenom || respNom) {
    infos["Responsable légal"] = [respPrenom, respNom].filter(Boolean).join(" ");
    if (respQualite) infos["Responsable légal — qualité"] = respQualite.slice(0, 60);
    if (respEmail) infos["Responsable légal — email"] = respEmail;
    if (respTel) infos["Responsable légal — téléphone"] = respTel;
  }

  const supabase = await createSupabaseServerClient();

  // Les écritures d'inscription passent par la service_role, jamais par la clé anonyme.
  // Conséquence : `register_adherent_full` et `enregistrer_questionnaire_sante` peuvent être
  // fermées à `anon` — sinon n'importe qui pouvait déposer un faux questionnaire de santé
  // (donnée art. 9) sur une adhésion dont il devinait l'identifiant.
  const admin = createSupabaseAdminClient();
  if (!admin) {
    console.error("inscrireAdherent : service_role indisponible");
    return { erreur: "1" };
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
    if (error) return { erreur: "compte" };
    // Email déjà enregistré : Supabase renvoie un faux utilisateur (anti-énumération, identities vides).
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { erreur: "compte_existant" };
    }
    userId = data.user?.id ?? null;
  }

  // Adhésion + questionnaire de santé dans UNE transaction SQL : un échec du volet santé
  // annule l'inscription entière — plus de dossier « complet » sans attestation (4e audit).
  // Le questionnaire part dès qu'il est fourni et valide ; il vient d'être exigé plus haut
  // quand le club l'active.
  const questionnaireFourni = dateValide && signatureValide && qAtteste;
  const { data: adhesionId, error } = await admin.rpc("register_adherent_avec_sante", {
    p_slug: slug,
    p_user_id: userId,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_tel: tel,
    p_cours_id: coursId || null,
    p_infos: infos,
    p_mode: mode === "en_ligne_echeances" ? "en_ligne" : mode,
    p_q_type: questionnaireFourni ? qType : null,
    p_q_date_naissance: questionnaireFourni ? dateNaissance : null,
    p_q_resultat: questionnaireFourni ? qResultat : null,
    p_q_signataire_nom: questionnaireFourni ? qSignataire || null : null,
    p_q_signataire_qualite: questionnaireFourni ? qQualite : null,
    p_q_signature: questionnaireFourni ? qSignature : null,
  });
  if (error || !adhesionId) {
    console.error("register_adherent_avec_sante", error?.message);
    // Le compte Auth vient d'être créé mais l'adhésion a échoué : on le supprime pour ne
    // pas laisser un compte orphelin (email pris, aucune fiche derrière) qui bloquerait
    // une nouvelle tentative avec « compte déjà existant » (4e audit).
    if (userId) {
      const { error: eDel } = await admin.auth.admin.deleteUser(userId);
      if (eDel) console.error("rollback compte Auth", userId, eDel.message);
    }
    return { erreur: "1" };
  }

  // La jauge a pu placer l'adhésion en liste d'attente (cours complet) : dans ce cas, on ne
  // demande aucun paiement — la personne n'a pas encore de place — et on la prévient.
  const { data: adhLigne } = await admin.from("adhesions").select("statut").eq("id", String(adhesionId)).maybeSingle();
  const enListeAttente = (adhLigne as { statut: string } | null)?.statut === "liste_attente";

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
      // Corps commun aux deux cas : on liste ce qui est utile, et on invite à installer
      // l'app (accès en un tap à la carte de membre et au dossier).
      const para = enListeAttente
        ? [
            `Bonjour ${prenom},`,
            `Le cours « ${coursNom} » est complet pour le moment : vous êtes inscrit(e) sur la liste d'attente.`,
            `Aucun paiement ne vous est demandé pour l'instant. Nous vous préviendrons dès qu'une place se libère.`,
            `Astuce : installez l'app du club sur votre téléphone pour être prévenu(e) et retrouver votre dossier d'un tap — ${BASE}/${slug}/installer`,
          ]
        : [
            `Bonjour ${prenom},`,
            `Votre inscription au ${org.nom} est bien enregistrée.`,
            `Cours : ${coursNom} · Cotisation : ${(montantDuCentimes / 100).toLocaleString("fr-FR")} € / an · Règlement : ${libelleMode}.`,
            `Depuis votre espace adhérent, vous suivez votre dossier, déposez vos pièces et retrouvez votre carte de membre.`,
            `Pour un accès en un tap, installez l'app du club sur votre téléphone : ${BASE}/${slug}/installer`,
            `Pensez à confirmer votre adresse email si ce n'est pas déjà fait (un email séparé vous a été envoyé).`,
          ];
      const objet = enListeAttente ? `Liste d'attente — ${org.nom}` : `Votre inscription — ${org.nom}`;
      await envoyerEmail({
        to: email,
        fromNom: `${org.nom} via Klubster`,
        replyTo: org.email_contact,
        objet,
        texte: para.join("\n\n") + `\n\nSportivement,\n${org.nom}`,
        html: gabaritEmail({
          club: org.nom,
          couleur: org.couleur_primaire,
          titre: objet,
          paragraphes: para,
          bouton: { libelle: "OUVRIR MON ESPACE", url: `${BASE}/${slug}/espace` },
        }),
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
