import { NextResponse } from "next/server";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { peut } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { etatFinancier, libelleFinancier } from "@/lib/finances";
import { fichierCsv } from "@/lib/csv-export";

export const dynamic = "force-dynamic";
export const preferredRegion = "cdg1";

/**
 * Export CSV des adhérents du club — réversibilité et portabilité (RGPD art. 20).
 * Un club doit pouvoir repartir avec ses données sans rien demander à personne.
 *
 * Réservé aux administrateurs de l'association (ou au super-admin). **Aucune donnée
 * de santé n'est exportée** : le questionnaire reste dans le dossier de l'adhérent.
 *
 * CE QUE L'EXPORT DOIT PORTER (lot P, 04/08/2026). La version précédente sortait dix
 * colonnes : identité, cours, saison, statut, montant dû. Un club qui repartait avec ce
 * fichier perdait, sans le savoir :
 *   — l'ÂGE de ses adhérents (pas de date de naissance) : impossible de savoir qui est
 *     mineur, donc de reconstituer les autorisations parentales ;
 *   — les FAMILLES (pas d'email de responsable légal) : dans un club de jeunes, c'est
 *     l'essentiel du carnet d'adresses qui disparaît ;
 *   — l'ARGENT RÉELLEMENT ENCAISSÉ : seul le montant dû figurait, jamais le réglé ni le
 *     reste. Le club repartait sans savoir qui devait quoi ;
 *   — l'ÉTAT DES DOSSIERS (pièces manquantes) ;
 *   — les OPPOSITIONS aux communications, qu'il aurait alors piétinées ailleurs.
 * « L'export complet de vos données », affiché sur la home et la page tarifs, n'était
 * donc pas vrai. Il l'est maintenant, dans les limites documentées ci-dessous.
 *
 * LIMITES ASSUMÉES : les pièces sont décrites (attendues, manquantes), les FICHIERS
 * déposés ne sont pas inclus — ils se téléchargent depuis chaque dossier. Les présences
 * ne sont pas exportées ici. C'est écrit tel quel dans docs/regle-export.md, et les
 * pages publiques ne doivent pas promettre davantage.
 */

const eur = (c: number | null | undefined) =>
  c == null ? "" : (c / 100).toFixed(2).replace(".", ",");

const CLE_RESPONSABLE = "Responsable légal — email";

export async function GET(_req: Request, props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const slug = params.asso;
  const org = await getOrganisationBySlug(slug);
  const profil = await getProfile();

  if (!org || !profil || (profil.organisation_id !== org.id && profil.role !== "super_admin")) {
    // On ne révèle pas l'existence du club à un visiteur non autorisé.
    return new NextResponse("Introuvable.", { status: 404 });
  }
  // Emporter le fichier complet des adhérents — noms, emails, téléphones — n'est pas
  // une lecture ordinaire. Un encadrant ou un accès en lecture seule pouvait le faire
  // en appelant l'URL directement (relevé à l'audit du 21/07/2026).
  if (!(peut(profil.role, "adherents_ecriture") || peut(profil.role, "paiements"))) {
    return new NextResponse("Introuvable.", { status: 404 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("adherents")
    .select(
      "id, prenom, nom, email, telephone, date_naissance, infos, opposition_communications, created_at, " +
        "adhesions(id, saison, statut, montant_centimes, mode_paiement, created_at, cours(nom), reglements(montant_centimes, mode)), " +
        "pieces_adherent(label, statut, obligatoire)"
    )
    .eq("organisation_id", org.id)
    .order("nom", { ascending: true });

  if (error) {
    console.error("export adherents", error.message);
    return new NextResponse("Export indisponible.", { status: 500 });
  }

  type Reglement = { montant_centimes: number; mode: string | null };
  type Adhesion = {
    id: string;
    saison: string | null;
    statut: string | null;
    montant_centimes: number | null;
    mode_paiement: string | null;
    created_at: string | null;
    cours: { nom: string } | null;
    reglements: Reglement[] | null;
  };
  type Piece = { label: string | null; statut: string | null; obligatoire: boolean | null };
  type Ligne = {
    id: string;
    prenom: string;
    nom: string;
    email: string | null;
    telephone: string | null;
    date_naissance: string | null;
    infos: Record<string, string> | null;
    opposition_communications: string | null;
    created_at: string;
    adhesions: Adhesion[] | null;
    pieces_adherent: Piece[] | null;
  };

  const entetes = [
    "Identifiant",
    "Prénom",
    "Nom",
    "Email",
    "Téléphone",
    "Date de naissance",
    "Mineur",
    "Email du responsable légal",
    "Opposition aux communications",
    "Inscrit le",
    "Cours",
    "Saison",
    "Statut de l'adhésion",
    "Montant dû (€)",
    "Montant réglé (€)",
    "Reste à payer (€)",
    "État financier",
    "Mode de paiement",
    "Règlements (détail)",
    "Pièces obligatoires manquantes",
    "Pièces fournies",
  ];
  const lignes: string[][] = [entetes];

  const estMineur = (d: string | null) => {
    if (!d) return "";
    const n = new Date(d);
    if (Number.isNaN(n.getTime())) return "";
    const seuil = new Date();
    seuil.setFullYear(seuil.getFullYear() - 18);
    return n > seuil ? "oui" : "non";
  };

  for (const a of (data ?? []) as unknown as Ligne[]) {
    const pieces = a.pieces_adherent ?? [];
    // Règle produit du 04/08 : une pièce FACULTATIVE manquante ne compte pas.
    const manquantes = pieces.filter((p) => p.statut === "manquante" && p.obligatoire).map((p) => p.label ?? "");
    const fournies = pieces.filter((p) => p.statut !== "manquante").map((p) => p.label ?? "");

    const adhesions = a.adhesions?.length ? a.adhesions : [null];
    for (const ad of adhesions) {
      const regs = ad?.reglements ?? [];
      // Le même calcul que le cockpit et la fiche — `etatFinancier` est LA source.
      const bilan = ad
        ? etatFinancier({
            montantCentimes: ad.montant_centimes ?? 0,
            statut: ad.statut ?? "en_attente",
            reglementsCentimes: regs.map((r) => r.montant_centimes),
          })
        : null;

      lignes.push(
        [
          a.id,
          a.prenom,
          a.nom,
          a.email,
          a.telephone,
          a.date_naissance ?? "",
          estMineur(a.date_naissance),
          a.infos?.[CLE_RESPONSABLE] ?? "",
          a.opposition_communications ? a.opposition_communications.slice(0, 10) : "",
          a.created_at?.slice(0, 10),
          ad?.cours?.nom ?? "",
          ad?.saison ?? "",
          ad?.statut ?? "",
          eur(ad?.montant_centimes),
          bilan ? eur(bilan.regleCentimes) : "",
          bilan ? eur(bilan.resteCentimes) : "",
          bilan ? libelleFinancier(bilan.etat) : "",
          ad?.mode_paiement ?? "",
          regs.map((r) => `${eur(r.montant_centimes)} (${r.mode ?? "?"})`).join(" | "),
          manquantes.join(" | "),
          fournies.join(" | "),
        ].map((v) => (v == null ? "" : String(v)))
      );
    }
  }

  // BOM UTF-8 : sans lui, Excel massacre les accents.
  // CRLF : Excel et LibreOffice acceptent les deux, mais CRLF est ce qu'attend Excel
  // sous Windows pour les cellules multi-lignes.
  const csv = fichierCsv(lignes);
  const nomFichier = `adherents-${org.slug}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${nomFichier}"`,
      "Cache-Control": "no-store",
    },
  });
}
