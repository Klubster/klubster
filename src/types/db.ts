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
  logo_url: string | null;
  couleur_primaire: string | null;
  adresse: string | null;
  email_contact: string | null;
  telephone: string | null;
  stripe_account_id: string | null;
  abonnement_plan: PlanAbonnement | null;
  publie: boolean;
  created_at: string;
  accroche: string | null;
  presentation: string | null;
  infos_pratiques: string | null;
  form_config: FormConfig | null;
  actualite: Actualite | null;
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
