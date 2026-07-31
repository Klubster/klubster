import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Le remboursement Stripe — le seul parcours qu'on n'a pas pu exercer en production.
 *
 * POURQUOI CE FICHIER EXISTE
 * Au moment de fermer les colonnes financières d'`adhesions` (migration 0027), trois des
 * quatre chemins qui lisent ces colonnes ont pu être vérifiés sur le site réel. Le
 * quatrième — le bouton « Rembourser ce paiement en ligne » — ne s'affiche nulle part,
 * parce qu'AUCUNE adhésion de production ne porte de `stripe_payment_intent` : zéro
 * ligne, mesuré le 31/07/2026. Personne n'a encore payé par carte.
 *
 * On ne fabrique pas de fausse référence Stripe dans une base réelle pour se rassurer :
 * cela ne prouverait que l'affichage conditionnel d'un bouton, et laisserait une
 * référence invalide qu'un clic malheureux tenterait de rembourser.
 *
 * Ces tests exercent donc la LOGIQUE, sur une adhésion fictive, là où elle vit : la
 * fusion entre les colonnes de dossier (lues sur la table) et les colonnes financières
 * (lues par la RPC). C'est cette fusion, et elle seule, qui décide si le bouton
 * apparaît — et c'est elle que le changement de la 0027 pouvait casser.
 */

const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

// ——— La fusion, reproduite à l'identique de la fiche ————————————————————————————
// Si ce bloc et `adherents/[id]/page.tsx` divergent, les tests plus bas mentent. Le
// dernier `describe` vérifie justement qu'ils ne divergent pas.

type Base = { id: string; statut: string | null; montant_centimes: number | null };
type Finance = { id: string; litige_le: string | null; stripe_payment_intent: string | null };

function fusionner(base: Base[], finance: Finance[]) {
  const parId = new Map(finance.map((f) => [f.id, f]));
  return base.map((a) => ({
    ...a,
    litige_le: parId.get(a.id)?.litige_le ?? null,
    stripe_payment_intent: parId.get(a.id)?.stripe_payment_intent ?? null,
  }));
}

const ADHESION: Base = { id: "ad-fictive", statut: "paye", montant_centimes: 21000 };
const FINANCE: Finance = {
  id: "ad-fictive",
  litige_le: null,
  stripe_payment_intent: "pi_3QfictifPourLeTest0000",
};

describe("adhésion fictive payée par carte", () => {
  it("le paiement en ligne remonte jusqu’à la fiche", () => {
    const [a] = fusionner([ADHESION], [FINANCE]);
    expect(a.stripe_payment_intent).toBe("pi_3QfictifPourLeTest0000");
    // C'est cette valeur, et rien d'autre, qui fait apparaître le bouton :
    //   {peut(role, "paiements") && a.stripe_payment_intent ? <Remboursement … /> : null}
    expect(Boolean(a.stripe_payment_intent)).toBe(true);
  });

  it("le montant vient de la table, pas de la RPC", () => {
    // `montant_centimes` reste lisible par tous : c'est le tarif, déjà public sur la
    // vitrine. Le remboursement le borne — il doit donc survivre à la fusion.
    const [a] = fusionner([ADHESION], [FINANCE]);
    expect(a.montant_centimes).toBe(21000);
  });

  it("sans permission, la RPC ne rend rien et le bouton disparaît", () => {
    // La RPC rend zéro ligne à un rôle non financier (vérifié en production le 31/07 :
    // président 308 lignes, adhérent 0). Côté page, `finance` vaut alors `[]`.
    const [a] = fusionner([ADHESION], []);
    expect(a.stripe_payment_intent).toBeNull();
    expect(a.litige_le).toBeNull();
  });

  it("une adhésion sans paiement en ligne n’affiche pas le bouton", () => {
    const [a] = fusionner([ADHESION], [{ ...FINANCE, stripe_payment_intent: null }]);
    expect(Boolean(a.stripe_payment_intent)).toBe(false);
  });

  it("un litige remonte et déclenche le bandeau", () => {
    const [a] = fusionner([ADHESION], [{ ...FINANCE, litige_le: "2026-07-15T10:00:00Z" }]);
    expect(a.litige_le).toBe("2026-07-15T10:00:00Z");
  });

  it("la fusion n’invente rien pour une adhésion absente de la RPC", () => {
    // Deux adhésions, une seule remontée par la RPC : la seconde ne doit pas hériter
    // des valeurs de la première. C'est le bug classique d'une jointure par index.
    const autre: Base = { id: "ad-autre", statut: "en_attente", montant_centimes: 15000 };
    const [a, b] = fusionner([ADHESION, autre], [FINANCE]);
    expect(a.stripe_payment_intent).toBe("pi_3QfictifPourLeTest0000");
    expect(b.stripe_payment_intent).toBeNull();
  });
});

describe("l’action de remboursement lit bien par la RPC", () => {
  const ACTIONS = lire("src/app/[asso]/cockpit/adherents/actions.ts");

  it("elle appelle adhesions_finance, pas la table", () => {
    const bloc = ACTIONS.match(/export async function rembourserEnLigne[\s\S]*?\n}/)?.[0] ?? "";
    expect(bloc).toMatch(/rpc\("adhesions_finance", \{ p_org: org\.id \}\)/);
    expect(bloc).toMatch(/\.eq\("id", adhesionId\)/);
    expect(bloc).not.toMatch(/\.from\("adhesions"\)/);
  });

  it("un identifiant absent produit un refus explicite, jamais un remboursement à vide", () => {
    const bloc = ACTIONS.match(/export async function rembourserEnLigne[\s\S]*?\n}/)?.[0] ?? "";
    expect(bloc).toMatch(/if \(!pi\) redirect\([^)]*erreur=remboursement_impossible/);
  });

  it("le montant reste borné côté serveur", () => {
    // Une remise saisie dans le navigateur ne décide jamais d'un montant. Même règle
    // que partout ailleurs dans le projet.
    const bloc = ACTIONS.match(/export async function rembourserEnLigne[\s\S]*?\n}/)?.[0] ?? "";
    expect(bloc).toMatch(/montant_centimes/);
  });
});

describe("la fusion testée ici est celle de la fiche", () => {
  const FICHE = lire("src/app/[asso]/cockpit/adherents/[id]/page.tsx");

  it("la fiche fusionne par identifiant, avec un repli à null", () => {
    expect(FICHE).toMatch(/financeParId\.get\(a\.id\)\?\.litige_le \?\? null/);
    expect(FICHE).toMatch(/financeParId\.get\(a\.id\)\?\.stripe_payment_intent \?\? null/);
  });

  it("le bouton dépend de la permission ET de la référence de paiement", () => {
    expect(FICHE).toMatch(/peut\(profile\.role, "paiements"\) && a\.stripe_payment_intent/);
  });
});
