// Modèles par sport : cours, créneaux et tarifs pré-remplis (north star < 20 min).
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
  { id: "judo", label: "Judo / arts martiaux", couleur: "#2D5B7A" },
  { id: "karate", label: "Karaté / taekwondo", couleur: "#7A4D8C" },
  { id: "danse", label: "École de danse", couleur: "#A03C6E" },
  { id: "gym", label: "Gymnastique", couleur: "#B5651D" },
  { id: "foot", label: "Football", couleur: "#1E7A4F" },
  { id: "rugby", label: "Rugby", couleur: "#7A2E2E" },
  { id: "basket", label: "Basketball", couleur: "#C05A1D" },
  { id: "hand", label: "Handball", couleur: "#2E5AA0" },
  { id: "volley", label: "Volleyball", couleur: "#1E7A7A" },
  { id: "tennis", label: "Tennis", couleur: "#5C7A1D" },
  { id: "tennis_table", label: "Tennis de table", couleur: "#356B8C" },
  { id: "badminton", label: "Badminton", couleur: "#2E7A56" },
  { id: "natation", label: "Natation", couleur: "#1C6F9C" },
  { id: "athletisme", label: "Athlétisme", couleur: "#9C5A1C" },
  { id: "escalade", label: "Escalade", couleur: "#8C5A2E" },
  { id: "cyclisme", label: "Cyclisme / VTT", couleur: "#444441" },
  { id: "equitation", label: "Équitation", couleur: "#6E4B2E" },
  { id: "multisport", label: "Multisport / loisirs", couleur: "#3A6B5C" },
  { id: "autre", label: "Autre association", couleur: "#111111" },
];

function trio(
  e: { nom: string; tarif: number; jour: string; h: [string, string] },
  a: { nom: string; tarif: number; jour: string; h: [string, string] },
  ad: { nom: string; tarif: number; jour: string; h: [string, string] }
): TemplateCours[] {
  return [
    { nom: e.nom, public_cible: "Enfants", age_min: 5, age_max: 11, tarif_centimes: e.tarif, creneaux: [{ jour: e.jour, debut: e.h[0], fin: e.h[1] }] },
    { nom: a.nom, public_cible: "Ados", age_min: 12, age_max: 17, tarif_centimes: a.tarif, creneaux: [{ jour: a.jour, debut: a.h[0], fin: a.h[1] }] },
    { nom: ad.nom, public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: ad.tarif, creneaux: [{ jour: ad.jour, debut: ad.h[0], fin: ad.h[1] }] },
  ];
}

export const TEMPLATES_COURS: Record<string, TemplateCours[]> = {
  boxe: [
    { nom: "Baby Boxe", public_cible: "Enfants de 6 à 8 ans", age_min: 6, age_max: 8, tarif_centimes: 16000, creneaux: [{ jour: "lundi", debut: "17:00", fin: "17:45" }] },
    { nom: "Boxe Éducative", public_cible: "Jeunes de 8 à 16 ans", age_min: 8, age_max: 16, tarif_centimes: 16000, creneaux: [{ jour: "mercredi", debut: "13:30", fin: "15:00" }] },
    { nom: "Loisirs", public_cible: "Adultes à partir de 16 ans", age_min: 16, age_max: null, tarif_centimes: 21000, creneaux: [{ jour: "lundi", debut: "18:30", fin: "20:00" }, { jour: "jeudi", debut: "18:30", fin: "20:00" }] },
    { nom: "Compétition", public_cible: "Compétiteurs confirmés", age_min: null, age_max: null, tarif_centimes: 21000, creneaux: [{ jour: "vendredi", debut: "20:00", fin: "21:30" }] },
  ],
  judo: trio(
    { nom: "Baby Judo", tarif: 15000, jour: "mercredi", h: ["10:00", "10:45"] },
    { nom: "Judo Ados", tarif: 18000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Judo Adultes", tarif: 20000, jour: "jeudi", h: ["19:30", "21:00"] }
  ),
  karate: trio(
    { nom: "Karaté Enfants", tarif: 15000, jour: "mercredi", h: ["14:00", "15:00"] },
    { nom: "Karaté Ados", tarif: 18000, jour: "mardi", h: ["18:30", "20:00"] },
    { nom: "Karaté Adultes", tarif: 20000, jour: "jeudi", h: ["20:00", "21:30"] }
  ),
  danse: [
    { nom: "Éveil Danse", public_cible: "Enfants de 4 à 6 ans", age_min: 4, age_max: 6, tarif_centimes: 16000, creneaux: [{ jour: "mercredi", debut: "14:00", fin: "15:00" }] },
    { nom: "Modern Jazz", public_cible: "Ados et adultes", age_min: 12, age_max: null, tarif_centimes: 19000, creneaux: [{ jour: "lundi", debut: "18:00", fin: "19:30" }] },
    { nom: "Classique", public_cible: "Tous niveaux", age_min: null, age_max: null, tarif_centimes: 19000, creneaux: [{ jour: "samedi", debut: "10:00", fin: "11:30" }] },
  ],
  gym: trio(
    { nom: "Baby Gym", tarif: 15000, jour: "mercredi", h: ["09:30", "10:30"] },
    { nom: "Gym Ados", tarif: 17000, jour: "mardi", h: ["17:30", "19:00"] },
    { nom: "Gym Adultes", tarif: 18000, jour: "jeudi", h: ["19:00", "20:30"] }
  ),
  foot: trio(
    { nom: "École de foot U7-U9", tarif: 12000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "U11-U13", tarif: 14000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Seniors", tarif: 16000, jour: "vendredi", h: ["19:30", "21:00"] }
  ),
  rugby: trio(
    { nom: "Rugby École", tarif: 13000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Rugby Cadets", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Rugby Seniors", tarif: 17000, jour: "jeudi", h: ["19:30", "21:00"] }
  ),
  basket: trio(
    { nom: "Baby Basket", tarif: 13000, jour: "mercredi", h: ["13:30", "14:30"] },
    { nom: "Basket Minimes", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Basket Seniors", tarif: 17000, jour: "jeudi", h: ["20:00", "21:30"] }
  ),
  hand: trio(
    { nom: "Hand École", tarif: 13000, jour: "mercredi", h: ["14:00", "15:00"] },
    { nom: "Hand Ados", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Hand Seniors", tarif: 17000, jour: "vendredi", h: ["19:30", "21:00"] }
  ),
  volley: trio(
    { nom: "Volley Jeunes", tarif: 13000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Volley Ados", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Volley Loisirs", tarif: 16000, jour: "jeudi", h: ["20:00", "21:30"] }
  ),
  tennis: [
    { nom: "École de tennis", public_cible: "Enfants de 6 à 12 ans", age_min: 6, age_max: 12, tarif_centimes: 18000, creneaux: [{ jour: "mercredi", debut: "13:30", fin: "14:30" }] },
    { nom: "Loisir", public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: 22000, creneaux: [{ jour: "lundi", debut: "19:00", fin: "20:30" }] },
    { nom: "Compétition", public_cible: "Joueurs classés", age_min: null, age_max: null, tarif_centimes: 26000, creneaux: [{ jour: "samedi", debut: "09:00", fin: "11:00" }] },
  ],
  tennis_table: trio(
    { nom: "Ping Jeunes", tarif: 12000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Ping Ados", tarif: 14000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Ping Loisirs", tarif: 15000, jour: "jeudi", h: ["19:30", "21:00"] }
  ),
  badminton: trio(
    { nom: "Bad Jeunes", tarif: 12000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Bad Ados", tarif: 14000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Bad Loisirs", tarif: 15000, jour: "jeudi", h: ["20:00", "21:30"] }
  ),
  natation: trio(
    { nom: "Bébés nageurs", tarif: 16000, jour: "samedi", h: ["09:00", "09:45"] },
    { nom: "École de natation", tarif: 18000, jour: "mercredi", h: ["14:00", "15:00"] },
    { nom: "Natation Adultes", tarif: 20000, jour: "lundi", h: ["19:00", "20:00"] }
  ),
  athletisme: trio(
    { nom: "Baby Athlé", tarif: 13000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Athlé Jeunes", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Athlé Adultes", tarif: 16000, jour: "jeudi", h: ["19:00", "20:30"] }
  ),
  escalade: trio(
    { nom: "Escalade Enfants", tarif: 16000, jour: "mercredi", h: ["14:00", "15:30"] },
    { nom: "Escalade Ados", tarif: 18000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Escalade Adultes", tarif: 20000, jour: "jeudi", h: ["19:30", "21:00"] }
  ),
  cyclisme: trio(
    { nom: "École de vélo", tarif: 13000, jour: "mercredi", h: ["14:00", "16:00"] },
    { nom: "Jeunes routiers", tarif: 15000, jour: "samedi", h: ["09:00", "11:30"] },
    { nom: "Cyclo Adultes", tarif: 16000, jour: "dimanche", h: ["08:30", "11:30"] }
  ),
  equitation: trio(
    { nom: "Poney Club", tarif: 22000, jour: "mercredi", h: ["14:00", "15:00"] },
    { nom: "Galops Jeunes", tarif: 26000, jour: "samedi", h: ["10:00", "11:30"] },
    { nom: "Cours Adultes", tarif: 28000, jour: "jeudi", h: ["18:30", "20:00"] }
  ),
  multisport: trio(
    { nom: "Multisport Enfants", tarif: 13000, jour: "mercredi", h: ["14:00", "16:00"] },
    { nom: "Multisport Ados", tarif: 15000, jour: "mardi", h: ["18:00", "19:30"] },
    { nom: "Sport Loisirs Adultes", tarif: 16000, jour: "jeudi", h: ["19:00", "20:30"] }
  ),
  autre: [
    { nom: "Séance enfants", public_cible: "Enfants", age_min: 6, age_max: 12, tarif_centimes: 12000, creneaux: [{ jour: "mercredi", debut: "14:00", fin: "15:00" }] },
    { nom: "Séance adultes", public_cible: "Adultes", age_min: 16, age_max: null, tarif_centimes: 15000, creneaux: [{ jour: "jeudi", debut: "19:00", fin: "20:30" }] },
  ],
};
