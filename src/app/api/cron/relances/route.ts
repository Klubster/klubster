import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { envoyerEmail } from "@/lib/resend";
import { gabaritEmail } from "@/lib/email-gabarit";
import { lireEmailsConfig } from "@/lib/emails-config";
import { compteConnecte, accesClub } from "@/lib/stripe-org";
import { saisonCourante } from "@/lib/saison";
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

  const { data: orgsData, error: orgsErr } = await admin
    .from("organisations")
    .select("id, nom, slug, couleur_primaire, email_contact, form_config, emails_config, stripe_account_id, stripe_test, abonnement_statut, abonnement_essai_fin, abonnement_periode_fin, saison_debut, saison_fin")
    .eq("publie", true);
  // Une lecture ratée ne doit JAMAIS être traitée comme « aucune donnée » : on abandonne,
  // faute de quoi le plafond et la déduplication seraient calculés sur un journal vide et
  // des relances pourraient repartir à tort.
  if (orgsErr) return NextResponse.json({ error: "Lecture organisations." }, { status: 500 });
  const orgs = (orgsData ?? []) as unknown as Organisation[];
  if (orgs.length === 0) return NextResponse.json({ ok: true, envoyes: 0 });

  // Journal des 60 derniers jours : pour le plafond (7 j) et la déduplication par motif.
  const depuis = new Date(Date.now() - 60 * UN_JOUR).toISOString();
  const { data: journalData, error: journalErr } = await admin
    .from("emails_journal")
    .select("organisation_id, adherent_id, motif, envoye_le")
    .gte("envoye_le", depuis);
  if (journalErr) return NextResponse.json({ error: "Lecture journal." }, { status: 500 });
  const journal = journalData ?? [];
  // Motifs de club (sans adhérent) déjà envoyés récemment — pour le récap et la fin d'essai.
  const motifOrgRecent = (orgId: string, motif: string, jours: number) =>
    journal.some(
      (j) => j.organisation_id === orgId && j.motif === motif && !j.adherent_id &&
        Date.now() - new Date(j.envoye_le).getTime() < jours * UN_JOUR
    );
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

  // Adhésions à considérer : uniquement les statuts ACTIFS. On exclut ainsi la liste
  // d'attente, les adhésions annulées et remboursées — personne dans ces états ne doit
  // recevoir « votre inscription est enregistrée, une pièce manque » ni une relance
  // d'impayé. Le tri par saison courante du club se fait ensuite, adhésion par adhésion.
  const { data: adhData, error: adhErr } = await admin
    .from("adhesions")
    .select("id, organisation_id, adherent_id, montant_centimes, statut, saison, created_at, cours(nom), adherents(prenom, email), reglements(montant_centimes)")
    .in("statut", ["en_attente", "en_retard", "paye"]);
  if (adhErr) return NextResponse.json({ error: "Lecture adhésions." }, { status: 500 });
  const adhesions = (adhData ?? []) as unknown as AdhesionLigne[];

  // Pièces obligatoires encore manquantes, indexées par adhérent.
  const { data: piecesData, error: piecesErr } = await admin
    .from("pieces_adherent")
    .select("adherent_id, cle, statut")
    .eq("statut", "manquante");
  if (piecesErr) return NextResponse.json({ error: "Lecture pièces." }, { status: 500 });
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
    // Un club dont l'abonnement est suspendu (résilié / impayé au-delà de la grâce) ne
    // relance plus ses adhérents : ses automatisations sont coupées comme ses nouvelles
    // inscriptions. Seul le club lui-même reste joignable (récap, régularisation).
    if (accesClub(org) === "suspendu") continue;
    // Seule la saison COURANTE du club compte : on ne relance pas sur une vieille adhésion.
    if ((adh.saison ?? "") !== saisonCourante(org)) continue;
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

  // ——— Emails de CLUB (pas de plafond par adhérent ; dédup par motif d'org) ———
  type EnvoiClub = { orgId: string; motif: string; to: string; objet: string; para: string[]; club: Organisation };
  const aEnvoyerClub: EnvoiClub[] = [];

  // Récap hebdomadaire : le lundi seulement, au plus un par semaine, et seulement s'il y a
  // quelque chose à signaler (sinon on n'envoie rien — pas de bruit).
  const estLundi = new Date().getUTCDay() === 1;
  const il7j = Date.now() - 7 * UN_JOUR;
  // Adhésions regroupées par club, pour les agrégats du récap.
  const adhParOrg = new Map<string, AdhesionLigne[]>();
  for (const a of adhesions) {
    if (!a.organisation_id) continue;
    const arr = adhParOrg.get(a.organisation_id) ?? [];
    arr.push(a);
    adhParOrg.set(a.organisation_id, arr);
  }

  for (const org of orgs) {
    const cfg = lireEmailsConfig(org.emails_config);
    const contact = org.email_contact;
    if (!contact) continue;

    // 1) Récap hebdomadaire.
    if (estLundi && cfg.recap_hebdo && !motifOrgRecent(org.id, "recap_hebdo", 6)) {
      const liste = adhParOrg.get(org.id) ?? [];
      const nouvelles = liste.filter((a) => new Date(a.created_at).getTime() >= il7j).length;
      const oblig = clesObligatoires.get(org.id) ?? new Set<string>();
      let impayes = 0;
      let dossiers = 0;
      for (const a of liste) {
        if (!a.adherent_id) continue;
        const regle = (a.reglements ?? []).reduce((s, r) => s + (r.montant_centimes ?? 0), 0);
        const reste = (a.montant_centimes ?? 0) - regle;
        if ((a.statut === "en_attente" || a.statut === "en_retard") && reste > 0) impayes++;
        const manq = piecesManquantes.get(a.adherent_id);
        if (manq && [...manq].some((c) => oblig.has(c))) dossiers++;
      }
      // Rien à signaler : on n'envoie pas.
      if (nouvelles > 0 || impayes > 0 || dossiers > 0) {
        const lignes: string[] = [];
        if (nouvelles > 0) lignes.push(`${nouvelles} nouvelle${nouvelles > 1 ? "s" : ""} inscription${nouvelles > 1 ? "s" : ""} cette semaine.`);
        if (impayes > 0) lignes.push(`${impayes} cotisation${impayes > 1 ? "s" : ""} encore à régler.`);
        if (dossiers > 0) lignes.push(`${dossiers} dossier${dossiers > 1 ? "s" : ""} avec une pièce manquante.`);
        aEnvoyerClub.push({
          orgId: org.id, motif: "recap_hebdo", to: contact, club: org,
          objet: `Votre semaine au ${org.nom}`,
          para: [
            `Bonjour,`,
            `Voici le point de la semaine pour ${org.nom} :`,
            lignes.join("\n"),
            `Tout se gère depuis votre cockpit. Bon début de semaine.`,
          ],
        });
      }
    }

    // 2) Fin d'essai approche (J-5) — ton Klubster, en complément des emails Stripe.
    if (org.abonnement_statut === "essai" && org.abonnement_essai_fin && !motifOrgRecent(org.id, "fin_essai", 20)) {
      const restJours = Math.ceil((new Date(org.abonnement_essai_fin).getTime() - Date.now()) / UN_JOUR);
      if (restJours >= 3 && restJours <= 6) {
        aEnvoyerClub.push({
          orgId: org.id, motif: "fin_essai", to: contact, club: org,
          objet: `Votre mois offert se termine dans ${restJours} jours`,
          para: [
            `Bonjour,`,
            `Le mois offert de ${org.nom} sur Klubster se termine dans ${restJours} jours.`,
            `Pour continuer sans interruption, enregistrez un moyen de paiement depuis votre cockpit (rubrique abonnement). Aucun engagement : vous pouvez changer d'offre ou arrêter à tout moment.`,
            `Rien à faire si vous ne souhaitez pas poursuivre : votre compte et vos données restent accessibles en lecture.`,
          ],
        });
      }
    }
  }

  // Envois. On RÉSERVE dans le journal AVANT d'appeler Resend, pas après : l'insertion,
  // protégée par l'index unique (adherent_id, motif), désigne un seul gagnant si deux
  // exécutions se chevauchent — l'autre reçoit une violation d'unicité et n'envoie rien.
  // Si l'envoi échoue ensuite, on relâche la réservation pour réessayer au prochain tour.
  let envoyes = 0;
  for (const e of aEnvoyer) {
    // 1) Réservation atomique.
    const { error: claimErr } = await admin.from("emails_journal").insert({
      organisation_id: e.orgId,
      adherent_id: e.adherentId,
      destinataire: e.to,
      motif: e.motif,
    });
    if (claimErr) {
      // 23505 = déjà réservé/envoyé par un autre passage : on passe, sans double envoi.
      if (claimErr.code === "23505") continue;
      // Toute autre erreur DB : on abandonne le cron plutôt que d'envoyer sans trace.
      return NextResponse.json({ error: "Réservation email.", envoyes }, { status: 500 });
    }
    // 2) Envoi.
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
    // 3) Échec d'envoi : on libère la réservation pour un prochain essai.
    if (ok) envoyes++;
    else await admin.from("emails_journal").delete().eq("adherent_id", e.adherentId).eq("motif", e.motif);
  }

  // Emails de club (récap hebdo, fin d'essai) : bouton vers le cockpit, journal sans
  // adhérent. On réserve d'abord (marqueur en base), on envoie ensuite, et on relâche si
  // l'envoi échoue — pour ne pas re-tenter le lendemain un email déjà parti.
  for (const e of aEnvoyerClub) {
    const { error: claimErr } = await admin.from("emails_journal").insert({
      organisation_id: e.orgId,
      adherent_id: null,
      destinataire: e.to,
      motif: e.motif,
    });
    if (claimErr) return NextResponse.json({ error: "Réservation email club.", envoyes }, { status: 500 });
    const html = gabaritEmail({
      club: e.club.nom,
      couleur: e.club.couleur_primaire,
      titre: e.objet,
      paragraphes: e.para,
      bouton: { libelle: "OUVRIR LE COCKPIT", url: `https://klubster.fr/${e.club.slug}/cockpit` },
    });
    const ok = await envoyerEmail({
      to: e.to,
      fromNom: "Klubster",
      objet: e.objet,
      texte: e.para.join("\n\n") + `\n\nVotre cockpit : https://klubster.fr/${e.club.slug}/cockpit`,
      html,
    });
    if (ok) envoyes++;
    else await admin.from("emails_journal").delete().eq("organisation_id", e.orgId).is("adherent_id", null).eq("motif", e.motif);
  }

  return NextResponse.json({ ok: true, candidats: aEnvoyer.length + aEnvoyerClub.length, envoyes });
}

type AdhesionLigne = {
  id: string;
  organisation_id: string | null;
  adherent_id: string | null;
  montant_centimes: number | null;
  statut: string | null;
  saison: string | null;
  created_at: string;
  cours: { nom: string } | null;
  adherents: { prenom: string | null; email: string | null } | null;
  reglements: Array<{ montant_centimes: number }> | null;
};
