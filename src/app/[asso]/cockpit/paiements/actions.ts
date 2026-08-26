"use server";
import { redirect } from "next/navigation";
import { resteAPayer } from "@/lib/finances";
import { decisionRelanceFinanciere, destinataireRelance } from "@/lib/relances";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peut } from "@/lib/roles";
import { envoyerLotPersonnalise } from "@/lib/resend";
import { compteConnecte } from "@/lib/stripe-org";
import type { Organisation } from "@/types/db";

// Garde spécifique trésorerie : réserve l'action au président et au trésorier.
async function gardeFinance(slug: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/paiements`);
  }
  if (!peut(p.role, "paiements")) redirect(`/${slug}/cockpit?acces=refuse`);
  return org;
}

// Même contrôle, mais sans redirection : les actions appelées depuis un composant client
// renvoient `{ ok, error }` et affichent le message à l'écran. Rediriger en pleine saisie
// dérouterait l'utilisateur. Renvoie l'organisation, ou `null` si l'accès est refusé —
// l'appelant doit alors s'arrêter.
async function gardeFinanceDouce(slug: string): Promise<{ org: Organisation } | null> {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p) return null;
  if (p.organisation_id !== org.id && p.role !== "super_admin") return null;
  if (!peut(p.role, "paiements")) return null;
  return { org };
}

const eurRelance = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

type LigneImpaye = {
  id: string;
  montant_centimes: number | null;
  statut: string | null;
  mode_paiement: string | null;
  adherent: { prenom: string; nom: string; email: string | null; date_naissance: string | null; infos: Record<string, string> | null } | null;
  cours: { nom: string } | null;
  reglements: Array<{ montant_centimes: number; mode: string | null }> | null;
};

// Un email de relance clair, avec le montant restant de la personne. Ni comptable, ni culpabilisant.
function texteRelance(prenom: string, club: string, cours: string | null, resteCentimes: number, enLigne: boolean) {
  const montant = eurRelance(resteCentimes);
  return {
    objet: `Cotisation ${club} — il reste ${montant} € à régler`,
    texte:
      `Bonjour ${prenom},\n\n` +
      `Votre adhésion à ${club}${cours ? ` (${cours})` : ""} n'est pas encore soldée : il reste ${montant} € à régler.\n\n` +
      `Vous pouvez régulariser directement auprès du club${enLigne ? ", ou en ligne depuis votre espace adhérent sur klubster.fr" : ""}. ` +
      `Si c'est déjà fait, merci de ne pas tenir compte de ce message.`,
  };
}

// LA DÉCISION (src/lib/relances.ts) — la même que le cron et l'écran : exclut
// d'elle-même échéancier Stripe en cours, litige, remboursé, annulé, soldé.
// le litige vient du volet financier (adhesions_finance) chargé par l'appelant
const decisionDe = (l: LigneImpaye, litigeLe: string | null = null) =>
  decisionRelanceFinanciere({
    montantCentimes: l.montant_centimes ?? 0,
    statut: (l as { statut?: string | null }).statut ?? "en_attente",
    modePaiement: (l as { mode_paiement?: string | null }).mode_paiement ?? null,
    litigeLe,
    reglements: (l.reglements ?? []).map((r) => ({ montantCentimes: r.montant_centimes, mode: (r as { mode?: string | null }).mode ?? null })),
  });
const resteDe = (l: LigneImpaye, litigeLe: string | null = null) => decisionDe(l, litigeLe).montantCentimes;

/**
 * Relancer une personne. On recharge son solde côté serveur (jamais confiance au client),
 * on n'envoie que s'il reste vraiment quelque chose et qu'elle a un email, puis on horodate
 * la relance pour ne pas la solliciter deux fois de suite.
 */
export async function relancerImpaye(slug: string, adhesionId: string) {
  const org = await gardeFinance(slug);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, statut, mode_paiement, adherent:adherents(prenom, nom, email, date_naissance, infos), cours:cours(nom), reglements(montant_centimes, mode)")
    .eq("id", adhesionId)
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"])
    .maybeSingle();

  const l = data as unknown as LigneImpaye | null;
  const { data: fin } = await supabase.rpc("adhesions_finance", { p_org: org.id });
  const litige = ((fin ?? []) as { id: string; litige_le: string | null }[]).find((f) => f.id === adhesionId)?.litige_le ?? null;
  const email = l?.adherent ? destinataireRelance(l.adherent as never) : null;
  if (!l || !email || !decisionDe(l, litige).relancer) redirect(`/${slug}/cockpit/paiements/relances?erreur=email`);

  const m = texteRelance(l.adherent!.prenom, org.nom, l.cours?.nom ?? null, resteDe(l), !!compteConnecte(org));
  const res = await envoyerLotPersonnalise({
    nomClub: org.nom,
    replyTo: org.email_contact ?? null,
    messages: [{ to: email, objet: m.objet, texte: m.texte }],
  });
  if (res.envoyes > 0) {
    const { error: eRel } = await supabase.rpc("marquer_relance", { p_ids: [adhesionId] });
    if (eRel) console.error("marquer_relance", eRel.message);
  }
  redirect(`/${slug}/cockpit/paiements/relances?${res.ok ? "relance=1" : "erreur=envoi"}`);
}

/** Relancer d'un coup tous les impayés qui ont un email. Un email individuel et chiffré par personne. */
export async function relancerTousImpayes(slug: string) {
  const org = await gardeFinance(slug);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, statut, mode_paiement, adherent:adherents(prenom, nom, email, date_naissance, infos), cours:cours(nom), reglements(montant_centimes, mode)")
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"]);

  const enLigne = !!compteConnecte(org);
  const { data: finTous } = await supabase.rpc("adhesions_finance", { p_org: org.id });
  const litigeParIdAction = new Map(((finTous ?? []) as { id: string; litige_le: string | null }[]).map((f) => [f.id, f.litige_le]));
  const messages: Array<{ to: string; objet: string; texte: string }> = [];
  const ids: string[] = [];
  for (const l of (data ?? []) as unknown as LigneImpaye[]) {
    const email = l.adherent ? destinataireRelance(l.adherent as never) : null;
    if (!email || !decisionDe(l, litigeParIdAction.get(l.id) ?? null).relancer) continue;
    const m = texteRelance(l.adherent!.prenom, org.nom, l.cours?.nom ?? null, resteDe(l), enLigne);
    messages.push({ to: email, objet: m.objet, texte: m.texte });
    ids.push(l.id);
  }

  if (messages.length === 0) redirect(`/${slug}/cockpit/paiements/relances?relances=0`);
  const res = await envoyerLotPersonnalise({ nomClub: org.nom, replyTo: org.email_contact ?? null, messages });
  if (res.envoyes > 0) {
    const { error: eRel } = await supabase.rpc("marquer_relance", { p_ids: ids.slice(0, res.envoyes) });
    if (eRel) console.error("marquer_relance", eRel.message);
  }
  redirect(`/${slug}/cockpit/paiements/relances?relances=${res.envoyes}${res.ok ? "" : "&partiel=1"}`);
}

// Dates de début et de fin de saison : bornent les totaux de trésorerie.
export async function definirSaison(slug: string, formData: FormData) {
  const org = await gardeFinance(slug);
  const debut = String(formData.get("debut") ?? "").trim() || null;
  const fin = String(formData.get("fin") ?? "").trim() || null;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("organisations")
    .update({ saison_debut: debut, saison_fin: fin })
    .eq("id", org.id);
  if (error) console.error("definirSaison", error.message);
  redirect(`/${slug}/cockpit/paiements${error ? "?erreur=saison" : "?saison=1"}`);
}

// Marque le solde complet comme encaissé.
export async function marquerEncaisse(slug: string, adhesionId: string) {
  await gardeFinance(slug);
  const supabase = await createSupabaseServerClient();
  // Un échec d'écriture doit se VOIR : avant, la redirection était identique en
  // succès et en échec, et le trésorier croyait la cotisation soldée.
  const { error } = await supabase.rpc("marquer_encaisse", { p_adhesion_id: adhesionId });
  redirect(`/${slug}/cockpit/paiements${error ? "?erreur=encaisse" : ""}`);
}

// Enregistre un règlement partiel ou total (chèque/espèces/virement…). Renvoie le solde restant.
export async function enregistrerReglement(
  slug: string,
  adhesionId: string,
  montantCentimes: number,
  mode: "cheque" | "especes" | "virement" | "autre",
  note?: string | null
): Promise<{ ok: boolean; soldeCentimes?: number; error?: string }> {
  if (!(await gardeFinanceDouce(slug))) return { ok: false, error: "Accès refusé." };
  if (!Number.isFinite(montantCentimes) || montantCentimes <= 0) {
    return { ok: false, error: "Montant invalide." };
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("enregistrer_reglement", {
    p_adhesion_id: adhesionId,
    p_montant_centimes: Math.round(montantCentimes),
    p_mode: mode,
    p_note: note ? note.trim().slice(0, 120) || null : null,
  });
  if (error) {
    console.error("enregistrer_reglement", error.message);
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, soldeCentimes: Number(data ?? 0) };
}

// Marque les chèques sélectionnés comme remis en banque (bordereau imprimé).
// La sélection est revalidée côté base : la RPC ne touche que les chèques de l'organisation.
export async function marquerChequesRemis(
  slug: string,
  ids: string[]
): Promise<{ ok: boolean; nombre?: number; error?: string }> {
  if (!(await gardeFinanceDouce(slug))) return { ok: false, error: "Accès refusé." };
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Aucun chèque sélectionné." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("marquer_cheques_remis", { p_ids: ids });
  if (error) {
    console.error("marquer_cheques_remis", error.message);
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, nombre: Number(data ?? 0) };
}
