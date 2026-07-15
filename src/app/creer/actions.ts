"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/resend";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";
import { getTemplate, getMode } from "@/lib/themes";
import { validerImage } from "@/lib/upload";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";

export interface CreneauInput {
  jour: string;  // "lundi" … "dimanche"
  debut: string; // "18:30"
  fin: string;   // "20:00"
}

export interface CoursInput {
  nom: string;
  public_cible: string | null;
  tarif_centimes: number;
  creneaux: CreneauInput[];
}

export interface CreerInput {
  nom: string;
  template: string;
  mode: string;
  couleur: string;
  adresse?: string;
  email?: string;
  tel?: string;
  cours: CoursInput[];
  accepteCGV?: boolean;
  /** Pré-remplit le formulaire d'inscription avec un modèle adapté (sportive/culturelle). */
  typeAsso?: string;
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Compte créé DEPUIS le wizard (étape COMPTE, juste avant PUBLIER) — sans redirection :
 * le wizard garde la main et enchaîne sur la publication. Les actions de /connexion
 * redirigent, elles ; celles-ci rendent la main au client.
 */
export async function creerCompteWizard(input: {
  email: string;
  password: string;
  prenom: string;
  nom: string;
}): Promise<{ ok?: boolean; confirmation?: boolean; error?: string }> {
  if (input.password.length < LONGUEUR_MIN_MDP) {
    return { error: `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MDP} caractères.` };
  }
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      data: { prenom: input.prenom, nom: input.nom, role: "admin_asso" },
      // Le callback ramène sur /creer : le brouillon du wizard (localStorage) est restauré.
      emailRedirectTo: `${BASE}/auth/callback?next=/creer`,
    },
  });
  if (error) {
    if (/already registered/i.test(error.message)) return { error: "Un compte existe déjà avec cet email. Connectez-vous ci-dessous." };
    if (/Password should be at least/i.test(error.message)) return { error: "Mot de passe trop court." };
    return { error: error.message };
  }
  // Email déjà enregistré : Supabase répond « succès » sans erreur (anti-énumération)
  // mais avec identities vide — et n'envoie AUCUN email. Sans cette garde, on
  // afficherait « Confirmez votre email » à quelqu'un qui n'en recevra jamais
  // (constaté le 13/07/2026 avec un compte existant).
  if (data.user && (data.user.identities?.length ?? 0) === 0) {
    return { error: "Un compte existe déjà avec cet email. Cliquez sur « J'ai déjà un compte » pour vous connecter." };
  }
  // Confirmation d'email exigée par Supabase : pas de session tout de suite.
  if (!data.session) return { confirmation: true };
  return { ok: true };
}

/** Connexion depuis le wizard (le président a déjà un compte) — sans redirection. */
export async function connexionWizard(input: { email: string; password: string }): Promise<{ ok?: boolean; error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) {
    if (/Invalid login credentials/i.test(error.message)) return { error: "Email ou mot de passe incorrect." };
    return { error: error.message };
  }
  return { ok: true };
}

export async function creerClub(input: CreerInput, logoFd?: FormData | null) {
  const nom = (input.nom ?? "").trim();
  if (!nom) throw new Error("Le nom est requis.");
  if (!input.accepteCGV) throw new Error("Vous devez accepter les CGV et le contrat de sous-traitance.");

  const slugBase = nom.toLowerCase().normalize("NFD").replace(/[^a-z0-9]+/g, "");
  const cours = (input.cours ?? [])
    .filter((c) => (c.nom ?? "").trim())
    .slice(0, 30)
    .map((c) => ({
      nom: c.nom.trim().slice(0, 120),
      public_cible: c.public_cible?.trim() || null,
      tarif_centimes: Number.isFinite(c.tarif_centimes) ? Math.max(0, Math.round(c.tarif_centimes)) : 0,
      creneaux: (c.creneaux ?? [])
        .filter((k) => JOURS.includes(k.jour) && HEURE.test(k.debut) && HEURE.test(k.fin))
        .slice(0, 10)
        .map((k) => ({ jour: k.jour, debut: k.debut, fin: k.fin })),
    }));

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_club", {
    p_nom: nom,
    p_template: getTemplate(input.template).id,
    p_mode: getMode(input.mode),
    p_couleur: input.couleur,
    p_adresse: input.adresse ?? "",
    p_email: input.email ?? "",
    p_tel: input.tel ?? "",
    p_accroche: "", // pas d'accroche générique : le hero affiche le nom du club (modifiable ensuite)
    p_slug_base: slugBase,
    p_cours: cours,
  });

  if (error || !data) {
    console.error("creerClub", error?.message);
    throw new Error(error?.message ?? "Création impossible.");
  }
  const slug = data as string;

  // Formulaire d'inscription pré-rempli selon le type d'association : le président
  // découvre un formulaire complet (urgence, autorisations, pièces) au lieu d'une
  // page vide — tout reste modifiable dans l'Atelier. Non bloquant.
  if (input.typeAsso === "sportive" || input.typeAsso === "culturelle") {
    try {
      const { formulaireType } = await import("@/lib/formulaires-types");
      const { error: fcErr } = await supabase
        .from("organisations")
        .update({ form_config: formulaireType(input.typeAsso) })
        .eq("slug", slug);
      if (fcErr) console.error("form_config type", fcErr.message);
    } catch (e) {
      console.error("form_config type", e);
    }
  }

  // Logo (optionnel). Après create_club, le président est admin de l'org :
  // la politique storage logos_admin_insert (current_org_id) autorise l'upload.
  const file = logoFd?.get("logo");
  if (file && typeof file === "object" && "size" in file && (file as File).size > 0) {
    const f = file as File;
    // Validation par octets réels (3 Mo max) : ni SVG, ni fichier renommé.
    const v = await validerImage(f, 3);
    if (v.ok) {
      const { data: org } = await supabase.from("organisations").select("id").eq("slug", slug).single();
      if (org) {
        const path = `${org.id}/logo-${Date.now()}.${v.ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, f, { upsert: true, contentType: v.contentType });
        if (upErr) {
          console.error("upload logo", upErr.message); // le club est créé, on n'échoue pas pour un logo
        } else {
          const url = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
          await supabase.from("organisations").update({ logo_url: url }).eq("id", org.id);
        }
      }
    }
  }

  // Email de bienvenue au président (non bloquant).
  try {
    const { data: u } = await supabase.auth.getUser();
    const emailPresident = u.user?.email;
    if (emailPresident) {
      await envoyerEmail({
        to: emailPresident,
        objet: `${nom} est en ligne`,
        texte:
          `Bonjour,\n\n` +
          `Votre club est en ligne. Voici vos trois adresses :\n\n` +
          `Le site de votre club :\n${BASE}/${slug}\n\n` +
          `Votre cockpit (l'état du club, chaque jour) :\n${BASE}/${slug}/cockpit\n\n` +
          `Le lien d'inscription à partager à vos adhérents :\n${BASE}/${slug}/inscription\n\n` +
          `Prochaines étapes, quand vous voulez : connectez Stripe depuis le cockpit pour encaisser en ligne (0 % de commission), ` +
          `ajustez votre page avec le bouton Modifier, et partagez le lien d'inscription.\n\n` +
          `Bonne saison,\nKlubster — klubster.fr`,
      });
    }
  } catch (e) {
    console.error("email bienvenue", e);
  }

  // Vers le Cockpit, pas la vitrine : c'est là que tout se passe désormais, et le
  // bloc « Premiers pas » y attend le président (avec le lien « Voir mon site »
  // pour le moment de fierté). ?bienvenue=1 déclenche le message de confirmation.
  redirect(`/${slug}/cockpit?bienvenue=1`);
}
