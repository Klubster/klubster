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
}
export interface FormConfig {
  pages: Page[];
  pieces: Piece[];
  paiement?: {
    troisFois?: boolean; // proposer le paiement en ligne en 3 mensualités
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
