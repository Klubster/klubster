"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saisonCourante } from "@/lib/saison";
import { peut } from "@/lib/roles";
import { rembourser } from "@/lib/stripe";
import { compteConnecte } from "@/lib/stripe-org";
import type { Organisation } from "@/types/db";

async function garde(slug: string): Promise<Organisation> {
  const org = await getOrganisationBySlug(slug);
  if (!org) redirect("/");
  const p = await getProfile();
  if (!p || (p.organisation_id !== org.id && p.role !== "super_admin")) {
    redirect(`/connexion?next=/${slug}/cockpit/adherents`);
  }
  return org;
}

const texte = (fd: FormData, nom: string, max: number) =>
  String(fd.get(nom) ?? "").trim().slice(0, max) || null;

/**
 * Modifier la fiche d'un adhérent.
 *
 * On ne fait jamais confiance à l'`adherentId` du formulaire : la mise à jour est filtrée
 * par `organisation_id`, sinon un président pourrait éditer l'adhérent d'un autre club en
 * changeant un identifiant dans le HTML.
 */
export async function modifierAdherent(slug: string, adherentId: string, formData: FormData) {
  const org = await garde(slug);

  const prenom = texte(formData, "prenom", 80);
  const nom = texte(formData, "nom", 80);
  if (!prenom || !nom) redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=nom`);

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("adherents")
    .update({
      prenom,
      nom,
      email: texte(formData, "email", 160),
      telephone: texte(formData, "telephone", 30),
    })
    .eq("id", adherentId)
    .eq("organisation_id", org.id);

  if (error) {
    console.error("modifierAdherent", error.message);
    redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=enregistrement`);
  }

  revalidatePath(`/${slug}/cockpit/adherents`);
  revalidatePath(`/${slug}/cockpit/adherents/${adherentId}`);
  redirect(`/${slug}/cockpit/adherents/${adherentId}?ok=1`);
}

/**
 * Ajouter un adhérent à la main.
 *
 * Le cas est constant : quelqu'un s'inscrit sur papier au forum des associations, ou par
 * téléphone. Sans cette porte, le bénévole ressaisit tout dans un tableur — précisément
 * ce que Klubster prétend supprimer.
 *
 * Le tarif vient de la base, jamais du formulaire : sinon on pourrait s'inscrire à 0 €.
 */
export async function ajouterAdherent(slug: string, formData: FormData) {
  const org = await garde(slug);

  const prenom = texte(formData, "prenom", 80);
  const nom = texte(formData, "nom", 80);
  if (!prenom || !nom) redirect(`/${slug}/cockpit/adherents/nouveau?erreur=nom`);

  const coursId = texte(formData, "cours", 40);
  const supabase = createSupabaseServerClient();

  const { data: adherent, error } = await supabase
    .from("adherents")
    .insert({
      organisation_id: org.id,
      prenom,
      nom,
      email: texte(formData, "email", 160),
      telephone: texte(formData, "telephone", 30),
    })
    .select("id")
    .single();

  if (error || !adherent) {
    console.error("ajouterAdherent", error?.message);
    redirect(`/${slug}/cockpit/adherents/nouveau?erreur=enregistrement`);
  }

  if (coursId) {
    const { data: cours } = await supabase
      .from("cours")
      .select("tarif_centimes")
      .eq("id", coursId)
      .eq("organisation_id", org.id)
      .maybeSingle();

    if (cours) {
      await supabase.from("adhesions").insert({
        organisation_id: org.id,
        adherent_id: adherent.id,
        cours_id: coursId,
        saison: saisonCourante(org),
        montant_centimes: (cours as { tarif_centimes: number }).tarif_centimes,
        statut: "en_attente",
        mode_paiement: texte(formData, "mode", 20),
      });
    }
  }

  revalidatePath(`/${slug}/cockpit/adherents`);
  redirect(`/${slug}/cockpit/adherents/${adherent.id}?ok=1`);
}

export interface LigneImport {
  prenom: string;
  nom: string;
  email?: string | null;
  telephone?: string | null;
  coursId?: string | null;
}

export interface ResultatImport {
  crees: number;
  ignores: number;
  erreurs: string[];
}

const MAX_LIGNES = 2000;

/**
 * Import d'adhérents depuis un CSV.
 *
 * Le CSV est lu et mis en correspondance dans le navigateur ; le serveur ne reçoit que des
 * lignes déjà structurées, qu'il revalide entièrement. On ne fait pas confiance au client :
 * ni au `coursId` (vérifié contre l'organisation), ni au nombre de lignes, ni aux doublons.
 *
 * Les doublons sont ignorés, jamais écrasés. Écraser une fiche existante à l'import, c'est
 * effacer un numéro de téléphone corrigé à la main sans que personne ne le sache.
 */
export async function importerAdherents(slug: string, lignes: LigneImport[]): Promise<ResultatImport> {
  const org = await garde(slug);
  const erreurs: string[] = [];

  if (!Array.isArray(lignes) || lignes.length === 0) {
    return { crees: 0, ignores: 0, erreurs: ["Aucune ligne à importer."] };
  }
  if (lignes.length > MAX_LIGNES) {
    return { crees: 0, ignores: 0, erreurs: [`Trop de lignes (${lignes.length}). Maximum ${MAX_LIGNES} par import.`] };
  }

  const supabase = createSupabaseServerClient();

  // Les cours autorisés — un identifiant venu du client ne suffit pas.
  const { data: coursOrg } = await supabase
    .from("cours")
    .select("id, tarif_centimes")
    .eq("organisation_id", org.id);
  const tarifs = new Map((coursOrg ?? []).map((c) => [c.id as string, c.tarif_centimes as number]));

  // Adhérents déjà présents : on compare sur l'email, puis sur prénom+nom.
  const { data: existants } = await supabase
    .from("adherents")
    .select("email, prenom, nom")
    .eq("organisation_id", org.id);

  const cle = (p: string, n: string) => `${p.trim().toLowerCase()}|${n.trim().toLowerCase()}`;
  const emailsPris = new Set(
    (existants ?? []).map((a) => (a.email ?? "").trim().toLowerCase()).filter(Boolean)
  );
  const nomsPris = new Set((existants ?? []).map((a) => cle(a.prenom ?? "", a.nom ?? "")));

  const aCreer: Array<{ ligne: LigneImport; index: number }> = [];
  let ignores = 0;

  lignes.forEach((l, i) => {
    const prenom = String(l.prenom ?? "").trim().slice(0, 80);
    const nom = String(l.nom ?? "").trim().slice(0, 80);
    if (!prenom || !nom) {
      erreurs.push(`Ligne ${i + 2} : prénom ou nom manquant — ignorée.`);
      ignores++;
      return;
    }

    const email = String(l.email ?? "").trim().toLowerCase().slice(0, 160);
    if (email && emailsPris.has(email)) {
      ignores++;
      return;
    }
    if (!email && nomsPris.has(cle(prenom, nom))) {
      ignores++;
      return;
    }

    // Doublons à l'intérieur du fichier lui-même.
    if (email) emailsPris.add(email);
    nomsPris.add(cle(prenom, nom));

    aCreer.push({ ligne: { ...l, prenom, nom, email: email || null }, index: i });
  });

  if (aCreer.length === 0) return { crees: 0, ignores, erreurs };

  // Adhérent + adhésion créés ensemble dans une seule transaction (RPC) : un échec
  // en cours de route annule tout, plus d'adhérents orphelins sans adhésion.
  const rows = aCreer.map(({ ligne }) => ({
    prenom: ligne.prenom,
    nom: ligne.nom,
    email: ligne.email,
    telephone: String(ligne.telephone ?? "").trim().slice(0, 30) || null,
    // On ne transmet le cours que s'il appartient au club (tarif re-vérifié en base).
    cours_id: ligne.coursId && tarifs.has(ligne.coursId) ? ligne.coursId : null,
  }));

  const { data: crees, error } = await supabase.rpc("inserer_adherents_adhesions", {
    p_org: org.id,
    p_rows: rows,
  });

  if (error) {
    console.error("inserer_adherents_adhesions", error.message);
    return { crees: 0, ignores, erreurs: [...erreurs, "L’import a échoué. Aucun adhérent n’a été créé."] };
  }

  revalidatePath(`/${slug}/cockpit/adherents`);
  return { crees: Number(crees ?? 0), ignores, erreurs };
}

/**
 * Renouveler la saison : crée une adhésion pour la saison courante à chaque adhérent qui
 * n'en a pas encore, en reprenant son dernier cours. Les adhérents ne sont pas recréés,
 * l'historique reste. Idempotent : relancer ne crée pas de doublon.
 */
export async function renouvelerSaison(slug: string) {
  const org = await garde(slug);
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("renouveler_saison", { p_org: org.id });
  if (error) {
    console.error("renouvelerSaison", error.message);
    redirect(`/${slug}/cockpit/adherents?erreur=renouvellement`);
  }
  revalidatePath(`/${slug}/cockpit/adherents`);
  redirect(`/${slug}/cockpit/adherents?renouvelees=${Number(data ?? 0)}`);
}

/**
 * Droit à l'effacement : anonymise l'adhérent (données personnelles et de santé supprimées),
 * en conservant les écritures comptables. Réservé au président.
 */
export async function anonymiserAdherent(slug: string, adherentId: string) {
  const org = await garde(slug);
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("anonymiser_adherent", { p_adherent_id: adherentId });
  if (error) {
    console.error("anonymiserAdherent", error.message);
    redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=anonymisation`);
  }
  revalidatePath(`/${slug}/cockpit/adherents`);
  redirect(`/${slug}/cockpit/adherents?anonymise=1`);
  void org;
}

/**
 * Rembourser un paiement en ligne depuis le cockpit (président ou trésorier).
 *
 * On ne fait qu'ordonner le remboursement à Stripe, sur le compte connecté du club et pour
 * le paiement mémorisé à l'encaissement. L'écriture comptable n'est pas posée ici : c'est le
 * webhook `charge.refunded` qui l'enregistre, une seule fois — que le remboursement parte
 * d'ici ou du tableau de bord Stripe. Le montant est plafonné au montant de l'adhésion.
 */
export async function rembourserEnLigne(slug: string, adherentId: string, adhesionId: string, formData: FormData) {
  const org = await garde(slug);
  const p = await getProfile();
  if (!p || !peut(p.role, "paiements")) redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=acces`);

  const supabase = createSupabaseServerClient();
  const { data: adh } = await supabase
    .from("adhesions")
    .select("id, stripe_payment_intent, montant_centimes")
    .eq("id", adhesionId)
    .eq("organisation_id", org.id)
    .maybeSingle();

  const pi = adh?.stripe_payment_intent as string | null | undefined;
  if (!pi) redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=remboursement_impossible`);

  const account = compteConnecte(org);
  if (!account) redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=remboursement_impossible`);

  // Montant vide → remboursement total ; sinon on borne au montant de l'adhésion.
  const brut = String(formData.get("montant") ?? "").replace(",", ".").trim();
  let montantCentimes: number | undefined;
  if (brut) {
    const n = Math.round(parseFloat(brut) * 100);
    const max = (adh?.montant_centimes as number | null) ?? 0;
    if (!Number.isFinite(n) || n <= 0 || (max > 0 && n > max)) {
      redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=montant`);
    }
    montantCentimes = n;
  }

  try {
    await rembourser(pi, account, montantCentimes);
  } catch (e) {
    console.error("rembourserEnLigne", e instanceof Error ? e.message : e);
    redirect(`/${slug}/cockpit/adherents/${adherentId}?erreur=remboursement`);
  }

  revalidatePath(`/${slug}/cockpit/adherents/${adherentId}`);
  redirect(`/${slug}/cockpit/adherents/${adherentId}?rembourse=1`);
}

/** Marquer une pièce comme reçue (ou de nouveau manquante) depuis la fiche. */
export async function basculerPiece(slug: string, adherentId: string, pieceId: string, statut: string) {
  const org = await garde(slug);
  const supabase = createSupabaseServerClient();
  const nouveau = statut === "recue" ? "manquante" : "recue";

  const { error } = await supabase
    .from("pieces_adherent")
    .update({ statut: nouveau })
    .eq("id", pieceId)
    .eq("adherent_id", adherentId) // sinon un id de pièce d'un autre adhérent (même club) passerait
    .eq("organisation_id", org.id);

  if (error) console.error("basculerPiece", error.message);
  revalidatePath(`/${slug}/cockpit/adherents/${adherentId}`);
  redirect(`/${slug}/cockpit/adherents/${adherentId}`);
}
