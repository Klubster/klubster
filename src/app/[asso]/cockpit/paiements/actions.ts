"use server";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peut } from "@/lib/roles";
import { envoyerLotPersonnalise } from "@/lib/resend";
import { compteConnecte } from "@/lib/stripe-org";

async function garde(slug: string) {
  const org = await getOrganisationBySlug(slug);
  const p = await getProfile();
  if (!org || !p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/paiements`);
  }
  return org;
}

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

const eurRelance = (c: number) => (c / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 });

type LigneImpaye = {
  id: string;
  montant_centimes: number | null;
  adherent: { prenom: string; nom: string; email: string | null } | null;
  cours: { nom: string } | null;
  reglements: Array<{ montant_centimes: number }> | null;
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

const resteDe = (l: LigneImpaye) =>
  (l.montant_centimes ?? 0) - (l.reglements ?? []).reduce((s, r) => s + r.montant_centimes, 0);

/**
 * Relancer une personne. On recharge son solde côté serveur (jamais confiance au client),
 * on n'envoie que s'il reste vraiment quelque chose et qu'elle a un email, puis on horodate
 * la relance pour ne pas la solliciter deux fois de suite.
 */
export async function relancerImpaye(slug: string, adhesionId: string) {
  const org = await gardeFinance(slug);
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, adherent:adherents(prenom, nom, email), cours:cours(nom), reglements(montant_centimes)")
    .eq("id", adhesionId)
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"])
    .maybeSingle();

  const l = data as unknown as LigneImpaye | null;
  const email = l?.adherent?.email ?? null;
  if (!l || !email || resteDe(l) <= 0) redirect(`/${slug}/cockpit/paiements/relances?erreur=email`);

  const m = texteRelance(l.adherent!.prenom, org.nom, l.cours?.nom ?? null, resteDe(l), !!compteConnecte(org));
  const res = await envoyerLotPersonnalise({
    nomClub: org.nom,
    replyTo: org.email_contact ?? null,
    messages: [{ to: email, objet: m.objet, texte: m.texte }],
  });
  if (res.envoyes > 0) await supabase.rpc("marquer_relance", { p_ids: [adhesionId] });
  redirect(`/${slug}/cockpit/paiements/relances?${res.ok ? "relance=1" : "erreur=envoi"}`);
}

/** Relancer d'un coup tous les impayés qui ont un email. Un email individuel et chiffré par personne. */
export async function relancerTousImpayes(slug: string) {
  const org = await gardeFinance(slug);
  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, adherent:adherents(prenom, nom, email), cours:cours(nom), reglements(montant_centimes)")
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"]);

  const enLigne = !!compteConnecte(org);
  const messages: Array<{ to: string; objet: string; texte: string }> = [];
  const ids: string[] = [];
  for (const l of (data ?? []) as unknown as LigneImpaye[]) {
    const email = l.adherent?.email ?? null;
    if (!email || resteDe(l) <= 0) continue;
    const m = texteRelance(l.adherent!.prenom, org.nom, l.cours?.nom ?? null, resteDe(l), enLigne);
    messages.push({ to: email, objet: m.objet, texte: m.texte });
    ids.push(l.id);
  }

  if (messages.length === 0) redirect(`/${slug}/cockpit/paiements/relances?relances=0`);
  const res = await envoyerLotPersonnalise({ nomClub: org.nom, replyTo: org.email_contact ?? null, messages });
  if (res.envoyes > 0) await supabase.rpc("marquer_relance", { p_ids: ids.slice(0, res.envoyes) });
  redirect(`/${slug}/cockpit/paiements/relances?relances=${res.envoyes}${res.ok ? "" : "&partiel=1"}`);
}

// Dates de début et de fin de saison : bornent les totaux de trésorerie.
export async function definirSaison(slug: string, formData: FormData) {
  const org = await garde(slug);
  const debut = String(formData.get("debut") ?? "").trim() || null;
  const fin = String(formData.get("fin") ?? "").trim() || null;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("organisations")
    .update({ saison_debut: debut, saison_fin: fin })
    .eq("id", org.id);
  if (error) console.error("definirSaison", error.message);
  redirect(`/${slug}/cockpit/paiements${error ? "?erreur=saison" : "?saison=1"}`);
}

// Marque le solde complet comme encaissé.
export async function marquerEncaisse(slug: string, adhesionId: string) {
  await garde(slug);
  const supabase = createSupabaseServerClient();
  await supabase.rpc("marquer_encaisse", { p_adhesion_id: adhesionId });
  redirect(`/${slug}/cockpit/paiements`);
}

// Enregistre un règlement partiel ou total (chèque/espèces). Renvoie le solde restant.
export async function enregistrerReglement(
  slug: string,
  adhesionId: string,
  montantCentimes: number,
  mode: "cheque" | "especes" | "autre",
  note?: string | null
): Promise<{ ok: boolean; soldeCentimes?: number; error?: string }> {
  await garde(slug);
  if (!Number.isFinite(montantCentimes) || montantCentimes <= 0) {
    return { ok: false, error: "Montant invalide." };
  }
  const supabase = createSupabaseServerClient();
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
  await garde(slug);
  if (!Array.isArray(ids) || ids.length === 0) return { ok: false, error: "Aucun chèque sélectionné." };
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("marquer_cheques_remis", { p_ids: ids });
  if (error) {
    console.error("marquer_cheques_remis", error.message);
    return { ok: false, error: "Enregistrement impossible." };
  }
  return { ok: true, nombre: Number(data ?? 0) };
}
