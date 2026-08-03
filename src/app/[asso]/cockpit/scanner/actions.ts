"use server";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface VerifResult {
  ok: boolean;
  prenom?: string; nom?: string; cours?: string | null;
  regle?: boolean; piecesManquantes?: number; present?: boolean;
  error?: string;
}

/** Statuts rendus par `controler_adherent` — un par situation, jamais un booléen. */
export type StatutControle =
  | "a_jour" | "paiement_attendu" | "en_retard" | "dossier_incomplet"
  | "questionnaire_manquant" | "liste_attente" | "annule" | "rembourse"
  | "saison_precedente" | "non_inscrit_ce_cours" | "aucune_adhesion";

export interface ControleResult {
  ok: boolean;
  prenom?: string; nom?: string; cours?: string | null;
  statut?: StatutControle;
  piecesManquantes?: number;
  questionnaireOk?: boolean;
  present?: boolean;
  autresCours?: string[];
  /** `sessionExpiree` distingue « reconnectez-vous » d'« introuvable ». */
  sessionExpiree?: boolean;
  error?: string;
}

// Contrôle au bord du tapis : permission « controle ». C'est le seul droit d'un
// encadrant, et un accès en lecture seule ne doit pas pouvoir marquer les présences.
async function guard(slug: string) {
  const ctx = await verifierPermission(slug, "controle");
  return ctx?.org ?? null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function controlerAdherent(slug: string, adherentId: string, coursId: string): Promise<ControleResult> {
  // La session peut expirer pendant une soirée d'appel : on le DIT, au lieu de
  // laisser croire que l'adhérent n'existe pas.
  const org = await guard(slug);
  if (!org) return { ok: false, sessionExpiree: true, error: "Session expirée — reconnectez-vous." };
  // Un QR étranger (ou un collage raté) n'est pas un uuid : réponse immédiate,
  // sans requête, même hors ligne côté base.
  if (!UUID.test(adherentId) || !UUID.test(coursId)) {
    return { ok: false, error: "Adhérent introuvable." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("controler_adherent", { p_adherent_id: adherentId, p_cours_id: coursId });
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (error || !row) {
    // « Non autorisé » couvre aussi l'adhérent d'un AUTRE club : au bord du tapis,
    // la distinction n'apporte rien — la carte n'ouvre pas la porte, point.
    return { ok: false, error: "Adhérent introuvable." };
  }
  return {
    ok: true,
    prenom: row.prenom as string,
    nom: row.nom as string,
    cours: (row.cours as string) ?? null,
    statut: row.statut as StatutControle,
    piecesManquantes: row.pieces_manquantes as number,
    questionnaireOk: row.questionnaire_ok as boolean,
    present: row.present_aujourdhui as boolean,
    autresCours: (row.autres_cours as string[]) ?? [],
  };
}

export async function verifierAdherent(slug: string, adherentId: string): Promise<VerifResult> {
  if (!(await guard(slug))) return { ok: false, error: "Non autorisé." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("verifier_adherent", { p_adherent_id: adherentId });
  const row = (data as Array<Record<string, unknown>> | null)?.[0];
  if (error || !row) return { ok: false, error: "Adhérent introuvable." };
  return {
    ok: true,
    prenom: row.prenom as string, nom: row.nom as string, cours: (row.cours as string) ?? null,
    regle: row.regle as boolean, piecesManquantes: row.pieces_manquantes as number, present: row.present_aujourdhui as boolean,
  };
}

export async function marquerPresent(slug: string, adherentId: string, coursId: string): Promise<{ ok: boolean }> {
  if (!(await guard(slug))) return { ok: false };
  if (!UUID.test(adherentId) || !UUID.test(coursId)) return { ok: false };
  const supabase = await createSupabaseServerClient();
  // Idempotent en base (contrainte adhérent + cours + date) : deux clics simultanés
  // produisent UNE présence ; un autre cours le même jour en produit une autre.
  const { error } = await supabase.rpc("marquer_present", { p_adherent_id: adherentId, p_cours_id: coursId });
  return { ok: !error };
}

export async function rechercher(slug: string, q: string): Promise<{ id: string; prenom: string; nom: string }[]> {
  const org = await guard(slug);
  if (!org) return [];
  const clean = q.replace(/[^a-zà-ÿ0-9 -]/gi, "").trim();
  if (clean.length < 2) return [];
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adherents").select("id, prenom, nom").eq("organisation_id", org.id)
    .or(`nom.ilike.%${clean}%,prenom.ilike.%${clean}%`).order("nom").limit(12);
  return (data as { id: string; prenom: string; nom: string }[]) ?? [];
}
