"use server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LigneImport {
  prenom: string;
  nom: string;
  email?: string;
  telephone?: string;
  date_naissance?: string; // AAAA-MM-JJ
  infos?: Record<string, string>;
}

/**
 * Import CSV des adhérents — la promesse de la home (« Importez votre fichier »)
 * enfin tenue. V1 : fiches adhérents (identité, contact, naissance, colonnes
 * libres dans infos). Les adhésions/cours restent gérés ensuite au cockpit.
 * Dédoublonnage par email au sein du club : on n'écrase jamais une fiche existante.
 */
export async function importerAdherents(
  slug: string,
  lignes: LigneImport[]
): Promise<{ importes?: number; ignores?: number; error?: string }> {
  const org = await getOrganisationBySlug(slug);
  const profile = await getProfile();
  if (!org || !profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    return { error: "Non autorisé." };
  }
  if (!Array.isArray(lignes) || lignes.length === 0) return { error: "Aucune ligne à importer." };
  if (lignes.length > 2000) return { error: "2 000 lignes maximum par import — découpez votre fichier." };

  const supabase = createSupabaseServerClient();

  // Emails déjà présents dans le club (pour ignorer les doublons).
  const { data: existants } = await supabase
    .from("adherents")
    .select("email")
    .eq("organisation_id", org.id)
    .not("email", "is", null);
  const emailsExistants = new Set(
    ((existants ?? []) as { email: string | null }[]).map((e) => (e.email ?? "").toLowerCase()).filter(Boolean)
  );

  const vusDansFichier = new Set<string>();
  const aInserer: {
    organisation_id: string;
    prenom: string;
    nom: string;
    email: string | null;
    telephone: string | null;
    date_naissance: string | null;
    infos: Record<string, string>;
  }[] = [];
  let ignores = 0;

  for (const l of lignes) {
    const prenom = String(l.prenom ?? "").trim().slice(0, 80);
    const nom = String(l.nom ?? "").trim().slice(0, 80);
    if (!prenom || !nom) {
      ignores++;
      continue;
    }
    const email = String(l.email ?? "").trim().toLowerCase().slice(0, 160) || null;
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      ignores++;
      continue;
    }
    if (email && (emailsExistants.has(email) || vusDansFichier.has(email))) {
      ignores++;
      continue;
    }
    if (email) vusDansFichier.add(email);
    const dn = String(l.date_naissance ?? "").trim();
    const infos: Record<string, string> = {};
    for (const [k, v] of Object.entries(l.infos ?? {})) {
      const cle = String(k).trim().slice(0, 80);
      const val = String(v).trim().slice(0, 300);
      if (cle && val) infos[cle] = val;
    }
    aInserer.push({
      organisation_id: org.id,
      prenom,
      nom,
      email,
      telephone: String(l.telephone ?? "").trim().slice(0, 30) || null,
      date_naissance: /^\d{4}-\d{2}-\d{2}$/.test(dn) ? dn : null,
      infos,
    });
  }

  let importes = 0;
  for (let i = 0; i < aInserer.length; i += 200) {
    const lot = aInserer.slice(i, i + 200);
    const { error } = await supabase.from("adherents").insert(lot);
    if (error) {
      console.error("importerAdherents", error.message);
      return {
        importes,
        ignores,
        error: importes > 0 ? `L'import s'est arrêté après ${importes} fiches : ${error.message}` : error.message,
      };
    }
    importes += lot.length;
  }

  return { importes, ignores };
}
