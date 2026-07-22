import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";
import { gabaritEmail } from "@/lib/email-gabarit";
import { lireEmailsConfig } from "@/lib/emails-config";
import { compteConnecte } from "@/lib/stripe-org";
import type { Organisation } from "@/types/db";

export const dynamic = "force-dynamic";
export const preferredRegion = "cdg1"; // RGPD — exécution en Europe

/**
 * Tâche planifiée quotidienne (Vercel Cron) qui envoie les relances automatiques :
 * pièces manquantes (30/60/90 jours) et cotisations impayées (7/21/45 jours).
 *
 * Deux garde-fous contre le harcèlement, portés par la table `emails_journal` :
 *   — un motif donné n'est jamais renvoyé deux fois à la même personne (index unique) ;
 *   — au plus UN email de relance par adhérent tous les 7 jours, tous motifs confondus.
 *
 * Chaque relance obéit à une FENÊTRE (ex. 30–44 jours) plutôt qu'à un seuil : si le cron
 * saute un jour, l'email part quand même ; et un adhérent inscrit depuis 300 jours au
 * lancement n'est pas rattrapé par une salve de rappels tardifs.
 */

const UN_JOUR = 24 * 60 * 60 * 1000;
const PLAFOND_JOURS = 7;

// Fenêtres [min, max] en jours depuis l'inscription.
const FENETRE_PIECES = { pieces_30: [30, 44], pieces_60: [60, 74], pieces_90: [90, 104] } as const;
const FENETRE_IMPAYE = { impaye_1: [7, 13], impaye_2: [21, 27], impaye_3: [45, 51] } as const;

function ageJours(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / UN_JOUR);
}
function dansFenetre(age: number, [min, max]: readonly [number, number]): boolean {
  return age >= min && age <= max;
}

export async function POST(request: NextRequest) {
  return lancer(request);
}
export async function GET(request: NextRequest) {
  // Vercel Cron appelle en GET. On accepte les deux, mais toujours derrière le secret.
  return lancer(request);
}

async function lancer(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const fourni = request.headers.get("authorization");
  // Sans secret configuré, on refuse : une relance déclenchable par n'importe qui serait
  // un vecteur d'envoi d'emails en masse.
  if (!secret || fourni !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  if (!admin) return NextResponse.json({ error: "Base indisponible." }, { status: 500 });

  const { data: orgsData } = await admin
    .from("organisations")
    .select("id, nom, slug, couleur_primaire, email_contact, form_config, emails_config, stripe_account_id, stripe_test, abonnement_statut")
    .eq("publie", true);
  const orgs = (orgsData ?? []) as unknown as Organisation[];
  if (orgs.length === 0) return NextResponse.json({ ok: true, envoyes: 0 });

  // Journal des 60 derniers jours : pour le plafond (7 j) et la déduplication par motif.
  const depuis = new Date(Date.now() - 60 * UN_JOUR).toISOString();
  const { data: journalData } = await admin
    .from("emails_journal")
    .select("adherent_id, motif, envoye_le")
    .gte("envoye_le", depuis);
  const journal = journalData ?? [];
  const motifsEnvoyes = new Set(journal.map((j) => `${j.adherent_id}:${j.motif}`));
  const dernierEnvoi = new Map<string, string>();
  for (const j of journal) {
    if (!j.adherent_id) continue;
    const prec = dernierEnvoi.get(j.adherent_id);
    if (!prec || j.envoye_le > prec) dernierEnvoi.set(j.adherent_id, j.envoye_le);
  }
  const souslePlafond = (adherentId: string) => {
    const dernier = dernierEnvoi.get(adherentId);
    if (!dernier) return true;
    return Date.now() - new Date(dernier).getTime() >= PLAFOND_JOURS * UN_JOUR;
  };

  // Adhésions en cours avec l'adhérent et les règlements — une seule lecture globale.
  const { data: adhData } = await admin
    .from("adhesions")
    .select("id, organisation_id, adherent_id, montant_centimes, statut, created_at, cours(nom), adherents(prenom, email), reglements(montant_centimes)");
  const adhesions = (adhData ?? []) as unknown as AdhesionLigne[];

  // Pièces obligatoires encore manquantes, indexées par adhérent.
  const { data: piecesData } = await admin
    .from("pieces_adherent")
    .select("adherent_id, cle, statut")
    .eq("statut", "manquante");
  const piecesManquantes = new Map<string, Set<string>>();
  for (const p of piecesData ?? []) {
    if (!p.adherent_id) continue;
    const s = piecesManquantes.get(p.adherent_id) ?? new Set<string>();
    s.add(p.cle as string);
    piecesManquantes.set(p.adherent_id, s);
  }

  const orgsPar = new Map(orgs.map((o) => [o.id, o]));
  // Clés des pièces OBLIGATOIRES par club (depuis form_config).
  const clesObligatoires = new Map<string, Set<string>>();
  for (const o of orgs) {
    const cles = new Set<string>();
    for (const p of o.form_config?.pieces ?? []) {
      if (p.obligatoire) cles.add(p.id);
    }
    clesObligatoires.set(o.id, cles);
  }

  type Envoi = { adherentId: string; motif: string; orgId: string; to: string; objet: string; para: string[]; club: Organisation };
  const aEnvoyer: Envoi[] = [];
  // Un seul envoi par adhérent et par exécution (le plafond fait le reste sur la durée).
  const dejaCeTour = new Set<string>();

  for (const adh of adhesions) {
    const org = orgsPar.get(adh.organisation_id ?? "");
    if (!org) continue;
    const adherentId = adh.adherent_id;
    if (!adherentId || dejaCeTour.has(adherentId)) continue;
    const email = adh.adherents?.email ?? null;
    if (!email) continue;
    if (!souslePlafond(adherentId)) continue;
    const cfg = lireEmailsConfig(org.emails_config);
    const age = ageJours(adh.created_at);
    const prenom = adh.adherents?.prenom ?? "";
    const coursNom = adh.cours?.nom ?? null;

    // 1) Pièces obligatoires manquantes.
    const oblig = clesObligatoires.get(org.id) ?? new Set<string>();
    const manquantes = piecesManquantes.get(adherentId) ?? new Set<string>();
    const aUneManquante = [...manquantes].some((c) => oblig.has(c));
    if (aUneManquante) {
      const etapes: [keyof typeof FENETRE_PIECES, boolean][] = [
        ["pieces_30", cfg.relance_pieces_30],
        ["pieces_60", cfg.relance_pieces_60],
        ["pieces_90", cfg.relance_pieces_90],
      ];
      let poussé = false;
      for (const [motif, actif] of etapes) {
        if (poussé) break;
        if (!actif) continue;
        if (motifsEnvoyes.has(`${adherentId}:${motif}`)) continue;
        if (!dansFenetre(age, FENETRE_PIECES[motif])) continue;
        aEnvoyer.push({
          adherentId, motif, orgId: org.id, to: email, club: org,
          objet: `Votre dossier au ${org.nom} — une pièce manque`,
          para: [
            `Bonjour ${prenom},`,
            `Votre inscription au ${org.nom} est bien enregistrée, mais il manque encore une pièce obligatoire à votre dossier${coursNom ? ` (${coursNom})` : ""}.`,
            `Vous pouvez la déposer en quelques secondes depuis votre espace adhérent. Si c'est déjà fait, ne tenez pas compte de ce message.`,
          ],
        });
        dejaCeTour.add(adherentId);
        poussé = true;
      }
      if (poussé) continue;
    }

    // 2) Cotisation impayée.
    if (cfg.relance_impaye && (adh.statut === "en_attente" || adh.statut === "en_retard")) {
      const regle = (adh.reglements ?? []).reduce((s, r) => s + (r.montant_centimes ?? 0), 0);
      const reste = (adh.montant_centimes ?? 0) - regle;
      if (reste > 0) {
        const etapes: [keyof typeof FENETRE_IMPAYE, readonly [number, number]][] = [
          ["impaye_1", FENETRE_IMPAYE.impaye_1],
          ["impaye_2", FENETRE_IMPAYE.impaye_2],
          ["impaye_3", FENETRE_IMPAYE.impaye_3],
        ];
        for (const [motif, fenetre] of etapes) {
          if (motifsEnvoyes.has(`${adherentId}:${motif}`)) continue;
          if (!dansFenetre(age, fenetre)) continue;
          const montant = (reste / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });
          const enLigne = !!compteConnecte(org);
          aEnvoyer.push({
            adherentId, motif, orgId: org.id, to: email, club: org,
            objet: `Cotisation ${org.nom} — il reste ${montant} € à régler`,
            para: [
              `Bonjour ${prenom},`,
              `Votre adhésion au ${org.nom}${coursNom ? ` (${coursNom})` : ""} n'est pas encore soldée : il reste ${montant} € à régler.`,
              enLigne
                ? `Vous pouvez régler en ligne depuis votre espace adhérent, ou directement auprès du club. Si c'est déjà fait, merci de ne pas tenir compte de ce message.`
                : `Vous pouvez régulariser directement auprès du club. Si c'est déjà fait, merci de ne pas tenir compte de ce message.`,
            ],
          });
          dejaCeTour.add(adherentId);
          break;
        }
      }
    }
  }

  // Envois + journalisation.
  let envoyes = 0;
  for (const e of aEnvoyer) {
    const html = gabaritEmail({
      club: e.club.nom,
      couleur: e.club.couleur_primaire,
      titre: e.objet,
      paragraphes: e.para,
      bouton: { libelle: "OUVRIR MON ESPACE", url: `https://klubster.fr/${e.club.slug}/espace` },
    });
    const ok = await envoyerEmail({
      to: e.to,
      fromNom: e.club.nom,
      replyTo: e.club.email_contact,
      objet: e.objet,
      texte: e.para.join("\n\n") + `\n\nVotre espace : https://klubster.fr/${e.club.slug}/espace`,
      html,
    });
    if (ok) {
      envoyes++;
      await admin.from("emails_journal").insert({
        organisation_id: e.orgId,
        adherent_id: e.adherentId,
        destinataire: e.to,
        motif: e.motif,
      });
    }
  }

  return NextResponse.json({ ok: true, candidats: aEnvoyer.length, envoyes });
}

type AdhesionLigne = {
  id: string;
  organisation_id: string | null;
  adherent_id: string | null;
  montant_centimes: number | null;
  statut: string | null;
  created_at: string;
  cours: { nom: string } | null;
  adherents: { prenom: string | null; email: string | null } | null;
  reglements: Array<{ montant_centimes: number }> | null;
};
