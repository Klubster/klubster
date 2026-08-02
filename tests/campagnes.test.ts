import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests de l'envoi de campagne.
 *
 * On simule Supabase et Resend : ce qu'on vérifie ici, c'est la MÉCANIQUE — l'ordre des
 * écritures, la dérivation du statut, le comportement en envoi partiel. Le cloisonnement
 * par organisation est porté par la RLS et par `organisation_id` imposé côté serveur ;
 * il est vérifié séparément (voir `roles.test.ts` pour la matrice de permissions).
 */

// `vi.hoisted` : `vi.mock` est remonté au-dessus des déclarations, donc la fonction
// simulée doit être créée dans le même mouvement, sinon elle est encore indéfinie au
// moment où la fabrique s'exécute — et les arguments ne sont pas transmis.
const { envoyerLotCampagne } = vi.hoisted(() => ({ envoyerLotCampagne: vi.fn() }));
vi.mock("@/lib/resend", () => ({ envoyerLotCampagne }));

const { envoyerCampagne, TAILLE_LOT } = await import("@/lib/campagnes");

/** Supabase simulé : mémorise les écritures pour qu'on puisse les inspecter. */
function fauxSupabase(opts: { nbDestinataires: number; echecInsertDest?: boolean }) {
  const ecrites: Array<{ table: string; op: string; valeurs: unknown }> = [];
  const destinataires = Array.from({ length: opts.nbDestinataires }, (_, i) => ({
    id: `dest-${i}`,
    email: `p${i}@exemple.fr`,
  }));

  const client = {
    ecrites,
    from(table: string) {
      return {
        insert(valeurs: unknown) {
          ecrites.push({ table, op: "insert", valeurs });
          return {
            select() {
              if (table === "message_campaigns") {
                return { single: async () => ({ data: { id: "camp-1" }, error: null }) };
              }
              if (opts.echecInsertDest) return Promise.resolve({ data: null, error: { message: "boom" } });
              return Promise.resolve({ data: destinataires, error: null });
            },
          };
        },
        update(valeurs: unknown) {
          ecrites.push({ table, op: "update", valeurs });
          return { eq: async () => ({ error: null }) };
        },
      };
    },
  };
  return client as unknown as Parameters<typeof envoyerCampagne>[0]["supabase"] & { ecrites: typeof ecrites };
}

function base(supabase: ReturnType<typeof fauxSupabase>, cibles: number) {
  return {
    supabase,
    organisationId: "org-1",
    nomClub: "L’Arbre et le Souffle",
    replyTo: "contact@example.com",
    auteurProfileId: "prof-1",
    auteurNom: "Hélène Vasseur",
    groupe: "tous",
    groupeLibelle: "Tous les adhérents",
    objet: "Stage de novembre",
    corps: "Bonjour à toutes et à tous.",
    cibles: Array.from({ length: cibles }, (_, i) => ({ adherentId: `a-${i}`, email: `p${i}@exemple.fr` })),
  };
}

/**
 * Identifiants Resend pour tous les destinataires du faux Supabase. Le code n'en lit que
 * ceux du lot courant : une carte unique suffit donc pour tous les lots, et évite de
 * dépendre des arguments reçus par le mock.
 */
function tousLesIdentifiants(n: number): Map<string, string> {
  return new Map(Array.from({ length: n }, (_, i) => [`dest-${i}`, `re_${i}`]));
}

beforeEach(() => envoyerLotCampagne.mockReset());

describe("envoi d’une campagne", () => {
  it("refuse proprement un groupe sans destinataire", async () => {
    const sb = fauxSupabase({ nbDestinataires: 0 });
    const res = await envoyerCampagne({ ...base(sb, 0), cibles: [] });
    expect(res.ok).toBe(false);
    expect(res.statut).toBe("echec");
    expect(res.erreur).toMatch(/aucun destinataire/i);
    // Rien ne doit être écrit ni envoyé quand il n'y a personne à servir.
    expect(sb.ecrites).toHaveLength(0);
    expect(envoyerLotCampagne).not.toHaveBeenCalled();
  });

  it("écrit la campagne et les destinataires AVANT d’appeler Resend", async () => {
    const sb = fauxSupabase({ nbDestinataires: 3 });
    envoyerLotCampagne.mockResolvedValue({ ok: true, identifiants: tousLesIdentifiants(3) });

    const res = await envoyerCampagne(base(sb, 3));
    expect(res.statut).toBe("envoye");
    expect(res.acceptes).toBe(3);

    // L'ordre des écritures porte la garantie : la campagne, puis ses destinataires,
    // et seulement ensuite les mises à jour issues de l'envoi.
    const ops = sb.ecrites.map((e) => `${e.op}:${e.table}`);
    expect(ops[0]).toBe("insert:message_campaigns");
    expect(ops[1]).toBe("insert:message_recipients");
    expect(ops.slice(2).every((o) => o.startsWith("update:"))).toBe(true);
  });

  it("passe une ligne à « accepté » seulement après avoir enregistré l’identifiant Resend", async () => {
    const sb = fauxSupabase({ nbDestinataires: 2 });
    envoyerLotCampagne.mockResolvedValue({
      ok: true,
      identifiants: new Map([["dest-0", "re_aaa"]]), // dest-1 sans identifiant
    });

    const res = await envoyerCampagne(base(sb, 2));
    // Une seule ligne acceptée : celle qui a un identifiant.
    expect(res.acceptes).toBe(1);
    expect(res.statut).toBe("partiel");

    const majDest = sb.ecrites.filter((e) => e.table === "message_recipients" && e.op === "update");
    expect(majDest).toHaveLength(1);
    expect(majDest[0].valeurs).toMatchObject({ provider_message_id: "re_aaa", statut: "accepte" });
  });

  it("produit le statut « partiel » quand un lot échoue en cours de route", async () => {
    const sb = fauxSupabase({ nbDestinataires: TAILLE_LOT + 40 });
    envoyerLotCampagne
      .mockResolvedValueOnce({
        ok: true,
        identifiants: new Map(Array.from({ length: TAILLE_LOT }, (_, i) => [`dest-${i}`, `re_${i}`])),
      })
      .mockResolvedValueOnce({ ok: false, identifiants: new Map(), quotaAtteint: true, erreur: "Limite d’envoi du compte atteinte." });

    const res = await envoyerCampagne(base(sb, TAILLE_LOT + 40));
    expect(res.statut).toBe("partiel");
    expect(res.acceptes).toBe(TAILLE_LOT);
    expect(res.destinataires).toBe(TAILLE_LOT + 40);
    expect(res.erreur).toMatch(/limite/i);
  });

  it("s’arrête après un quota au lieu d’insister lot après lot", async () => {
    const sb = fauxSupabase({ nbDestinataires: TAILLE_LOT * 3 });
    envoyerLotCampagne.mockResolvedValue({ ok: false, identifiants: new Map(), quotaAtteint: true, erreur: "quota" });
    await envoyerCampagne(base(sb, TAILLE_LOT * 3));
    expect(envoyerLotCampagne).toHaveBeenCalledTimes(1);
  });

  it("découpe en lots de 100 au maximum, et numérote chaque lot", async () => {
    const sb = fauxSupabase({ nbDestinataires: 250 });
    envoyerLotCampagne.mockResolvedValue({ ok: true, identifiants: tousLesIdentifiants(250) });

    await envoyerCampagne(base(sb, 250));
    expect(envoyerLotCampagne).toHaveBeenCalledTimes(3);
    const numeros = envoyerLotCampagne.mock.calls.map((c) => (c[0] as { numeroLot: number }).numeroLot);
    expect(numeros).toEqual([1, 2, 3]);
    const tailles = envoyerLotCampagne.mock.calls.map((c) => (c[0] as { lot: unknown[] }).lot.length);
    expect(tailles).toEqual([100, 100, 50]);
  });

  it("marque la campagne en échec si aucune ligne n’est acceptée", async () => {
    const sb = fauxSupabase({ nbDestinataires: 5 });
    envoyerLotCampagne.mockResolvedValue({ ok: false, identifiants: new Map(), erreur: "Service d’envoi injoignable." });
    const res = await envoyerCampagne(base(sb, 5));
    expect(res.ok).toBe(false);
    expect(res.statut).toBe("echec");
  });

  it("reste inspectable quand l’enregistrement des destinataires échoue", async () => {
    const sb = fauxSupabase({ nbDestinataires: 3, echecInsertDest: true });
    const res = await envoyerCampagne(base(sb, 3));
    expect(res.statut).toBe("echec");
    expect(res.campaignId).toBe("camp-1"); // la campagne existe, donc consultable
    expect(envoyerLotCampagne).not.toHaveBeenCalled();
  });

  it("les compteurs ne dépassent jamais le nombre de destinataires", async () => {
    const sb = fauxSupabase({ nbDestinataires: 3 });
    // Resend renvoie plus d'identifiants que de lignes : on ne doit compter que les nôtres.
    envoyerLotCampagne.mockResolvedValue({
      ok: true,
      identifiants: new Map([
        ["dest-0", "re_a"], ["dest-1", "re_b"], ["dest-2", "re_c"], ["intrus", "re_x"],
      ]),
    });
    const res = await envoyerCampagne(base(sb, 3));
    expect(res.acceptes).toBe(3);
    expect(res.acceptes).toBeLessThanOrEqual(res.destinataires);
  });
});
