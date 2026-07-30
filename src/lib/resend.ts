// Envoi d'emails via l'API Resend (REST, sans SDK) — messagerie des clubs.
// Expéditeur : clubs@klubster.fr (domaine vérifié), reply-to = l'email du club.
const API = "https://api.resend.com";
const KEY = process.env.RESEND_API_KEY;

export function resendConfigured(): boolean {
  return !!KEY;
}

export interface EnvoiResultat {
  ok: boolean;
  envoyes: number;
  erreur?: string;
}

// Email transactionnel simple (confirmation d'inscription, notification club, bienvenue…).
// Le HTML est optionnel : quand il est fourni, le texte reste envoyé en parallèle, pour
// les clients qui n'affichent pas le HTML et pour la délivrabilité.
/** Fichier joint à un email : Resend va le chercher lui-même à l'URL indiquée. */
export interface PieceJointe {
  nom: string;
  url: string;
}

export async function envoyerEmail(opts: {
  to: string;
  objet: string;
  texte: string;
  html?: string;
  fromNom?: string; // ex. le nom du club — défaut : Klubster
  replyTo?: string | null;
  /** Modèles à faire parvenir à l'adhérent (certificat médical vierge, etc.). */
  piecesJointes?: PieceJointe[];
}): Promise<boolean> {
  if (!KEY) return false;
  const from = `${(opts.fromNom ?? "Klubster").replace(/["<>]/g, "").slice(0, 60)} <inscriptions@klubster.fr>`;
  // Resend accepte `path` : il télécharge le fichier lui-même, on n'a pas à le
  // charger en mémoire côté serveur ni à l'encoder en base64. Les modèles vivent
  // dans un bucket public, l'URL suffit. Plafonné à 5 fichiers : au-delà, l'email
  // devient lourd et la délivrabilité se dégrade.
  const jointes = (opts.piecesJointes ?? [])
    .filter((p) => p.url)
    .slice(0, 5)
    .map((p) => ({ filename: p.nom.replace(/[\r\n"]/g, "").slice(0, 120) || "document", path: p.url }));
  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.objet,
        text: opts.texte,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
        ...(jointes.length ? { attachments: jointes } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Variante de `envoyerEmail` qui remonte l'identifiant de message du fournisseur (Resend)
// en plus du succès — utile à l'outbox, qui le mémorise dans `provider_message_id`.
export async function envoyerEmailDetaille(opts: {
  to: string;
  objet: string;
  texte: string;
  html?: string;
  fromNom?: string;
  replyTo?: string | null;
}): Promise<{ ok: boolean; id: string | null; erreur?: string }> {
  if (!KEY) return { ok: false, id: null, erreur: "RESEND_API_KEY manquante" };
  const from = `${(opts.fromNom ?? "Klubster").replace(/["<>]/g, "").slice(0, 60)} <inscriptions@klubster.fr>`;
  try {
    const res = await fetch(`${API}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.objet,
        text: opts.texte,
        ...(opts.html ? { html: opts.html } : {}),
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string } | null;
      return { ok: false, id: null, erreur: detail?.message ?? `Erreur Resend (${res.status})` };
    }
    const json = (await res.json().catch(() => null)) as { id?: string } | null;
    return { ok: true, id: json?.id ?? null };
  } catch (e) {
    return { ok: false, id: null, erreur: e instanceof Error ? e.message : String(e) };
  }
}

// Envoie un message DIFFÉRENT à chaque destinataire (relances : chacun voit son propre
// montant restant). Un email individuel par personne ; batch de 100 max par appel Resend.
export async function envoyerLotPersonnalise(opts: {
  nomClub: string;
  replyTo: string | null;
  messages: Array<{ to: string; objet: string; texte: string }>;
}): Promise<EnvoiResultat> {
  if (!KEY) return { ok: false, envoyes: 0, erreur: "Envoi non configuré (RESEND_API_KEY manquante)." };

  const from = `${opts.nomClub.replace(/["<>]/g, "").slice(0, 60)} via Klubster <clubs@klubster.fr>`;
  const pied = `\n\n—\n${opts.nomClub} · envoyé avec Klubster (klubster.fr)`;
  let envoyes = 0;

  for (let i = 0; i < opts.messages.length; i += 100) {
    const lot = opts.messages.slice(i, i + 100).map((m) => ({
      from,
      to: [m.to],
      subject: m.objet,
      text: m.texte + pied,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }));

    const res = await fetch(`${API}/emails/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(lot),
    });

    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string } | null;
      const msg =
        res.status === 429
          ? "Limite d'envoi atteinte (plan gratuit : 100 emails/jour). Réessayez demain."
          : detail?.message ?? `Erreur d'envoi (${res.status}).`;
      return { ok: envoyes > 0, envoyes, erreur: msg };
    }
    envoyes += lot.length;
  }

  return { ok: true, envoyes };
}

/**
 * Envoi d'un lot de campagne, avec récupération des identifiants Resend.
 *
 * DIFFÉRENCE AVEC `envoyerAuxAdherents` : celle-ci LIT la réponse. L'ancienne comptait
 * `lot.length` dès que la requête était acceptée et jetait le corps — il était donc
 * impossible de rattacher le moindre événement de webhook à un destinataire.
 *
 * `Idempotency-Key` : indispensable. Sans elle, un délai d'attente côté Klubster suivi
 * d'un nouvel essai renverrait le lot entier une seconde fois — 100 adhérents recevant
 * deux fois le même message. Resend reconnaît la clé et ne réexécute pas.
 *
 * Les étiquettes (`tags`) permettent de retrouver un envoi depuis le tableau de bord
 * Resend sans passer par nos tables, ce qui compte le jour où l'on diagnostique une
 * plainte pour spam.
 */
export interface LotCampagne {
  destinataireId: string;
  to: string;
}

export interface ResultatLot {
  ok: boolean;
  /** id de destinataire → identifiant Resend, dans l'ordre renvoyé par l'API. */
  identifiants: Map<string, string>;
  erreur?: string;
  /** Vrai quand le refus vient d'un quota : l'appelant doit s'arrêter, pas réessayer. */
  quotaAtteint?: boolean;
}

export async function envoyerLotCampagne(opts: {
  nomClub: string;
  replyTo: string | null;
  objet: string;
  texte: string;
  lot: LotCampagne[];
  campaignId: string;
  organisationId: string;
  numeroLot: number;
}): Promise<ResultatLot> {
  const identifiants = new Map<string, string>();
  if (!KEY) return { ok: false, identifiants, erreur: "Envoi non configuré (RESEND_API_KEY manquante)." };

  const from = `${opts.nomClub.replace(/["<>]/g, "").slice(0, 60)} via Klubster <clubs@klubster.fr>`;
  const pied = `\n\n—\n${opts.nomClub} · envoyé avec Klubster (klubster.fr)`;

  const corps = opts.lot.map((d) => ({
    from,
    to: [d.to],
    subject: opts.objet,
    text: opts.texte + pied,
    ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    tags: [
      { name: "category", value: "club_message" },
      { name: "campaign_id", value: opts.campaignId },
      { name: "recipient_id", value: d.destinataireId },
      { name: "organisation_id", value: opts.organisationId },
    ],
  }));

  let res: Response;
  try {
    res = await fetch(`${API}/emails/batch`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${KEY}`,
        "Content-Type": "application/json",
        // Propre au lot : rejouer le lot 3 ne renvoie pas les lots 1 et 2.
        "Idempotency-Key": `message-campaign/${opts.campaignId}/batch/${opts.numeroLot}`,
      },
      body: JSON.stringify(corps),
    });
  } catch {
    // Réseau injoignable : on ne sait PAS si Resend a reçu la requête. L'appelant doit
    // marquer le lot en échec sans le réessayer — la clé d'idempotence protégerait un
    // nouvel essai, mais rien ne presse et un doute vaut mieux qu'un doublon.
    return { ok: false, identifiants, erreur: "Service d’envoi injoignable." };
  }

  if (!res.ok) {
    const detail = (await res.json().catch(() => null)) as { message?: string } | null;
    const quota = res.status === 429;
    return {
      ok: false,
      identifiants,
      quotaAtteint: quota,
      erreur: quota
        ? "Limite d’envoi du compte atteinte."
        : detail?.message ?? `Erreur d’envoi (${res.status}).`,
    };
  }

  // Resend renvoie `{ data: [{ id }, …] }`, dans l'ordre des emails soumis.
  const json = (await res.json().catch(() => null)) as { data?: Array<{ id?: string }> } | null;
  const lignes = json?.data ?? [];
  lignes.forEach((l, i) => {
    const cible = opts.lot[i];
    if (cible && l?.id) identifiants.set(cible.destinataireId, l.id);
  });

  return { ok: true, identifiants };
}

// Envoie le même message à chaque destinataire (un email individuel par adhérent,
// personne ne voit les autres). Batch API : 100 emails max par appel.
export async function envoyerAuxAdherents(opts: {
  nomClub: string;
  replyTo: string | null;
  destinataires: string[];
  objet: string;
  texte: string;
}): Promise<EnvoiResultat> {
  if (!KEY) return { ok: false, envoyes: 0, erreur: "Envoi non configuré (RESEND_API_KEY manquante)." };

  const from = `${opts.nomClub.replace(/["<>]/g, "").slice(0, 60)} via Klubster <clubs@klubster.fr>`;
  const pied = `\n\n—\n${opts.nomClub} · envoyé avec Klubster (klubster.fr)`;
  let envoyes = 0;

  for (let i = 0; i < opts.destinataires.length; i += 100) {
    const lot = opts.destinataires.slice(i, i + 100).map((email) => ({
      from,
      to: [email],
      subject: opts.objet,
      text: opts.texte + pied,
      ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
    }));

    const res = await fetch(`${API}/emails/batch`, {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(lot),
    });

    if (!res.ok) {
      const detail = (await res.json().catch(() => null)) as { message?: string } | null;
      const msg =
        res.status === 429
          ? "Limite d'envoi atteinte (plan gratuit : 100 emails/jour). Réessayez demain ou utilisez « Ouvrir mon email »."
          : detail?.message ?? `Erreur d'envoi (${res.status}).`;
      return { ok: envoyes > 0, envoyes, erreur: msg };
    }
    envoyes += lot.length;
  }

  return { ok: true, envoyes };
}
