/**
 * Ciblage des messages — LA source unique.
 *
 * Avant ce module, la page (compteur affiché) et l'action d'envoi appliquaient
 * chacune leur copie des règles. Elles étaient alignées à la main — c'est-à-dire
 * jusqu'à la prochaine retouche. Désormais une seule fonction décide qui reçoit :
 * le compteur, l'aperçu et l'envoi la consomment tous les trois. Un écart entre
 * « annoncé » et « envoyé » redevient structurellement impossible.
 *
 * RÈGLES PRODUIT (04/08/2026) :
 *  - le périmètre est LA SAISON COURANTE : un adhérent dont la seule adhésion est
 *    annulée, remboursée ou d'une saison passée ne reçoit rien (« exclure les
 *    anciennes saisons sauf choix explicite » — le choix explicite n'existe pas
 *    encore, il viendra comme option assumée) ; la liste d'attente REÇOIT (elle
 *    attend une place, pas du silence) ;
 *  - « parents » écrit AU REPRÉSENTANT LÉGAL (`infos["Responsable légal — email"]`),
 *    repli sur l'email du compte ; un mineur sans adresse personnelle reste
 *    joignable par son parent ;
 *  - « dossiers incomplets » = au moins une pièce OBLIGATOIRE manquante (instantané
 *    `pieces_adherent.obligatoire`) ;
 *  - déduplication par adresse normalisée (minuscules, espaces retirés) : deux
 *    enfants d'un même parent, ou une boîte familiale partagée, font UN destinataire.
 *
 * Module PUR (aucune requête) : les données entrent, la liste sort — testable à la
 * ligne près.
 */

export interface AdherentCiblage {
  id: string;
  email: string | null;
  date_naissance: string | null;
  infos: Record<string, string> | null;
}

export interface AdhesionCiblage {
  adherent_id: string;
  cours_id: string | null;
  saison: string | null;
  statut: string | null;
}

export interface DonneesCiblage {
  adherents: AdherentCiblage[];
  adhesions: AdhesionCiblage[];
  /** ids d'adhérents ayant ≥ 1 pièce OBLIGATOIRE manquante (déjà filtré en base). */
  incompletIds: Set<string>;
  saisonCourante: string;
}

export interface Destinataire {
  adherentId: string;
  email: string;
}

/** Statuts d'adhésion qui laissent l'adhérent dans le périmètre des messages. */
const STATUTS_JOIGNABLES = new Set(["en_attente", "paye", "en_retard", "liste_attente"]);

const CLE_EMAIL_RESPONSABLE = "Responsable légal — email";

function estMineur(dateNaissance: string | null): boolean {
  if (!dateNaissance) return false;
  const n = new Date(dateNaissance);
  if (Number.isNaN(n.getTime())) return false;
  const seuil = new Date();
  seuil.setFullYear(seuil.getFullYear() - 18);
  return n > seuil;
}

function normaliser(email: string | null | undefined): string {
  return (email ?? "").trim().toLowerCase();
}

/**
 * Résout les destinataires d'un groupe.
 * `groupe` : "tous" | "parents" | "incomplet" | <id de cours>.
 */
export function resoudreDestinataires(donnees: DonneesCiblage, groupe: string): Destinataire[] {
  // Périmètre : adhérents avec une adhésion de la saison courante encore vivante.
  const joignables = new Map<string, Set<string>>(); // adherent_id -> cours de la saison
  for (const ad of donnees.adhesions) {
    if (ad.saison !== donnees.saisonCourante) continue;
    if (!STATUTS_JOIGNABLES.has(ad.statut ?? "")) continue;
    const s = joignables.get(ad.adherent_id) ?? new Set<string>();
    if (ad.cours_id) s.add(ad.cours_id);
    joignables.set(ad.adherent_id, s);
  }

  let cibles = donnees.adherents.filter((a) => joignables.has(a.id));

  let resoudreEmail = (a: AdherentCiblage): string | null => a.email;

  if (groupe === "parents") {
    cibles = cibles.filter((a) => estMineur(a.date_naissance));
    resoudreEmail = (a) => a.infos?.[CLE_EMAIL_RESPONSABLE] || a.email;
  } else if (groupe === "incomplet") {
    cibles = cibles.filter((a) => donnees.incompletIds.has(a.id));
  } else if (groupe !== "tous") {
    cibles = cibles.filter((a) => joignables.get(a.id)?.has(groupe));
  }

  const parEmail = new Map<string, Destinataire>();
  for (const a of cibles) {
    const email = normaliser(resoudreEmail(a));
    if (!email || parEmail.has(email)) continue;
    parEmail.set(email, { adherentId: a.id, email });
  }
  return Array.from(parEmail.values());
}
