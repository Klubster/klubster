"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";

/**
 * `next` vient de l'URL : sans contrôle, `?next=https://exemple-malveillant.fr` renverrait
 * l'utilisateur fraîchement authentifié vers un site tiers (redirection ouverte → hameçonnage).
 * On n'accepte qu'un chemin interne : commence par « / », jamais par « // » ni « /\ ».
 */
function destinationSure(next: string | undefined): string {
  if (!next || !next.startsWith("/")) return "/creer";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/creer";
  return next;
}

export async function connexion(input: { email: string; password: string; next?: string }): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) return { error: traduire(error.message) };
  redirect(destinationSure(input.next));
}

export async function inscription(input: {
  email: string; password: string; prenom: string; nom: string; next?: string;
}): Promise<{ error?: string; message?: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { prenom: input.prenom, nom: input.nom, role: "admin_asso" }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.vercel.app"}/auth/callback` },
  });
  if (error) return { error: traduire(error.message) };
  if (!data.session) return { message: "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous." };
  redirect(destinationSure(input.next));
}

/**
 * Mot de passe oublié. Sans ce parcours, un président qui perd son mot de passe est
 * définitivement enfermé dehors — et avec lui les dossiers de tous ses adhérents.
 *
 * On répond toujours la même chose, que le compte existe ou non : révéler qu'une adresse
 * est inscrite permettrait d'énumérer les présidents d'associations.
 */
export async function motDePasseOublie(email: string): Promise<{ message: string }> {
  const propre = email.trim();
  const reponse = {
    message: "Si un compte existe pour cette adresse, un lien de réinitialisation vient d’être envoyé.",
  };
  if (!propre || !propre.includes("@")) return reponse;

  const supabase = createSupabaseServerClient();
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";
  const { error } = await supabase.auth.resetPasswordForEmail(propre, {
    redirectTo: `${base}/auth/callback?next=/connexion/nouveau-mot-de-passe`,
  });
  if (error) console.error("motDePasseOublie", error.message);
  return reponse;
}

/** Applique le nouveau mot de passe, une fois la session de récupération établie. */
export async function definirNouveauMotDePasse(password: string): Promise<{ error?: string }> {
  if (password.length < LONGUEUR_MIN_MDP) return { error: `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MDP} caractères.` };
  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Lien expiré. Demandez un nouveau lien de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduire(error.message) };
  redirect("/connexion?message=motdepasse");
}

export async function deconnexion() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

function traduire(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/Password should be at least/i.test(msg)) return `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MDP} caractères.`;
  return msg;
}
