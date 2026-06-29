"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function connexion(input: { email: string; password: string; next?: string }): Promise<{ error?: string }> {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email: input.email, password: input.password });
  if (error) return { error: traduire(error.message) };
  redirect(input.next || "/creer");
}

export async function inscription(input: {
  email: string; password: string; prenom: string; nom: string; next?: string;
}): Promise<{ error?: string; message?: string }> {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: { data: { prenom: input.prenom, nom: input.nom, role: "admin_asso" } },
  });
  if (error) return { error: traduire(error.message) };
  if (!data.session) return { message: "Compte créé. Vérifiez votre email pour confirmer, puis connectez-vous." };
  redirect(input.next || "/creer");
}

export async function deconnexion() {
  const supabase = createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/");
}

function traduire(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return "Email ou mot de passe incorrect.";
  if (/already registered/i.test(msg)) return "Un compte existe déjà avec cet email.";
  if (/Password should be at least/i.test(msg)) return "Le mot de passe doit faire au moins 6 caractères.";
  return msg;
}
