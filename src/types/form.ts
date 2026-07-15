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
export interface FormConfig {
  pages: Page[];
  pieces: Piece[];
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
