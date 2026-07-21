// Types reflétant le schéma multi-tenant Supabase (public.*).
// Chaque ligne porte un organisation_id (isolation RLS).
import type { FormConfig } from "@/types/form";

export type Role = "super_admin" | "admin_asso" | "encadrant" | "adherent";
export type PlanAbonnement = "starter" | "club" | "club_plus";
export type StatutAdhesion =
  | "en_attente" | "paye" | "en_retard" | "rembourse" | "annule";

export interface Creneau {
  jour: "lundi" | "mardi" | "mercredi" | "jeudi" | "vendredi" | "samedi" | "dimanche";
  debut: string; // "18:30"
  fin: string;   // "20:00"
  note?: string;
}

export interface Organisation {
  id: string;
  slug: string;
  nom: string;
  sport: string | null;
  theme_template: string | null; // template de design du site (src/lib/themes.ts)
  theme_mode: string | null;     // "blanc" | "noir"
  domaine_custom: string | null; // domaine propre du club (ex. usmboxeanglaise.fr)
  logo_url: string | null;
  couleur_primaire: string | null;
  adresse: string | null;
  email_contact: string | null;
  telephone: string | null;
  stripe_account_id: string | null;
  /** Mensualités maximales proposées aux adhérents (1 = comptant seul, 12 = mensuel sur la saison). */
  echeances_max: number;
  /** Dates de saison configurables : bornent les totaux de trésorerie. NULL = non configuré. */
  saison_debut: string | null;
  saison_fin: string | null;
  abonnement_plan: PlanAbonnement | null;
  /* Abonnement Klubster (facturé par la plateforme, distinct de Stripe Connect). */
  abonnement_customer_id: string | null;
  abonnement_subscription_id: string | null;
  abonnement_statut: "aucun" | "essai" | "actif" | "impaye" | "resilie";
  abonnement_essai_fin: string | null;
  abonnement_periode_fin: string | null;
  /** Identifiants Stripe du mode test — jamais mélangés avec ceux de production. */
  stripe_test: Record<string, string | null> | null;
  publie: boolean;
  created_at: string;
  accroche: string | null;
  presentation: string | null;
  infos_pratiques: string | null;
  form_config: FormConfig | null;
  actualite: Actualite | null;
  page_config: PageConfig | null;
}

// Mode « Édition de page » : ordre des sections de la vitrine + chapitres personnalisés.
// Le dirigeant choisit une intention (« Mot du président », « FAQ »…), jamais un layout.
export type SectionCustomType =
  | "photo-droite" | "photo-gauche" | "triptyque" // texte & photo (layouts historiques)
  | "president"    // photo, citation, nom + rôle
  | "chiffres"     // chiffres clés (paires chiffre/label)
  | "equipe"       // entraîneurs & bénévoles (photo, prénom, rôle)
  | "faq"          // questions fréquentes
  | "galerie"      // photos en grille
  | "partenaires"  // logos
  | "resultats"    // résultats & événements (lignes titre/détail)
  | "citation";    // grande citation pleine largeur

// Élément générique d'un chapitre (question/réponse, chiffre/label, personne, photo…).
export interface ItemChapitre {
  titre: string | null;
  texte: string | null;
  image_url: string | null;
}

export interface SectionCustom {
  id: string; // "c<timestamp>"
  type: SectionCustomType;
  titre: string | null;
  texte: string | null;   // texte principal / citation
  texte2: string | null;  // texte secondaire / auteur
  image_url: string | null;
  items?: ItemChapitre[];
}

/** Paliers de taille du logo dans le hero. */
export type TailleLogo = "s" | "m" | "l" | "xl";

export interface PageConfig {
  ordre: string[]; // clés standard ("presentation", "cours"…) et ids de sections custom
  custom: SectionCustom[];
  /**
   * Chapitres standards que le club a choisi de retirer. Sans cette liste, les retirer
   * de `ordre` ne servait à rien : la normalisation les y remettait aussitôt, et la
   * suppression n'était donc proposée que pour les chapitres personnalisés.
   * Un retrait reste réversible — ils se réaffichent depuis le mode édition.
   */
  masquees?: string[];
  /** Réglages du hero (première section). */
  hero?: {
    /** Afficher le logo du club à droite du titre. Vrai par défaut s'il y a un logo. */
    logo?: boolean;
    /**
     * Taille du logo dans le hero. Quatre paliers plutôt qu'un nombre libre : un logo
     * très large ou très carré ne se règle pas de la même façon, et un champ en pixels
     * laisserait un club poser un logo de 900 px qui écrase son propre titre.
     */
    logoTaille?: TailleLogo;
  };
}

// Actualité « à la une » affichée dans le hero de la vitrine du club.
export interface Actualite {
  texte: string | null;
  image_url: string | null;
}

export interface Cours {
  id: string;
  organisation_id: string;
  nom: string;
  description: string | null;
  public_cible: string | null;
  age_min: number | null;
  age_max: number | null;
  tarif_centimes: number;
  places_max: number | null;
  creneaux: Creneau[];
  ordre: number | null;
}

export interface Adherent {
  id: string;
  organisation_id: string;
  nom: string;
  prenom: string;
  email: string | null;
  telephone: string | null;
  date_naissance: string | null;
  /** Réponses aux champs personnalisés du formulaire (responsable légal, etc.). */
  infos: Record<string, string> | null;
  created_at: string;
}

export interface Adhesion {
  id: string;
  organisation_id: string;
  adherent_id: string;
  cours_id: string | null;
  saison: string | null;
  montant_centimes: number;
  statut: StatutAdhesion;
  created_at: string;
}
