"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function inscrireAdherent(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const prenom = String(formData.get("prenom") ?? "");
  const nom = String(formData.get("nom") ?? "");
  const email = String(formData.get("email") ?? "");
  const tel = String(formData.get("tel") ?? "");
  const coursId = String(formData.get("cours") ?? "");

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc("register_adherent", {
    p_slug: slug,
    p_prenom: prenom,
    p_nom: nom,
    p_email: email,
    p_tel: tel,
    p_cours_id: coursId || null,
  });

  if (error) {
    console.error("inscrireAdherent", error.message);
    redirect(`/${slug}/inscription?erreur=1`);
  }
  redirect(`/${slug}/inscription/merci?prenom=${encodeURIComponent(prenom)}`);
}
