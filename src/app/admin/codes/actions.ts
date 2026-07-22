"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifierSuperAdmin } from "@/lib/admin";
import { creerCodePromo, basculerCodePromo, type NouveauCodePromo } from "@/lib/stripe";

// Toutes les actions de cette page écrivent chez Stripe (compte plateforme) : réservées
// au super-admin, comme le reste de la console.

export async function creerCodePromoAction(formData: FormData) {
  const profile = await verifierSuperAdmin();
  if (!profile) redirect("/");

  const type = String(formData.get("type") ?? "gratuit") as NouveauCodePromo["type"];
  const duree = String(formData.get("duree") ?? "once") as NouveauCodePromo["duree"];
  const valeurBrute = Number(String(formData.get("valeur") ?? "0").replace(",", "."));

  const opts: NouveauCodePromo = {
    code: String(formData.get("code") ?? ""),
    type,
    valeur: Number.isFinite(valeurBrute) ? valeurBrute : 0,
    duree,
    dureeMois: Number(formData.get("duree_mois") ?? 12),
    maxUtilisations: formData.get("max") ? Number(formData.get("max")) : null,
    expireLe: String(formData.get("expire") ?? "").trim() || null,
  };

  try {
    const cree = await creerCodePromo(opts);
    revalidatePath("/admin/codes");
    redirect(`/admin/codes?ok=${encodeURIComponent(cree.code)}`);
  } catch (e) {
    // `redirect()` lève NEXT_REDIRECT : on ne l'attrape pas, on le laisse remonter.
    if (e && typeof e === "object" && "digest" in e && String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    const msg = e instanceof Error ? e.message : "Création impossible.";
    redirect(`/admin/codes?erreur=${encodeURIComponent(msg)}`);
  }
}

export async function basculerCodePromoAction(id: string, actif: boolean) {
  const profile = await verifierSuperAdmin();
  if (!profile) redirect("/");
  try {
    await basculerCodePromo(id, actif);
  } catch (e) {
    console.error("basculerCodePromo", e);
  }
  revalidatePath("/admin/codes");
  redirect("/admin/codes");
}
