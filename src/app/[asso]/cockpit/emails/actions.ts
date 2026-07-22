"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { exigerPresident } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EMAILS_CONFIG_DEFAUT, type EmailsConfig } from "@/lib/emails-config";

// Réglages des emails automatiques du club — réservés au président.
export async function enregistrerEmailsConfig(slug: string, formData: FormData) {
  const { org } = await exigerPresident(slug);

  // Une case cochée arrive dans le FormData ; décochée, elle est absente. On reconstruit
  // donc explicitement chaque clé, faute de quoi une case décochée resterait à sa
  // valeur précédente.
  const config: EmailsConfig = {
    relance_pieces_30: formData.get("relance_pieces_30") === "on",
    relance_pieces_60: formData.get("relance_pieces_60") === "on",
    relance_pieces_90: formData.get("relance_pieces_90") === "on",
    relance_impaye: formData.get("relance_impaye") === "on",
    recap_hebdo: formData.get("recap_hebdo") === "on",
  };
  void EMAILS_CONFIG_DEFAUT; // (les défauts servent à la lecture, pas à l'écriture)

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("organisations").update({ emails_config: config }).eq("id", org.id);
  if (error) {
    console.error("emails_config", error.message);
    redirect(`/${slug}/cockpit/emails?erreur=1`);
  }
  revalidatePath(`/${slug}/cockpit/emails`);
  redirect(`/${slug}/cockpit/emails?ok=1`);
}
