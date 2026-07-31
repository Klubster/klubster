/**
 * Les formes de données de la démonstration.
 *
 * Elles copient les tables réelles — mêmes noms de colonnes, mêmes unités (centimes),
 * mêmes valeurs de statut. Ce n'est pas de la coquetterie : c'est ce qui garantit qu'un
 * écran simulé calcule comme le vrai. Un « reste dû » calculé sur des euros arrondis
 * dans la démonstration et sur des centimes en production finit toujours par diverger
 * d'un centime devant un visiteur.
 *
 * RÈGLE DU DOSSIER `src/lib/demo/` : aucun import de Supabase, de Stripe, de Resend,
 * d'une Server Action ou d'un client Storage. La garantie du mode simulation est
 * STRUCTURELLE — s'il n'existe rien à appeler, il n'y a rien à contourner.
 */

// ——— Cours ————————————————————————————————————————————————————————————————————

export type Creneau = { jour: string; debut: string; fin: string; note: string };

export type CoursDemo = {
  id: string;
  nom: string;
  public_cible: string | null;
  tarif_centimes: number;
  /** `null` = illimité. C'est lui, et rien d'autre, qui déclenche la liste d'attente. */
  places_max: number | null;
  creneaux: Creneau[];
};

// ——— Adhérents, adhésions, règlements ——————————————————————————————————————————

export type AdherentDemo = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  created_at: string;
  /** Réponses libres du formulaire d'inscription, clés brutes comme dans le produit. */
  infos: Record<string, string>;
  /** Anonymisé par le parcours RGPD simulé. */
  anonymise?: boolean;
};

export type StatutAdhesion = "paye" | "en_attente" | "en_retard" | "liste_attente";

export type AdhesionDemo = {
  id: string;
  adherent_id: string;
  cours_id: string | null;
  saison: string;
  statut: StatutAdhesion;
  montant_centimes: number;
  mode_paiement: string | null;
  /**
   * Date de création de l'ADHÉSION, distincte de celle de l'adhérent : c'est elle que
   * compte « inscriptions · 7 jours » dans le cockpit (`getAujourdhui` interroge
   * `adhesions.created_at`). Un adhérent de septembre qui s'inscrit à un second cours en
   * janvier est une inscription de janvier.
   */
  created_at: string;
  /** Seule adhésion payée par carte : ouvre le panneau de remboursement. */
  stripe_payment_intent?: string | null;
};

export type ModeReglement = "especes" | "cheque" | "en_ligne" | "autre";

export type ReglementDemo = {
  id: string;
  adhesion_id: string;
  montant_centimes: number;
  mode: ModeReglement;
  note: string | null;
  created_at: string;
  /** Date de remise en banque. `null` = chèque encore à déposer. */
  remis_le: string | null;
};

export type PieceDemo = {
  id: string;
  adherent_id: string;
  cle: string;
  label: string;
  statut: "recue" | "manquante";
  /** Un fichier déposé par l'adhérent — ouvre le document fictif. */
  aUnFichier: boolean;
};

export type QuestionnaireDemo = {
  adherent_id: string;
  resultat: "certificat_requis" | "atteste";
  signataire_nom: string | null;
  created_at: string;
};

// ——— Campagnes ————————————————————————————————————————————————————————————————
// Aucune colonne d'ouverture ni de clic : Klubster ne les mesure pas, et une
// démonstration qui les afficherait promettrait une fonctionnalité inexistante.

export type StatutDestinataire =
  | "prepare"
  | "accepte"
  | "distribue"
  | "retarde"
  | "rejete"
  | "echec"
  | "plainte";

export type DestinataireDemo = {
  id: string;
  email: string;
  statut: StatutDestinataire;
};

export type CampagneDemo = {
  id: string;
  objet: string;
  corps: string;
  groupe_libelle: string;
  auteur_nom: string;
  statut: "en_cours" | "envoye" | "partiel";
  created_at: string;
  destinataires: DestinataireDemo[];
};

// ——— Formulaire d'inscription —————————————————————————————————————————————————
// Des PAGES contenant des CHAMPS typés. Il n'y a pas de « chapitres » dans l'atelier
// réel : la précision vient de l'audit du 30/07/2026, et la démonstration s'y tient.

export type ChampTypeDemo = "texte" | "zone" | "date" | "tel" | "nombre" | "choix" | "case";

export const TYPE_LABELS: Record<ChampTypeDemo, string> = {
  texte: "Texte court",
  zone: "Texte long",
  date: "Date",
  tel: "Téléphone",
  nombre: "Nombre",
  choix: "Liste de choix",
  case: "Case à cocher",
};

export type ChampDemo = {
  id: string;
  type: ChampTypeDemo;
  label: string;
  obligatoire: boolean;
  options?: string;
};

export type PageFormDemo = { id: string; titre: string; champs: ChampDemo[] };
export type PieceFormDemo = { id: string; label: string; obligatoire: boolean; cours_id: string | null };
export type RemiseFormDemo = {
  id: string;
  label: string;
  montant_centimes: number;
  exigeCode: boolean;
  description: string;
};
export type AutorisationDemo = { id: string; label: string; obligatoire: boolean };

export type FormConfigDemo = {
  pages: PageFormDemo[];
  pieces: PieceFormDemo[];
  remises: RemiseFormDemo[];
  autorisations: AutorisationDemo[];
  sante: boolean;
};

// ——— Actualités ———————————————————————————————————————————————————————————————
// Ni brouillon, ni ordre, ni édition : le schéma réel n'a que ces colonnes, et le
// code dit en clair « Pas d'édition en v1 : supprimer puis republier fait le travail ».

export type ActualiteDemo = {
  id: string;
  titre: string;
  texte: string;
  publie_le: string;
  aUneImage: boolean;
};

// ——— Vitrine ——————————————————————————————————————————————————————————————————

export type ChapitreCustomDemo = { id: string; type: string; titre: string; texte: string };

export type PageConfigDemo = {
  ordre: string[];
  masquees: string[];
  custom: ChapitreCustomDemo[];
};

// ——— Présences ————————————————————————————————————————————————————————————————

export type PresenceDemo = { adherent_id: string; jour: string };

// ——— Remises de chèques ———————————————————————————————————————————————————————

export type RemiseChequesDemo = { id: string; date: string; reglementIds: string[] };
