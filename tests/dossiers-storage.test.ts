import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const ACTIONS = lire("src/app/[asso]/cockpit/adherents/actions.ts");
const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");
const ESPACE = lire("src/app/[asso]/espace/page.tsx");
const MIGRATION = lire("supabase/migrations/20260804100000_storage_pieces_par_role.sql");

describe("dossiers — le bénévole peut déposer une pièce (promesse publique)", () => {
  it("l'action existe, avec les mêmes garanties que le dépôt adhérent", () => {
    expect(ACTIONS).toMatch(/export async function deposerPieceCockpit/);
    // validation par les premiers octets, 5 Mo — la même fonction que l'espace
    expect(ACTIONS).toMatch(/await validerDocument\(fichier as File, 5\)/);
    // chemin construit côté serveur : organisation puis adhérent, jamais le navigateur
    expect(ACTIONS).toMatch(/\$\{org\.id\}\/\$\{adherentId\}\/\$\{crypto\.randomUUID\(\)\}/);
    // écriture Storage par le client dédié (règle de la panne du 21-28/07)
    expect(ACTIONS).toMatch(/createSupabaseStorageClient\(\)/);
    // jamais d'écrasement : deux dépôts, deux objets
    expect(ACTIONS).toMatch(/upsert: false/);
  });

  it("la pièce est vérifiée dans CE club pour CET adhérent avant tout dépôt", () => {
    const fn = ACTIONS.slice(ACTIONS.indexOf("deposerPieceCockpit"));
    expect(fn).toMatch(/\.eq\("adherent_id", adherentId\)\s*\n\s*\.eq\("organisation_id", org\.id\)/);
  });

  it("la fiche propose le dépôt, et « Remplacer » quand un fichier existe déjà", () => {
    expect(FICHE).toMatch(/deposerPieceCockpit\.bind/);
    expect(FICHE).toMatch(/Remplacer le fichier/);
    expect(FICHE).toMatch(/Déposer pour l’adhérent/);
    expect(FICHE).toMatch(/accept="application\/pdf,image\/png,image\/jpeg"/);
  });
});

describe("dossiers — « reçue par email » existe enfin", () => {
  it("l'action écrit le statut par_email, réversible d'un clic", () => {
    expect(ACTIONS).toMatch(/export async function marquerPieceParEmail/);
    expect(ACTIONS).toMatch(/statutActuel === "par_email" \? "manquante" : "par_email"/);
  });

  it("la fiche et l'espace adhérent affichent l'état en toutes lettres", () => {
    expect(FICHE).toMatch(/Reçue par email/);
    expect(ESPACE).toMatch(/REÇUE PAR EMAIL/);
  });

  it("une pièce reçue par email ne réclame pas de dépôt à l'adhérent", () => {
    expect(ESPACE).toMatch(/p\.statut !== "par_email" \? \(/);
  });
});

describe("dossiers — l'adhérent peut remplacer une pièce fournie", () => {
  it("le formulaire de dépôt reste disponible après « fournie », libellé REMPLACER", () => {
    expect(ESPACE).toMatch(/REMPLACER/);
    expect(ESPACE).toMatch(/deux objets, rien n'est\s*\n?\s*écrasé/);
  });

  it("l'input de l'espace annonce enfin les formats acceptés", () => {
    expect(ESPACE).toMatch(/accept="application\/pdf,image\/png,image\/jpeg"/);
  });
});

describe("storage — la lecture des pièces suit la matrice de rôles", () => {
  it("la politique restreint au président, au secrétaire et au super-admin", () => {
    expect(MIGRATION).toMatch(/a_role_asso\(array\['admin_asso','secretaire'\]\)/);
    expect(MIGRATION).toMatch(/is_super_admin\(\)/);
    expect(MIGRATION).toMatch(/bucket_id = 'pieces'/);
  });

  it("le préfixe d'organisation reste la première barrière", () => {
    expect(MIGRATION).toMatch(/\(storage\.foldername\(name\)\)\[1\] = public\.current_org_id\(\)::text/);
  });

  it("la migration est idempotente et documente son retour arrière", () => {
    expect(MIGRATION).toMatch(/if exists \(select 1 from pg_policies/);
    expect(MIGRATION).toMatch(/RETOUR ARRIÈRE/);
  });
});
