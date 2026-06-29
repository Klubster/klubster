// Templates par sport : cours, créneaux et tarifs pré-remplis (north star < 20 min).
export interface TemplateCours {
  nom: string;
  public_cible: string;
  age_min: number | null;
  age_max: number | null;
  tarif_centimes: number;
  creneaux: { jour: string; debut: string; fin: string; note?: string }[];
}

export const SPORTS: { id: string; label: string; couleur: string }[] = [
  { id: "boxe", label: "Club de boxe", couleur: "#189460" },
  { id: "judo", label: "Club de judo", couleur: "#2D5B7A" },
  { id: "danse", label: "École de danse", couleur: "#A03C6E" },
  { id: "foot", label: "Club de foot", couleur: "#1E7A4F" },
  { id: "tennis", label: "Club de tennis", couleur: "#B5651D" },
  { id: "autre", label: "Autre association", couleur: "#111111" },
];

export const TEMPLATES_COURS: Record<string, TemplateCours[]> = {
  boxe: [
    { nom: "Baby Boxe", public_cible: "Enfants de 6 à 8 ans", age_min: 6, age_max: 8, tarif_centimes: 16000, creneaux: [{ jour: "lundi", debut: "17:00", fin: "17:45" }] },
    { nom: "Boxe Éducative", public_cible: "Jeunes de 8 à 16 ans", age_min: 8, age_max: 16, tarif_centimes: 16000, creneaux: [{ jour: "mercredi", debut: "13:30", fin: "15:00" }] },
    { nom: "Loisirs", public_cible: "Adultes à partir de 16 ans", age_min: 16, age_max: null, tarif_centimes: 21000, creneaux: [{ jour: "lundi", debut: "18:30", fin: "20:00" }, { jour: "jeudi", debut: "18:30", fin: "20:00" }] },
    { nom: "Compétition", public_cible: "Compétiteurs confirmés", age_min: null, age_max: null, tarif_centimes: 21000, creneaux: [{ jour: "vendredi", debut: "20:00", fin: "21:30" }] },
  ],
  judo: [
    { nom: "Baby Judo", public_cible: "Enfants de 4 à 6 ans", age_min: 4, age_max: 6, tarif_centimes: 15000, creneaux: [{ jour: "mercredi", debut: "10:00", fin: "10:45" }] },
    { nom: "Judo Enfants", public_cible: "Enfants de 7 à 12 ans", age_min: 7, age_max: 12, tarif_centimes: 17000, creneaux: [{ jour: "mardi", debut: "17:30", fin: "18:30" }] },
    { nom: "Judo Ados / Adultes", public_cible: "À partir de 13 ans", age_min: 13, age_max: null, tarif_centimes: 20000, creneaux: [{ jour: "jeudi", debut: "19:00", fin: "20:30" }] },
  ],
  danse: [
    { nom: "Éveil Danse", public_cible: "Enfants de 4 à 6 ans", age_min: 4, age_max: 6, tarif_centimes: 16000, creneaux: [{ jour: "mercredi", debut: "14:00", fin: "15:00" }] },
    { nom: "Modern Jazz", public_cible: "Ados et adultes", age_min: 12, age_max: null, tarif_centimes: 19000, creneaux: [{ jour: "lundi", debut: "18:00", fin: "19:30" }] },
    { nom: "Classique", public_cible: "Tous niveaux", age_min: null, age_max: null, tarif_centimes: 19000, creneaux: [{ jour: "samedi", debut: "10:00", fin: "11:30" }] },
  ],
  foot: [
    { nom: "École de foot U7-U9", public_cible: "Enfants de 5 à 9 ans", age_min: 5, age_max: 9, tarif_centimes: 12000, creneaux: [{ jour: "mercredi", debut: "14:00", fin: "15:30" }] },
    { nom: "U11-U13", public_cible: "Jeunes de 10 à 13 ans", age_min: 10, age_max: 13, tarif_centimes: 14000, creneaux: [{ jour: "mardi", debut: "18:00", fin: "19:30" }] },
    { nom: "Seniors", public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: 16000, creneaux: [{ jour: "vendredi", debut: "19:30", fin: "21:00" }] },
  ],
  tennis: [
    { nom: "École de tennis", public_cible: "Enfants de 6 à 12 ans", age_min: 6, age_max: 12, tarif_centimes: 18000, creneaux: [{ jour: "mercredi", debut: "13:30", fin: "14:30" }] },
    { nom: "Loisir", public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: 22000, creneaux: [{ jour: "lundi", debut: "19:00", fin: "20:30" }] },
    { nom: "Compétition", public_cible: "Joueurs classés", age_min: null, age_max: null, tarif_centimes: 26000, creneaux: [{ jour: "samedi", debut: "09:00", fin: "11:00" }] },
  ],
  autre: [
    { nom: "Séance enfants", public_cible: "Enfants", age_min: 6, age_max: 12, tarif_centimes: 12000, creneaux: [{ jour: "mercredi", debut: "14:00", fin: "15:00" }] },
    { nom: "Séance adultes", public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: 15000, creneaux: [{ jour: "jeudi", debut: "19:00", fin: "20:30" }] },
  ],
};
