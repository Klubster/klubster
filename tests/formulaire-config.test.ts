
describe("lot J — changement de cours et pièces filtrées", () => {
  const CHANGER = lire("supabase/migrations/20260804120000_changer_cours.sql");
  const FORM = lire("src/app/[asso]/inscription/FormulaireInscription.tsx");
  const ACTIONS_ADH = lire("src/app/[asso]/cockpit/adherents/actions.ts");
  const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");

  it("capacité verrouillée AVANT comptage, refus explicite, jamais de liste d'attente silencieuse", () => {
    expect(CHANGER).toMatch(/verrouiller_cours\(p_nouveau_cours_id\)/);
    expect(CHANGER).toMatch(/le cours est complet/);
    expect(CHANGER).not.toMatch(/liste_attente'\s*where/);
  });

  it("tarif honnête : ajusté sans règlement, conservé sinon avec écart rendu", () => {
    expect(CHANGER).toMatch(/if v_regle = 0 then/);
    expect(CHANGER).toMatch(/montant_centimes = v_tarif_nouveau/);
    expect(CHANGER).toMatch(/v_ecart := v_tarif_nouveau - v_montant/);
  });

  it("pièces du nouveau cours ajoutées avec les règles de l'inscription (obligatoire, mineurs)", () => {
    expect(CHANGER).toMatch(/mineurs_seulement/);
    expect(CHANGER).toMatch(/coalesce\(\(pc->>'obligatoire'\)::boolean, true\)/);
  });

  it("audit journalisé ; rôles président/secrétaire en base ; saison courante seule", () => {
    expect(CHANGER).toMatch(/'changement_cours'/);
    expect(CHANGER).toMatch(/a_role_asso\(array\['admin_asso','secretaire'\]\)/);
    expect(CHANGER).toMatch(/saison courante peut changer de cours/);
  });

  it("la fiche porte le geste, avec l'écart affiché en euros", () => {
    expect(ACTIONS_ADH).toMatch(/export async function changerCours/);
    expect(FICHE).toMatch(/Changer de cours \(saison en cours\)/);
    expect(FICHE).toMatch(/ajustez le règlement/);
  });

  it("le formulaire public ne montre que les pièces DU cours choisi", () => {
    expect(FORM).toMatch(/pieces\.filter\(\(pc\) => !pc\.cours_id \|\| pc\.cours_id === coursChoisi\)/);
    expect(FORM).toMatch(/setCoursChoisi\(e\.target\.value\)/);
  });
});
