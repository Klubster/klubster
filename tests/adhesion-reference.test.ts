import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { adhesionDeReference, verdictDuControle, STATUTS_ACTIFS } from "@/lib/adhesion-reference";

/**
 * L'ADHÉSION DE RÉFÉRENCE — ce que le contrôle lit au bord du tapis.
 *
 * Le défaut d'origine (`docs/defauts-a-corriger.md` n°1) était décrit comme un simple
 * manque d'ordre total. En relisant la RPC `0013`, il y en avait un second, plus grave :
 * `cours` et `regle` venaient de DEUX sous-requêtes indépendantes. À égalité de date,
 * rien n'obligeait Postgres à les départager de la même façon — l'écran pouvait afficher
 * le cours d'une adhésion et le règlement d'une autre.
 *
 * Ces tests exercent la règle. Le dernier compare le `order by` de la migration à la
 * liste des critères, pour que le SQL et le TypeScript ne divergent pas en silence.
 */

const ADH = (p: Partial<Parameters<typeof adhesionDeReference>[0][number]> & { id: string }) => ({
  saison: "2026-2027", statut: "paye", cours_id: "c1", created_at: "2026-09-01", ...p,
});

const SAISON = "2026-2027";

describe("le choix de l’adhésion de référence", () => {
  it("sans aucune adhésion, ne rend rien — donc « non réglé », jamais « à jour »", () => {
    expect(adhesionDeReference([], SAISON)).toBeNull();
    expect(verdictDuControle([], SAISON)).toEqual({ coursId: null, regle: false, reference: null });
  });

  it("préfère la saison courante à une saison passée, même plus récemment créée", () => {
    // Le piège : l'adhésion de l'an dernier a été SAISIE plus tard (régularisation).
    // Un tri sur `created_at` seul l'aurait choisie, et le contrôle aurait dit « à jour »
    // à quelqu'un qui n'a pas payé la saison en cours.
    const ref = adhesionDeReference([
      ADH({ id: "a", saison: "2025-2026", statut: "paye", created_at: "2026-10-05", cours_id: "vieux" }),
      ADH({ id: "b", saison: SAISON, statut: "en_attente", created_at: "2026-09-01", cours_id: "neuf" }),
    ], SAISON);
    expect(ref!.id).toBe("b");
    expect(verdictDuControle([
      ADH({ id: "a", saison: "2025-2026", statut: "paye", created_at: "2026-10-05" }),
      ADH({ id: "b", saison: SAISON, statut: "en_attente", created_at: "2026-09-01" }),
    ], SAISON).regle).toBe(false);
  });

  it("préfère une adhésion active à une adhésion annulée, remboursée ou en attente de place", () => {
    for (const inerte of ["annule", "rembourse", "liste_attente"]) {
      const ref = adhesionDeReference([
        ADH({ id: "inerte", statut: inerte, created_at: "2026-10-10", cours_id: "x" }),
        ADH({ id: "actif", statut: "en_retard", created_at: "2026-09-01", cours_id: "y" }),
      ], SAISON);
      expect(ref!.id, `statut ${inerte}`).toBe("actif");
    }
  });

  it("à saison et statut égaux, prend la plus récente", () => {
    const ref = adhesionDeReference([
      ADH({ id: "vieille", created_at: "2026-09-01" }),
      ADH({ id: "recente", created_at: "2026-10-01" }),
    ], SAISON);
    expect(ref!.id).toBe("recente");
  });

  it("DEUX ADHÉSIONS LE MÊME JOUR : le résultat est stable, quel que soit l’ordre d’entrée", () => {
    // Le cœur du défaut. `created_at` est une DATE : ces deux-là sont ex æquo.
    const x = ADH({ id: "aaa", created_at: "2026-09-02", cours_id: "hatha" });
    const y = ADH({ id: "zzz", created_at: "2026-09-02", cours_id: "nidra" });
    const dansUnSens = adhesionDeReference([x, y], SAISON)!.id;
    const dansLAutre = adhesionDeReference([y, x], SAISON)!.id;
    expect(dansUnSens).toBe(dansLAutre);
    // Et c'est l'identifiant décroissant qui tranche — quatrième critère, sans
    // signification métier, seulement pour que l'ordre soit total.
    expect(dansUnSens).toBe("zzz");
  });

  it("le cours et le règlement viennent TOUJOURS de la même adhésion", () => {
    // C'est le défaut que les deux sous-requêtes de 0013 rendaient possible :
    // « Nidra · à jour » pour quelqu'un qui a payé le Hatha et pas le Nidra.
    const paye = ADH({ id: "aaa", created_at: "2026-09-02", cours_id: "hatha", statut: "paye" });
    const impaye = ADH({ id: "zzz", created_at: "2026-09-02", cours_id: "nidra", statut: "en_retard" });
    const v = verdictDuControle([paye, impaye], SAISON);
    // Quelle que soit l'adhésion retenue, les deux informations la décrivent ELLE.
    const attendue = [paye, impaye].find((a) => a.id === v.reference!.id)!;
    expect(v.coursId).toBe(attendue.cours_id);
    expect(v.regle).toBe(attendue.statut === "paye");
  });

  it("un renouvellement non payé rend « non réglé », même si l’an dernier était soldé", () => {
    const v = verdictDuControle([
      ADH({ id: "an-dernier", saison: "2025-2026", statut: "paye", cours_id: "hatha" }),
      ADH({ id: "cette-annee", saison: SAISON, statut: "en_attente", cours_id: "hatha", created_at: "2026-09-10" }),
    ], SAISON);
    expect(v.regle).toBe(false);
    expect(v.reference!.id).toBe("cette-annee");
  });

  it("ne rend « réglé » que pour un statut payé", () => {
    for (const s of ["en_attente", "en_retard", "liste_attente", "annule", "rembourse", null]) {
      expect(verdictDuControle([ADH({ id: "x", statut: s })], SAISON).regle, `statut ${s}`).toBe(false);
    }
    expect(verdictDuControle([ADH({ id: "x", statut: "paye" })], SAISON).regle).toBe(true);
  });

  it("ne réordonne pas le tableau de l’appelant", () => {
    // Une liste d'adhésions vient souvent d'un état React : la muter est une faute.
    const liste = [ADH({ id: "a", created_at: "2026-09-01" }), ADH({ id: "b", created_at: "2026-10-01" })];
    const avant = liste.map((a) => a.id);
    adhesionDeReference(liste, SAISON);
    expect(liste.map((a) => a.id)).toEqual(avant);
  });

  it("reste stable sur cent appels — c’est la définition d’un ordre total", () => {
    const lot = Array.from({ length: 6 }, (_, i) =>
      ADH({ id: `id-${i}`, created_at: "2026-09-02", cours_id: `c${i}` }));
    const premiers = new Set(
      Array.from({ length: 100 }, () =>
        adhesionDeReference(lot.slice().sort(() => Math.random() - 0.5), SAISON)!.id)
    );
    expect([...premiers]).toEqual(["id-5"]);
  });
});

// ——— Le SQL et le TypeScript disent-ils la même chose ? ————————————————————————

describe("la migration 0028", () => {
  const brut = readFileSync(
    path.resolve(__dirname, "..", "supabase/migrations/0028_verifier_adherent_adhesion_de_reference.sql"),
    "utf8"
  );
  /**
   * Le CODE de la migration, ses commentaires retirés.
   *
   * Sans ce nettoyage, les contrôles ci-dessous lisent l'en-tête — qui CITE l'ancienne
   * requête pour expliquer ce qui n'allait pas. Le test échouait donc sur la citation du
   * défaut, pas sur le défaut. Même piège que dans `tests/demo-isolation.test.ts` : une
   * vérification qui lit les commentaires punit les fichiers les mieux documentés.
   */
  const sql = brut.replace(/^\s*--.*$/gm, "");

  it("choisit l’adhésion de référence UNE seule fois, par un LATERAL", () => {
    // Une seule source pour `cours` et `regle` : c'est la correction principale.
    expect(sql).toMatch(/left join lateral/i);
    expect(sql).toContain("ref.cours_id");
    expect(sql).toContain("ref.statut = 'paye'");
    // Et plus aucune sous-requête indépendante sur `adhesions` dans le SELECT.
    const selects = sql.match(/select ad\.statut = 'paye' from adhesions/g) ?? [];
    expect(selects).toEqual([]);
  });

  it("ordonne par les quatre critères, dans l’ordre du module TypeScript", () => {
    const ordre = sql.slice(sql.indexOf("order by"), sql.indexOf("limit 1"));
    const positions = [
      ordre.indexOf("saison_courante"),
      ordre.indexOf("ad.statut not in"),
      ordre.indexOf("ad.created_at desc"),
      ordre.indexOf("ad.id desc"),
    ];
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("emploie exactement les mêmes statuts actifs que le module", () => {
    const dansLeSql = sql.match(/ad\.statut not in \(([^)]*)\)/)![1]
      .split(",").map((s) => s.trim().replace(/'/g, ""));
    expect(dansLeSql.sort()).toEqual([...STATUTS_ACTIFS].sort());
  });

  it("est additive : aucun DROP, aucun DELETE, aucune colonne retirée", () => {
    expect(sql).not.toMatch(/\bdrop\s+(table|column|function)\b/i);
    expect(sql).not.toMatch(/\bdelete\s+from\b/i);
    expect(sql).not.toMatch(/\balter\s+table\b.*\bdrop\b/i);
  });

  it("ne rouvre pas les droits à anon", () => {
    expect(sql).toMatch(/revoke execute on function public\.verifier_adherent\(uuid\) from anon, public/);
    expect(sql).not.toMatch(/grant execute on function public\.verifier_adherent\(uuid\) to anon/);
  });
});
