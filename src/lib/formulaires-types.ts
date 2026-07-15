import type { FormConfig } from "@/types/form";

/**
 * Formulaires d'inscription types — le club démarre avec un formulaire complet
 * au lieu d'une page vide (demande de Mathieu, 15/07/2026). Deux réalités :
 * l'association sportive (certificat médical, urgence) et l'association
 * culturelle (niveau de pratique, pas de certificat).
 *
 * Rappel : prénom, nom, email, date de naissance, responsable légal (mineurs),
 * choix du cours et questionnaire de santé sont DÉJÀ portés par le formulaire
 * public — ces modèles n'ajoutent que les champs et pièces complémentaires.
 */

export type TypeAssociation = "sportive" | "culturelle";

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export function formulaireType(type: TypeAssociation): FormConfig {
  const commun = {
    urgenceNom: { id: uid(), type: "texte" as const, label: "Personne à prévenir en cas d'urgence", obligatoire: true },
    urgenceTel: { id: uid(), type: "tel" as const, label: "Téléphone de la personne à prévenir", obligatoire: true },
    image: {
      id: uid(),
      type: "case" as const,
      label: "J'autorise l'association à utiliser des photos ou vidéos prises pendant les activités (site, réseaux sociaux)",
      obligatoire: false,
    },
    connu: {
      id: uid(),
      type: "choix" as const,
      label: "Comment avez-vous connu l'association ?",
      obligatoire: false,
      options: ["Bouche-à-oreille", "Réseaux sociaux", "Recherche internet", "Forum des associations", "Autre"],
    },
  };

  if (type === "sportive") {
    return {
      pages: [
        {
          id: uid(),
          titre: "Urgence & autorisations",
          champs: [commun.urgenceNom, commun.urgenceTel, commun.image, commun.connu],
        },
      ],
      pieces: [
        { id: uid(), label: "Certificat médical de non contre-indication", obligatoire: true, mode: "deux" },
        { id: uid(), label: "Photo d'identité", obligatoire: false, mode: "deux" },
      ],
    };
  }

  return {
    pages: [
      {
        id: uid(),
        titre: "Pratique & autorisations",
        champs: [
          commun.urgenceNom,
          commun.urgenceTel,
          {
            id: uid(),
            type: "choix",
            label: "Niveau de pratique",
            obligatoire: false,
            options: ["Débutant", "Intermédiaire", "Confirmé"],
          },
          commun.image,
          commun.connu,
        ],
      },
    ],
    pieces: [
      { id: uid(), label: "Photo d'identité", obligatoire: false, mode: "deux" },
    ],
  };
}
