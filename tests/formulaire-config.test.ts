import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const MIGRATION = lire("supabase/migrations/20260804090000_pieces_mineurs.sql");
const ACTIONS = lire("src/app/[asso]/cockpit/formulaire/actions.ts");
const BUILDER = lire("src/app/[asso]/cockpit/formulaire/FormBuilder.tsx");
const PUBLIC_FORM = lire("src/app/[asso]/inscription/FormulaireInscription.tsx");
const INSCRIPTION = lire("src/app/[asso]/inscription/actions.ts");
const TYPES = lire("src/types/form.ts");

describe("formulaire — pièce réservée aux mineurs (promesse publique)", () => {
  it("le type Piece porte le drapeau, documenté", () => {
    expect(TYPES).toMatch(/mineurs_seulement\?: boolean/);
    expect(TYPES).toMatch(/jamais d'un champ posté/);
  });

  it("l'Atelier propose la case « MINEURS UNIQUEMENT »", () => {
    expect(BUILDER).toMatch(/MINEURS UNIQUEMENT/);
    expect(BUILDER).toMatch(/mineurs_seulement: e\.target\.checked \|\| undefined/);
  });

  it("la RPC filtre par âge, décidé côté serveur depuis la date de naissance", () => {
    expect(MIGRATION).toMatch(/v_mineur := v_naissance is not null and v_naissance > \(current_date - interval '18 years'\)/);
    expect(MIGRATION).toMatch(/coalesce\(\(pc->>'mineurs_seulement'\)::boolean, false\) = false or v_mineur/);
  });

  it("sans date de naissance : adulte — pas de pièce parentale par défaut", () => {
    expect(MIGRATION).toMatch(/Sans date : adulte/);
  });

  it("la définition reste complète et explicite (le corps du lot 16, plus le filtre)", () => {
    // pas de retour de la chirurgie de texte, et la capacité du lot 16 est conservée
    expect(MIGRATION).not.toMatch(/prosrc|execute format/i);
    expect(MIGRATION).toMatch(/verrouiller_cours\(p_cours_id\)/);
    expect(MIGRATION).toMatch(/statuts_occupant_place\(\)/);
    expect(MIGRATION).toMatch(/security definer/);
    expect(MIGRATION).toMatch(/revoke execute on function public\.register_adherent_full/);
  });

  it("le formulaire public affiche « mineurs uniquement » sur la pièce", () => {
    expect(PUBLIC_FORM).toMatch(/pc\.mineurs_seulement \?/);
    expect(PUBLIC_FORM).toMatch(/mineurs uniquement/);
  });

  it("l'email de confirmation applique LE MÊME filtre que la RPC", () => {
    expect(INSCRIPTION).toMatch(/!p\.mineurs_seulement \|\| estInscriptionMineur/);
  });
});

describe("formulaire — l'enregistrement refuse ce qui rendrait le public illisible", () => {
  it("libellés nettoyés (trim) avant l'écriture", () => {
    expect(ACTIONS).toMatch(/label: \(ch\.label \?\? ""\)\.trim\(\)/);
  });

  it("champ sans libellé : refusé avec un message que le président comprend", () => {
    expect(ACTIONS).toMatch(/Un champ n’a pas de libellé/);
  });

  it("liste de choix sans option : refusée en nommant le champ", () => {
    expect(ACTIONS).toMatch(/n’a aucune option/);
  });

  it("pièce sans nom : refusée", () => {
    expect(ACTIONS).toMatch(/Une pièce n’a pas de nom/);
  });

  it("le message d'erreur du serveur est montré tel quel dans l'Atelier", () => {
    expect(BUILDER).toMatch(/\{erreur \?\? "Erreur d’enregistrement"\}/);
  });
});

describe("formulaire — deux champs identiques (audit du 04/08)", () => {
  it("un libellé dupliqué est refusé en nommant le doublon", () => {
    // Deux champs de même libellé partagent la même clé dans `adherents.infos` :
    // la seconde réponse écrasait la première, en silence.
    expect(ACTIONS).toMatch(/Deux champs portent le même libellé/);
    expect(ACTIONS).toMatch(/toLowerCase\(\)/);
  });
});

describe("pièces facultatives — la règle unique du dossier incomplet (arbitrage 04/08)", () => {
  const ESPACE = lire("src/app/[asso]/espace/page.tsx");
  const CRON = lire("src/app/api/cron/relances/route.ts");
  const QUERIES = lire("src/lib/queries.ts");
  const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");

  it("la colonne est un INSTANTANÉ pris à la création, jamais relu depuis form_config", () => {
    expect(MIGRATION).toMatch(/add column if not exists obligatoire boolean not null default true/);
    expect(MIGRATION).toMatch(/coalesce\(\(pc->>'obligatoire'\)::boolean, true\)/);
  });

  it("rétroalimentation prudente : correspondance certaine seule, sinon true", () => {
    expect(MIGRATION).toMatch(/pc->>'id' = p\.cle/);
    expect(MIGRATION).toMatch(/\(pc->>'obligatoire'\)::boolean = false/);
    expect(MIGRATION).toMatch(/garde `true` par prudence/);
  });

  it("le certificat médical auto reste obligatoire (défaut de colonne, absent de form_config)", () => {
    // enregistrer_questionnaire_sante n'énumère pas la colonne → default true
    expect(MIGRATION).toMatch(/certificat médical créé après le questionnaire de santé, absent de\s*\n?-- form_config, donc obligatoire/);
  });

  it("le contrôle terrain ne compte que les obligatoires (redéfinitions conditionnelles)", () => {
    expect(MIGRATION).toMatch(/statut = 'manquante' and p\.obligatoire/);
    expect(MIGRATION).toMatch(/if exists \(select 1 from pg_proc/);
  });

  it("l'espace adhérent : compteur obligatoires seules, mention Facultative visible", () => {
    expect(ESPACE).toMatch(/p\.statut === "manquante" && p\.obligatoire !== false/);
    expect(ESPACE).toMatch(/Facultative/);
  });

  it("le cron lit l'instantané en base, plus jamais la config actuelle", () => {
    expect(CRON).toMatch(/\.eq\("obligatoire", true\)/);
    expect(CRON).not.toMatch(/clesObligatoires/);
  });

  it("le cockpit compte les manquantes obligatoires", () => {
    expect(QUERIES).toMatch(/\.eq\("obligatoire", true\)/);
  });

  it("la fiche affiche la mention Facultative", () => {
    expect(FICHE).toMatch(/Facultative/);
  });
});
