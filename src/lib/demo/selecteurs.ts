/**
 * Les calculs que les écrans font sur l'état.
 *
 * POURQUOI ILS VIVENT ICI, ET PAS DANS LES COMPOSANTS
 * Parce qu'ils sont testables sans navigateur. La recherche, le filtre, la pagination,
 * le décompte des destinataires, le reste dû : ce sont les endroits où une démonstration
 * peut mentir sans qu'on s'en aperçoive — un filtre qui oublie une casse, une pagination
 * qui perd la dernière page. Extraits en fonctions pures, ils se vérifient en
 * millisecondes ; laissés dans le JSX, ils demanderaient un DOM.
 *
 * Aucun import de Supabase, Stripe, Resend ou d'une Server Action.
 */

import type { EtatDemo } from "./etat";
import type { AdherentDemo, AdhesionDemo } from "./types";

// ——— Liste des adhérents ——————————————————————————————————————————————————————

/** Les cinq valeurs du filtre réel, dans l'ordre du `<select>` du produit. */
export const FILTRES_STATUT = [
  { valeur: "", libelle: "Tous les dossiers" },
  { valeur: "paye", libelle: "Payés" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "en_retard", libelle: "En retard" },
  { valeur: "liste_attente", libelle: "Liste d’attente" },
] as const;

/** 25 par page, comme `const PAR_PAGE = 25` dans `adherents/page.tsx`. */
export const PAR_PAGE = 25;

/**
 * Nettoyage de la recherche, repris du serveur : on retire tout ce qui n'est ni lettre
 * (accents compris), ni chiffre, ni `@`, point, tiret ou espace.
 */
export function nettoyerRecherche(q: string): string {
  return q.toLowerCase().replace(/[^a-zà-ÿ0-9@.\- ]/gi, "");
}

export type LigneAdherent = {
  adherent: AdherentDemo;
  adhesion: AdhesionDemo | null;
  nomCours: string | null;
};

/**
 * La liste telle que l'écran la montre : recherche sur nom, prénom et email, filtre par
 * statut d'adhésion, tri FIXE par nom croissant.
 *
 * Le tri n'est pas configurable — le produit ne le permet pas, et la démonstration ne
 * doit pas laisser croire le contraire.
 */
export function listerAdherents(
  etat: EtatDemo,
  options: { q?: string; statut?: string } = {}
): LigneAdherent[] {
  const q = nettoyerRecherche(options.q ?? "").trim();
  const statut = options.statut ?? "";
  const nomCours = new Map(etat.cours.map((c) => [c.id, c.nom]));

  return etat.adherents
    .map((adherent) => {
      // Une ligne par adhérent, portant son adhésion la plus pertinente : celle qui
      // correspond au filtre s'il y en a un, la première sinon.
      const siennes = etat.adhesions.filter((ad) => ad.adherent_id === adherent.id);
      const adhesion = statut ? siennes.find((ad) => ad.statut === statut) ?? null : siennes[0] ?? null;
      return { adherent, adhesion, nomCours: adhesion?.cours_id ? nomCours.get(adhesion.cours_id) ?? null : null };
    })
    .filter((l) => {
      if (statut && !l.adhesion) return false;
      if (!q) return true;
      const cible = `${l.adherent.prenom} ${l.adherent.nom} ${l.adherent.email ?? ""}`.toLowerCase();
      return cible.includes(q);
    })
    .sort((a, b) => a.adherent.nom.localeCompare(b.adherent.nom, "fr"));
}

export function paginer<T>(lignes: T[], page: number): { page: number; pages: number; debut: number; tranche: T[] } {
  const pages = Math.max(1, Math.ceil(lignes.length / PAR_PAGE));
  // Une page hors bornes ramène à la première : c'est ce que fait le produit quand on
  // supprime des lignes en étant sur la dernière page.
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * PAR_PAGE;
  return { page: courante, pages, debut, tranche: lignes.slice(debut, debut + PAR_PAGE) };
}

// ——— Argent ———————————————————————————————————————————————————————————————————

export function regleDe(etat: EtatDemo, adhesionId: string): number {
  return etat.reglements.filter((r) => r.adhesion_id === adhesionId).reduce((s, r) => s + r.montant_centimes, 0);
}

export function resteDe(etat: EtatDemo, adhesion: AdhesionDemo): number {
  return Math.max(adhesion.montant_centimes - regleDe(etat, adhesion.id), 0);
}

/** Chèques encaissés et pas encore déposés — la matière d'une remise. */
export function chequesARemettre(etat: EtatDemo) {
  return etat.reglements
    .filter((r) => r.mode === "cheque" && !r.remis_le && r.montant_centimes > 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/** Les lignes de l'écran Encaissements : chèques et espèces non soldés. */
export function aEncaisser(etat: EtatDemo) {
  return etat.adhesions
    .filter(
      (a) =>
        (a.statut === "en_attente" || a.statut === "en_retard") &&
        (a.mode_paiement === "cheque" || a.mode_paiement === "especes")
    )
    .map((a) => ({ adhesion: a, reste: resteDe(etat, a) }))
    .filter((l) => l.reste > 0);
}

/** Les impayés de l'écran Relances : tous modes confondus, contrairement ci-dessus. */
export function impayes(etat: EtatDemo) {
  return etat.adhesions
    .filter((a) => a.statut === "en_attente" || a.statut === "en_retard")
    .map((a) => ({ adhesion: a, reste: resteDe(etat, a) }))
    .filter((l) => l.reste > 0)
    .sort((x, y) => {
      const nx = etat.adherents.find((a) => a.id === x.adhesion.adherent_id)?.nom ?? "";
      const ny = etat.adherents.find((a) => a.id === y.adhesion.adherent_id)?.nom ?? "";
      return nx.localeCompare(ny, "fr");
    });
}

/** Total encaissé par moyen de paiement, dans l'ordre d'affichage du produit. */
export const ORDRE_MODES = ["especes", "cheque", "en_ligne", "autre", "remboursement"] as const;

export const LIBELLE_MODE: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèques",
  en_ligne: "En ligne (carte)",
  autre: "Autre (chèques vacances, aides…)",
  remboursement: "Remboursements",
};

export function totauxParMode(etat: EtatDemo): { mode: string; total: number }[] {
  const par = new Map<string, number>();
  for (const r of etat.reglements) {
    // Un montant négatif est un remboursement : il a sa propre ligne, comme dans le
    // produit, plutôt que d'être soustrait en silence du mode d'origine.
    const cle = r.montant_centimes < 0 ? "remboursement" : r.mode;
    par.set(cle, (par.get(cle) ?? 0) + r.montant_centimes);
  }
  return ORDRE_MODES.filter((m) => par.has(m)).map((m) => ({ mode: m, total: par.get(m) as number }));
}

// ——— Dossiers ————————————————————————————————————————————————————————————————

export function piecesDe(etat: EtatDemo, adherentId: string) {
  return etat.pieces.filter((p) => p.adherent_id === adherentId);
}

export function dossierIncomplet(etat: EtatDemo, adherentId: string): boolean {
  return piecesDe(etat, adherentId).some((p) => p.statut !== "recue");
}

export function adherentsIncomplets(etat: EtatDemo): AdherentDemo[] {
  return etat.adherents.filter((a) => dossierIncomplet(etat, a.id));
}

// ——— Destinataires d'une campagne ————————————————————————————————————————————

/**
 * Les groupes du composeur réel, dans l'ordre exact du `<select>`.
 *
 * « Responsables légaux des mineurs » figure bien dans la liste — c'est le libellé que
 * le produit archive. Il rendra ZÉRO destinataire pour ce club de yoga, qui n'accueille
 * aucun mineur, et l'envoi se désactivera tout seul. C'est la vérité de ce club.
 */
export function groupesDisponibles(etat: EtatDemo) {
  return [
    { valeur: "tous", libelle: "Tous les adhérents", archive: "Tous les adhérents" },
    { valeur: "parents", libelle: "Parents (adhérents mineurs)", archive: "Responsables légaux des mineurs" },
    { valeur: "incomplet", libelle: "Dossiers incomplets", archive: "Dossiers incomplets" },
    ...etat.cours.map((c) => ({ valeur: c.id, libelle: c.nom, archive: c.nom })),
  ];
}

/** Adresses du groupe, dédoublonnées — comme le `Set` du composeur réel. */
export function destinatairesDuGroupe(etat: EtatDemo, groupe: string): string[] {
  const avecEmail = etat.adherents.filter((a) => a.email);
  let choisis: AdherentDemo[];

  if (groupe === "tous") choisis = avecEmail;
  // Aucun mineur dans ce club : le groupe est vide, et c'est exact.
  else if (groupe === "parents") choisis = [];
  else if (groupe === "incomplet") choisis = avecEmail.filter((a) => dossierIncomplet(etat, a.id));
  else {
    const ids = new Set(etat.adhesions.filter((ad) => ad.cours_id === groupe).map((ad) => ad.adherent_id));
    choisis = avecEmail.filter((a) => ids.has(a.id));
  }

  return Array.from(new Set(choisis.map((a) => a.email as string)));
}

// ——— Chiffres du hub ——————————————————————————————————————————————————————————

export function chiffresDuClub(etat: EtatDemo) {
  const enAttente = etat.adhesions.filter((a) => a.statut === "en_attente").length;
  const enRetard = etat.adhesions.filter((a) => a.statut === "en_retard").length;
  const encaisse = etat.reglements.reduce((s, r) => s + r.montant_centimes, 0);
  const resteAEncaisser = etat.adhesions.reduce((s, a) => s + resteDe(etat, a), 0);
  return {
    adherents: etat.adherents.length,
    enAttente,
    enRetard,
    dossiersIncomplets: adherentsIncomplets(etat).length,
    encaisse,
    resteAEncaisser,
    chequesARemettre: chequesARemettre(etat).length,
    listeAttente: etat.adhesions.filter((a) => a.statut === "liste_attente").length,
  };
}

/** Inscrits et jauge d'un cours — c'est la jauge, et elle seule, qui ouvre l'attente. */
export function jaugeDuCours(etat: EtatDemo, coursId: string) {
  const inscrits = etat.adhesions.filter((a) => a.cours_id === coursId && a.statut !== "liste_attente").length;
  const attente = etat.adhesions.filter((a) => a.cours_id === coursId && a.statut === "liste_attente").length;
  const cours = etat.cours.find((c) => c.id === coursId);
  return { inscrits, attente, places: cours?.places_max ?? null };
}
