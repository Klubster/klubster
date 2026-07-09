// Bibliothèque de chapitres de la vitrine — le dirigeant choisit une intention,
// Klubster impose le layout. Groupés par objectif, comme la vie d'un club.
import type { SectionCustomType } from "@/types/db";

export interface Chapitre {
  type: SectionCustomType;
  label: string;
  desc: string;
}

export interface GroupeChapitres {
  groupe: string;
  chapitres: Chapitre[];
}

export const BIBLIOTHEQUE: GroupeChapitres[] = [
  {
    groupe: "Présenter le club",
    chapitres: [
      { type: "president", label: "Le mot du président", desc: "Une citation, une photo, une signature." },
      { type: "chiffres", label: "Chiffres clés", desc: "Année de création, licenciés, bénévoles…" },
      { type: "equipe", label: "Entraîneurs & bénévoles", desc: "Les visages du club : prénom, rôle, photo." },
    ],
  },
  {
    groupe: "Recruter",
    chapitres: [
      { type: "faq", label: "Questions fréquentes", desc: "Âge, essai, certificat, inscription…" },
    ],
  },
  {
    groupe: "Faire vivre",
    chapitres: [
      { type: "galerie", label: "Galerie photos", desc: "Vos meilleures photos, en grille." },
      { type: "resultats", label: "Résultats & événements", desc: "Podiums, compétitions, gala, stages." },
      { type: "partenaires", label: "Partenaires", desc: "Les logos de ceux qui vous soutiennent." },
    ],
  },
  {
    groupe: "Inspirer",
    chapitres: [
      { type: "citation", label: "Grande citation", desc: "Une phrase, pleine largeur, comme un manifeste." },
      { type: "photo-droite", label: "Texte & photo", desc: "Un bloc libre : texte et photo côte à côte." },
    ],
  },
];

// « Texte & photo » regroupe trois mises en page. Seule `photo-droite` figure dans la
// bibliothèque, mais les deux autres doivent ouvrir le même formulaire — sinon un lien
// direct (?chapitre=photo-gauche) renvoyait la bibliothèque au lieu du chapitre.
const ALIAS_TEXTE_PHOTO: Record<string, SectionCustomType> = {
  "photo-gauche": "photo-droite",
  triptyque: "photo-droite",
};

export function getChapitre(type: string | null | undefined): Chapitre | null {
  const recherche = (type && ALIAS_TEXTE_PHOTO[type]) || type;
  for (const g of BIBLIOTHEQUE) {
    const c = g.chapitres.find((x) => x.type === recherche);
    if (c) return c;
  }
  return null;
}

// Libellé par défaut affiché dans le filet « SECTION nn — … » de la vitrine.
export const LABEL_DEFAUT: Record<string, string> = {
  president: "Le mot du président",
  chiffres: "Le club en chiffres",
  equipe: "L'équipe",
  faq: "Questions fréquentes",
  galerie: "En images",
  resultats: "Résultats",
  partenaires: "Nos partenaires",
  citation: "",
  "photo-droite": "Le club",
  "photo-gauche": "Le club",
  triptyque: "Le club",
};
