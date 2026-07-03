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
export async function envoyerEmail(opts: {
  to: string;
  objet: string;
  texte: string;
  fromNom?: string; // ex. le nom du club — défaut : Klubster
  replyTo?: string | null;
}): Promise<boolean> {
  if (!KEY) return false;
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
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
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
