import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const lire = (p: string) => readFileSync(p, "utf8");

/**
 * Lot « CR Dance Studio » (26/08/2026) — une personne, plusieurs cours ; et le
 * virement comme mode de règlement à part entière. Tests de source : ils épinglent
 * les invariants qui, s'ils sautaient, casseraient de l'argent réel.
 */

describe("virement — un mode de règlement à part entière", () => {
  const MIG = lire("supabase/migrations/20260826080000_mode_virement.sql");
  const AJOUT = lire("src/app/[asso]/cockpit/adherents/[id]/AjoutReglement.tsx");
  const PAIEMENTS = lire("src/app/[asso]/cockpit/paiements/page.tsx");
  const CLIENT = lire("src/app/[asso]/cockpit/paiements/PaiementsClient.tsx");

  it("la contrainte et la RPC acceptent 'virement', la RPC insère bien v_mode", () => {
    expect(MIG).toMatch(/'cheque', 'especes', 'en_ligne', 'virement', 'autre', 'remboursement'/);
    expect(MIG).toMatch(/p_mode in \('cheque','especes','en_ligne','virement','autre'\)/);
    expect(MIG).toMatch(/values \(v_org, p_adhesion_id, p_montant_centimes, v_mode,/);
  });

  it("la fiche et les encaissements proposent Virement", () => {
    expect(AJOUT).toMatch(/"especes", "cheque", "virement", "autre"/);
    expect(CLIENT).toMatch(/<option value="virement">Virement<\/option>/);
  });

  it("les adhésions déclarées « virement » apparaissent dans Encaissements, avec leur total par mode", () => {
    expect(PAIEMENTS).toMatch(/mode_paiement\.in\.\(cheque,especes,virement\)/);
    expect(PAIEMENTS).toMatch(/virement: "Virements"/);
  });
});

describe("inscrire à un autre cours — geste du bureau, sur la fiche", () => {
  const MIG = lire("supabase/migrations/20260826081000_inscrire_autre_cours.sql");
  const ACTIONS = lire("src/app/[asso]/cockpit/adherents/actions.ts");
  const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");

  it("capacité verrouillée avant comptage, refus explicite — jamais de liste d'attente pour un geste du bureau", () => {
    expect(MIG).toMatch(/verrouiller_cours\(p_cours_id\)/);
    expect(MIG).toMatch(/le cours est complet/);
    expect(MIG).not.toMatch(/'liste_attente'\)\s*\n\s*returning/);
  });

  it("pas de doublon : une adhésion vivante sur ce cours cette saison suffit à refuser", () => {
    expect(MIG).toMatch(/in \('en_attente','paye','en_retard','liste_attente'\)/);
    expect(MIG).toMatch(/Déjà inscrit/);
  });

  it("tarif de la base, rôles vérifiés en base, audit journalisé", () => {
    expect(MIG).toMatch(/a_role_asso\(array\['admin_asso','secretaire'\]\)/);
    expect(MIG).toMatch(/'adhesion_ajoutee'/);
    expect(ACTIONS).toMatch(/export async function inscrireAutreCours/);
    expect(FICHE).toMatch(/Inscrire à un autre cours \(saison en cours\)/);
  });
});

describe("inscription publique multi-cours — un paiement, une écriture par adhésion", () => {
  const MIG = lire("supabase/migrations/20260826082000_register_adherent_multi.sql");
  const ACTIONS = lire("src/app/[asso]/inscription/actions.ts");
  const FORM = lire("src/app/[asso]/inscription/FormulaireInscription.tsx");
  const STRIPE = lire("src/lib/stripe.ts");
  const WEBHOOK = lire("src/app/api/stripe/webhook/route.ts");

  it("le premier cours passe par register_adherent_full (chemin historique, non dupliqué)", () => {
    expect(MIG).toMatch(/register_adherent_full\(p_slug, p_user_id, p_prenom, p_nom, p_email, p_tel, v_premier, p_infos, p_mode\)/);
    expect(MIG).toMatch(/revoke execute on function public\.register_adherent_multi_avec_sante/);
  });

  it("un cours complet met EN LISTE D'ATTENTE (choix de l'adhérent, contrairement au geste du bureau)", () => {
    expect(MIG).toMatch(/if v_occ >= v_places then v_statut := 'liste_attente'; end if;/);
  });

  it("le serveur dédoublonne les cours, plafonne, et refuse les mensualités en multi", () => {
    expect(ACTIONS).toMatch(/Array\.from\(new Set\(formData\.getAll\("cours"\)/);
    expect(ACTIONS).toMatch(/coursIds\.length > 10/);
    expect(ACTIONS).toMatch(/if \(coursIds\.length > 1 && mode === "en_ligne_echeances"\) mode = "en_ligne";/);
  });

  it("le formulaire n'offre les mensualités que pour un seul cours", () => {
    expect(FORM).toMatch(/coursChoisis\.length === 1 \? \(\s*<ChoixEcheances/);
  });

  it("la répartition voyage dans les métadonnées du checkout, bornée à 500 caractères", () => {
    expect(STRIPE).toMatch(/repartition && repartition\.length <= 500/);
  });

  it("le webhook écrit une écriture PAR adhésion, avec une référence propre à chacune", () => {
    expect(WEBHOOK).toMatch(/function parserRepartition/);
    expect(WEBHOOK).toMatch(/`\$\{event\.id\}:\$\{parts\[i\]\.id\}`/);
    // la moindre anomalie de la métadonnée invalide la répartition (repli mono)
    expect(WEBHOOK).toMatch(/return null;\s*\n\s*parts\.push/);
  });

  it("chaque adhésion de la répartition est vérifiée contre le compte connecté", () => {
    expect(WEBHOOK).toMatch(/for \(const p of parts\) await verifierCompte\(admin, p\.id, event\.account!\);/);
  });

  it("un remboursement cible l'adhésion portée par SES métadonnées (multi : payment_intent partagé)", () => {
    expect(STRIPE).toMatch(/if \(adhesionId\) body\.metadata = \{ adhesion_id: adhesionId \};/);
    expect(WEBHOOK).toMatch(/dernier\?\.metadata\?\.adhesion_id \?\? obj\.metadata\?\.adhesion_id/);
  });
});
