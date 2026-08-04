"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { destinationApresConnexion } from "@/lib/auth";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";
import { destinationSure } from "@/lib/redirection";

// La règle vit dans lib/redirection.ts : un fichier « use server » n'exporte que des
// fonctions async, ce qui la rendait intestable là où elle était.

export async function connexion(input: { email: string; password: string; next?: string }): Promise<{ error?: string }> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) return { error: traduire(error.message) };
  // Sans `?next=`, on renvoie l'utilisateur chez lui plutôt que vers l'assistant de
  // création — voir destinationApresConnexion().
  redirect(destinationSure(input.next, await destinationApresConnexion()));
}

export async function inscription(input: {
  email: string; password: string; prenom: string; nom: string; next?: string;
}): Promise<{ error?: string; message?: string }> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { prenom: input.prenom, nom: input.nom, role: "admin_asso" }, emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr"}/auth/callback` },
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

  const supabase = await createSupabaseServerClient();
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
  const supabase = await createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Lien expiré. Demandez un nouveau lien de réinitialisation." };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: traduire(error.message) };
  redirect("/connexion?message=motdepasse");
}

export async function deconnexion() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

/**
 * Toute erreur d'authentification passe ici avant l'écran. GoTrue répond en anglais
 * technique (« Email address "…" is invalid ») : montré tel quel à un bénévole, c'est
 * illisible et ça ressemble à une panne. Vu en test le 02/08 sur l'onglet Créer un
 * compte. Le repli est volontairement générique : jamais le message brut à l'écran —
 * il part dans les journaux serveur, où il est utile.
 */
function traduire(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered|already been registered/i.test(msg)) return "Un compte existe déjà avec cet email. Connectez-vous, ou utilisez « Mot de passe oublié ? ».";
  if (/Password should be at least/i.test(msg)) return `Le mot de passe doit faire au moins ${LONGUEUR_MIN_MDP} caractères.`;
  if (/is invalid|Unable to validate email|invalid format/i.test(msg)) return "Cette adresse email ne semble pas valide. Vérifiez-la (exemple : prenom@monclub.fr).";
  if (/Email not confirmed/i.test(msg)) return "Votre email n’est pas encore confirmé. Ouvrez le message que nous vous avons envoyé, puis reconnectez-vous.";
  if (/rate limit|For security purposes|too many requests/i.test(msg)) return "Trop de tentatives rapprochées. Patientez une minute, puis réessayez.";
  if (/signup.*disabled/i.test(msg)) return "Les créations de compte sont momentanément suspendues. Réessayez un peu plus tard.";
  if (/fetch|network|timeout/i.test(msg)) return "Le serveur n’a pas répondu. Vérifiez votre connexion et réessayez.";
  console.error("auth non traduit:", msg);
  return "Une erreur est survenue. Réessayez ; si cela persiste, écrivez-nous depuis la page d’accueil.";
}
