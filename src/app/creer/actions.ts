"use server";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { envoyerEmail } from "@/lib/resend";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";
import { getTemplate, getMode } from "@/lib/themes";

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
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;

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

  // Logo (optionnel). Après create_club, le président est admin de l'org :
  // la politique storage logos_admin_insert (current_org_id) autorise l'upload.
  const file = logoFd?.get("logo");
  if (file && typeof file === "object" && "size" in file) {
    const f = file as File;
    if (f.size > 0 && f.size <= 2 * 1024 * 1024 && (f.type ?? "").startsWith("image/")) {
      const { data: org } = await supabase.from("organisations").select("id").eq("slug", slug).single();
      if (org) {
        const ext = (f.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
        const path = `${org.id}/logo-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("logos")
          .upload(path, f, { upsert: true, contentType: f.type || undefined });
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

  redirect(`/${slug}`);
}
