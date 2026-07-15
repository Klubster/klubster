export type ChampType = "texte" | "zone" | "date" | "tel" | "nombre" | "choix" | "case";

export interface Champ {
  id: string;
  type: ChampType;
  label: string;
  obligatoire: boolean;
  options?: string[];
}
export interface Page {
  id: string;
  titre: string;
  champs: Champ[];
}
export interface Piece {
  id: string;
  label: string;
  obligatoire: boolean;
  mode: "upload" | "email" | "deux";
  cours_id?: string | null; // pièce demandée uniquement pour ce cours (null/absent = tous)
  /** Fichier modèle à télécharger par l'adhérent (ex. certificat médical vierge). */
  modele_url?: string | null;
  modele_nom?: string | null;
}
/**
 * Réduction conditionnelle sur la cotisation (ex. Pass'Sport) : l'adhérent la
 * sélectionne à l'inscription — avec un code justificatif si le club l'exige —
 * et le montant dû baisse d'autant. Le calcul se fait toujours côté serveur.
 */
export interface Remise {
  id: string;
  label: string;
  /** Aide affichée sous la remise (ex. « Réservé aux bénéficiaires du Pass'Sport »). */
  description?: string;
  montant_centimes: number;
  /** Un code justificatif est demandé (stocké sur la fiche pour vérification par le club). */
  exigeCode: boolean;
}

/** Autorisation parentale (case à cocher), demandée uniquement quand l'adhérent est mineur. */
export interface AutorisationMineur {
  id: string;
  label: string;
  /** Obligatoire = impossible de valider l'inscription sans cocher (ex. premiers soins). */
  obligatoire: boolean;
}

export interface FormConfig {
  pages: Page[];
  pieces: Piece[];
  /** Bloc « mineurs » : autorisations parentales, affichées selon la date de naissance. */
  mineur?: {
    autorisations: AutorisationMineur[];
  };
  /** Réductions conditionnelles (Pass'Sport, tarif famille…). */
  remises?: Remise[];
  paiement?: {
    troisFois?: boolean; // proposer le paiement en ligne en 3 mensualités
  };
  sante?: {
    /**
     * Questionnaire de santé QS-SPORT dans le formulaire d'inscription.
     * Désactivé par défaut : certaines disciplines (sports de combat…) exigent
     * un certificat médical systématique, le QS ne s'y substitue pas.
     */
    questionnaire?: boolean;
  };
}

export const FORM_CONFIG_VIDE: FormConfig = { pages: [], pieces: [] };

export const TYPE_LABELS: Record<ChampType, string> = {
  texte: "Texte court",
  zone: "Texte long",
  date: "Date",
  tel: "Téléphone",
  nombre: "Nombre",
  choix: "Liste de choix",
  case: "Case à cocher",
};
