import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface Profile {
  id: string;
  organisation_id: string | null;
  email: string | null;
  prenom: string | null;
  nom: string | null;
  role: string;
}

export async function getUser() {
  const supabase = createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export async function getProfile(): Promise<Profile | null> {
  const supabase = createSupabaseServerClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  return (data as Profile | null) ?? null;
}
