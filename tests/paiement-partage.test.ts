import { describe, expect, it } from "vitest";
import {
  remboursableEnLigne,
  repartirProrata,
  lireRepartition,
  ecrireRepartition,
} from "@/lib/finances";

/**
 * Paiement partagé entre plusieurs adhésions (inscription multi-cours).
 *
 * Ces tests portent sur le COMPORTEMENT de l'arithmétique de l'argent, pas sur le
 * texte des sources. C'est délibéré : la revue externe du 26/08/2026 a trouvé un
 * défaut de remboursement que 1 100 tests n'avaient pas vu, précisément parce que
 * les tests du lot multi-cours vérifiaient des chaînes de caractères. Ici, on donne
 * des montants et on vérifie des montants.
 */

const U = (n: number) => `${String(n).padStart(8, "0")}-1111-2222-3333-444444444444`;

describe("remboursableEnLigne — ce qu'une adhésion peut réellement se voir rendre", () => {
  it("ne compte que l'encaissé par carte : ni chèque, ni espèces, ni virement", () => {
    expect(
      remboursableEnLigne([
        { montantCentimes: 20000, mode: "en_ligne" },
        { montantCentimes: 15000, mode: "cheque" },
        { montantCentimes: 5000, mode: "especes" },
        { montantCentimes: 9000, mode: "virement" },
      ])
    ).toBe(20000);
  });

  it("déduit ce qui a déjà été rendu", () => {
    expect(
      remboursableEnLigne([
        { montantCentimes: 20000, mode: "en_ligne" },
        { montantCentimes: -5000, mode: "remboursement" },
      ])
    ).toBe(15000);
  });

  it("tombe à zéro quand tout a été rendu — et ne devient jamais négatif", () => {
    expect(
      remboursableEnLigne([
        { montantCentimes: 20000, mode: "en_ligne" },
        { montantCentimes: -20000, mode: "remboursement" },
      ])
    ).toBe(0);
    // Trop-remboursé depuis le tableau de bord Stripe : pas un droit à rendre encore.
    expect(
      remboursableEnLigne([
        { montantCentimes: 20000, mode: "en_ligne" },
        { montantCentimes: -25000, mode: "remboursement" },
      ])
    ).toBe(0);
  });

  it("une adhésion réglée uniquement en chèque n'est pas remboursable en ligne", () => {
    expect(remboursableEnLigne([{ montantCentimes: 16000, mode: "cheque" }])).toBe(0);
    expect(remboursableEnLigne([])).toBe(0);
  });

  it("additionne les échéances d'un paiement en plusieurs fois", () => {
    expect(
      remboursableEnLigne([
        { montantCentimes: 7000, mode: "en_ligne" },
        { montantCentimes: 7000, mode: "en_ligne" },
        { montantCentimes: 7000, mode: "en_ligne" },
      ])
    ).toBe(21000);
  });

  it("LE DÉFAUT DU 26/08 : sur un paiement partagé, chaque adhésion ne rend QUE sa part", () => {
    // Danse 200 € + jazz 300 € réglés en un seul paiement de 500 €.
    const danse = remboursableEnLigne([{ montantCentimes: 20000, mode: "en_ligne" }]);
    const jazz = remboursableEnLigne([{ montantCentimes: 30000, mode: "en_ligne" }]);
    expect(danse).toBe(20000); // et non 50000, qui était le montant rendu par Stripe
    expect(jazz).toBe(30000);
    expect(danse + jazz).toBe(50000);
  });
});

describe("repartirProrata — l'argent tombe juste, au centime", () => {
  const somme = (parts: Array<{ partCentimes: number }>) => parts.reduce((s, p) => s + p.partCentimes, 0);

  it("deux cours au même tarif partagent également", () => {
    const r = repartirProrata(
      [{ id: U(1), montantCentimes: 16000 }, { id: U(2), montantCentimes: 16000 }],
      32000
    );
    expect(r.map((p) => p.partCentimes)).toEqual([16000, 16000]);
  });

  it("trois cours de tarifs différents reçoivent exactement leur dû", () => {
    const r = repartirProrata(
      [
        { id: U(1), montantCentimes: 16000 },
        { id: U(2), montantCentimes: 16000 },
        { id: U(3), montantCentimes: 21000 },
      ],
      53000
    );
    expect(r.map((p) => p.partCentimes)).toEqual([16000, 16000, 21000]);
  });

  it("le reliquat d'arrondi va à la dernière part : la somme reste exacte", () => {
    const parts = Array.from({ length: 7 }, (_, i) => ({ id: U(i + 1), montantCentimes: 3333 }));
    const r = repartirProrata(parts, 23331);
    expect(somme(r)).toBe(23331);
    expect(r.every((p) => p.partCentimes > 0)).toBe(true);
  });

  it("un montant reçu inférieur à l'annoncé se répartit quand même intégralement", () => {
    const r = repartirProrata(
      [{ id: U(1), montantCentimes: 20000 }, { id: U(2), montantCentimes: 30000 }],
      25000
    );
    expect(somme(r)).toBe(25000);
    expect(r.map((p) => p.partCentimes)).toEqual([10000, 15000]);
  });

  it("un cours gratuit dans le lot ne reçoit rien, et ne vole rien aux autres", () => {
    const r = repartirProrata(
      [{ id: U(1), montantCentimes: 0 }, { id: U(2), montantCentimes: 21000 }],
      21000
    );
    expect(r.map((p) => p.partCentimes)).toEqual([0, 21000]);
    const inverse = repartirProrata(
      [{ id: U(1), montantCentimes: 21000 }, { id: U(2), montantCentimes: 0 }],
      21000
    );
    expect(inverse.map((p) => p.partCentimes)).toEqual([21000, 0]);
  });

  it("aucune part n'est jamais négative, quels que soient les montants", () => {
    const cas: Array<[number[], number]> = [
      [[100, 200, 300], 599],
      [[1, 1, 1, 1, 1, 1, 1], 10],
      [[99999, 1], 100000],
      [[50, 50], 1],
    ];
    for (const [montants, recu] of cas) {
      const r = repartirProrata(montants.map((m, i) => ({ id: U(i + 1), montantCentimes: m })), recu);
      expect(somme(r)).toBe(recu);
      expect(r.every((p) => p.partCentimes >= 0)).toBe(true);
    }
  });

  it("un remboursement se répartit comme un paiement — même arithmétique", () => {
    // 500 € rendus depuis le tableau de bord Stripe sur un paiement danse+jazz :
    // chaque adhésion reçoit son écriture négative, aucune ne porte tout le montant.
    const r = repartirProrata(
      [{ id: U(1), montantCentimes: 20000 }, { id: U(2), montantCentimes: 30000 }],
      50000
    );
    expect(r).toEqual([
      { id: U(1), partCentimes: 20000 },
      { id: U(2), partCentimes: 30000 },
    ]);
  });

  it("un lot vide ou entièrement à zéro ne produit aucune écriture", () => {
    expect(repartirProrata([], 10000)).toEqual([]);
    expect(repartirProrata([{ id: U(1), montantCentimes: 0 }], 10000)).toEqual([]);
  });
});

describe("lecture et écriture de la répartition dans les métadonnées Stripe", () => {
  it("un aller-retour conserve les montants", () => {
    const parts = [
      { id: U(1), montantCentimes: 16000 },
      { id: U(2), montantCentimes: 21000 },
    ];
    const brut = ecrireRepartition(parts);
    expect(brut).not.toBeNull();
    expect(lireRepartition(brut)).toEqual(parts);
  });

  it("une seule adhésion n'écrit pas de répartition (chemin mono)", () => {
    expect(ecrireRepartition([{ id: U(1), montantCentimes: 16000 }])).toBeNull();
  });

  it("au-delà de la limite Stripe de 500 caractères, on n'écrit rien plutôt qu'une valeur tronquée", () => {
    const trop = Array.from({ length: 20 }, (_, i) => ({ id: U(i + 1), montantCentimes: 16000 }));
    expect(ecrireRepartition(trop)).toBeNull();
  });

  it("toute anomalie invalide le lot entier — repli sur le chemin mono", () => {
    expect(lireRepartition(undefined)).toBeNull();
    expect(lireRepartition("")).toBeNull();
    expect(lireRepartition(`${U(1)}:16000;pas-un-uuid:16000`)).toBeNull();
    expect(lireRepartition(`${U(1)}:-500`)).toBeNull();
    expect(lireRepartition(`${U(1)}:160.5`)).toBeNull();
    expect(lireRepartition(`${U(1)}:0;${U(2)}:0`)).toBeNull();
    expect(lireRepartition(`${U(1)}`)).toBeNull();
  });
});
