import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { lireCsv, devinerSeparateur, deviner, emailValide, dateIso, montantCentimes } from "../src/lib/csv";

/**
 * Lot O — import des adhérents.
 *
 * Fixtures de TEST : les noms et adresses `@exemple-o.example.org` sont inventés.
 */

describe("lecture d'un CSV réel", () => {
  it("devine le point-virgule, la virgule et la tabulation", () => {
    expect(devinerSeparateur("a;b;c\n1;2;3")).toBe(";");
    expect(devinerSeparateur("a,b,c\n1,2,3")).toBe(",");
    expect(devinerSeparateur("a\tb\tc")).toBe("\t");
  });

  it("ne compte pas les séparateurs à l'intérieur des guillemets", () => {
    // « Dupont, Jean » ne doit pas faire élire la virgule.
    expect(devinerSeparateur('nom;prenom\n"Dupont, Jean";Noé')).toBe(";");
  });

  it("retire le BOM UTF-8 — sinon la première colonne n'est jamais reconnue", () => {
    const { entetes } = lireCsv("﻿Prénom;Nom\nCamille;Durand");
    expect(entetes[0]).toBe("Prénom");
    expect(deviner(entetes).prenom).toBe(0);
  });

  it("gère guillemets, séparateur dans une cellule et guillemet échappé", () => {
    const { lignes } = lireCsv('nom;ville\n"Dupont; Jean";"Saint-""Jean"""');
    expect(lignes[0][0]).toBe("Dupont; Jean");
    expect(lignes[0][1]).toBe('Saint-"Jean"');
  });

  it("ignore les lignes vides, garde les lignes partiellement remplies", () => {
    const { lignes } = lireCsv("a;b\n1;2\n\n;\n3;");
    expect(lignes).toEqual([["1", "2"], ["3", ""]]);
  });

  it("un fichier vide ou réduit aux en-têtes ne produit aucune ligne", () => {
    expect(lireCsv("").lignes).toEqual([]);
    expect(lireCsv("Prénom;Nom").lignes).toEqual([]);
  });

  it("accepte les retours à la ligne Windows et les cellules multi-lignes", () => {
    const { lignes } = lireCsv('a;b\r\n1;"deux\nlignes"');
    expect(lignes[0][1]).toBe("deux\nlignes");
  });
});

describe("correspondance des colonnes", () => {
  it("reconnaît les libellés courants, accents et casse compris", () => {
    const c = deviner(["PRÉNOM", "nom de famille", "Courriel", "Portable", "Date naissance", "Groupe"]);
    expect(c.prenom).toBe(0);
    expect(c.nom).toBe(1);
    expect(c.email).toBe(2);
    expect(c.telephone).toBe(3);
    expect(c.naissance).toBe(4);
    expect(c.cours).toBe(5);
  });

  it("« Mail parent » va au responsable, PAS à l'email de l'adhérent", () => {
    // Le défaut symétrique a coûté un lot entier côté ciblage : écrire à l'enfant
    // l'adresse du parent, ou l'inverse.
    const c = deviner(["Prénom", "Nom", "Mail", "Mail parent"]);
    expect(c.email).toBe(2);
    expect(c.responsable).toBe(3);
  });

  it("« Téléphone responsable » n'est pas happé par le champ Téléphone générique", () => {
    const c = deviner(["Prénom", "Nom", "Téléphone responsable"]);
    // aucun champ ne doit revendiquer une colonne déjà prise
    const pris = [c.prenom, c.nom, c.email, c.telephone, c.naissance, c.responsable, c.cours, c.montant].filter((i) => i >= 0);
    expect(new Set(pris).size).toBe(pris.length);
  });

  it("une colonne inconnue n'est associée à rien", () => {
    const c = deviner(["Prénom", "Nom", "Couleur préférée"]);
    expect(c.email).toBe(-1);
    expect(c.montant).toBe(-1);
  });

  it("l'ordre des colonnes n'a pas d'importance", () => {
    const c = deviner(["Groupe", "Nom", "Montant réglé", "Prénom"]);
    expect(c.prenom).toBe(3);
    expect(c.nom).toBe(1);
    expect(c.cours).toBe(0);
    expect(c.montant).toBe(2);
  });
});

describe("dates de naissance", () => {
  it("accepte le format français et l'ISO", () => {
    expect(dateIso("14/03/1990")).toBe("1990-03-14");
    expect(dateIso("5/9/2015")).toBe("2015-09-05");
    expect(dateIso("1998-07-14")).toBe("1998-07-14");
    expect(dateIso("14-03-1990")).toBe("1990-03-14");
  });

  it("REFUSE une date qui n'existe pas — 30 février ne devient pas le 2 mars", () => {
    expect(dateIso("30/02/2001")).toBeNull();
    expect(dateIso("31/04/2020")).toBeNull();
    expect(dateIso("29/02/2021")).toBeNull(); // 2021 n'est pas bissextile
    expect(dateIso("29/02/2020")).toBe("2020-02-29"); // 2020 l'est
  });

  it("refuse le vide, le texte, une date future et une année aberrante", () => {
    expect(dateIso("")).toBeNull();
    expect(dateIso("bientôt")).toBeNull();
    expect(dateIso("14/03/2090")).toBeNull();
    expect(dateIso("14/03/1850")).toBeNull();
  });
});

describe("montants déjà réglés", () => {
  it("lit les écritures françaises et anglaises", () => {
    expect(montantCentimes("220,00")).toBe(22000);
    expect(montantCentimes("220.5")).toBe(22050);
    expect(montantCentimes("220 €")).toBe(22000);
    expect(montantCentimes("1 200,50")).toBe(120050);
    expect(montantCentimes("0")).toBe(0);
  });

  it("un montant illisible vaut zéro — jamais une somme inventée", () => {
    expect(montantCentimes("à voir")).toBe(0);
    expect(montantCentimes("")).toBe(0);
    expect(montantCentimes("-50")).toBe(0);
    expect(montantCentimes("=SOMME(A1)")).toBe(0);
  });
});

describe("emails", () => {
  it("valide, invalide, formule", () => {
    expect(emailValide(" camille.durand@exemple-o.example.org ")).toBe(true);
    expect(emailValide("pas-un-email")).toBe(false);
    expect(emailValide("=cmd|' /C calc'!A1")).toBe(false);
  });
});

describe("l'import suit les règles certifiées ailleurs", () => {
  const lire = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
  const migration = lire("supabase/migrations/20260804170000_import_adherents.sql");

  it("crée les pièces du dossier — sinon aucun adhérent importé n'est jamais incomplet", () => {
    expect(migration).toMatch(/insert into pieces_adherent/);
    // instantané `obligatoire` (règle produit du 04/08) et pièces mineurs
    expect(migration).toMatch(/obligatoire/);
    expect(migration).toMatch(/mineurs_seulement/);
  });

  it("respecte la capacité : verrou puis liste d'attente, comme l'inscription publique", () => {
    expect(migration).toMatch(/verrouiller_cours/);
    expect(migration).toMatch(/statuts_occupant_place/);
    expect(migration).toMatch(/liste_attente/);
  });

  it("lit le tarif en base et ne fait jamais confiance au montant du client", () => {
    expect(migration).toMatch(/select tarif_centimes[^;]*from cours where id = v_cours and organisation_id = p_org/);
  });

  it("garde le cloisonnement : appel réservé au club appelant ou au super-admin", () => {
    expect(migration).toMatch(/current_org_id\(\)/);
    expect(migration).toMatch(/is_super_admin\(\)/);
    expect(migration).toMatch(/revoke execute on function public\.importer_adherents/);
  });

  it("le RÔLE est contrôlé en base, pas seulement dans l'écran", () => {
    // Reproduit avant correction : un encadrant et un trésorier créaient des adhérents
    // en appelant la RPC directement par l'API REST, l'écran étant le seul obstacle.
    expect(migration).toMatch(/a_role_asso\(array\['admin_asso','secretaire'\]\)/);
  });

  it("l'action serveur appelle la nouvelle RPC, pas l'ancienne", () => {
    const actions = lire("src/app/[asso]/cockpit/adherents/actions.ts");
    expect(actions).toMatch(/rpc\("importer_adherents"/);
    expect(actions).not.toMatch(/rpc\("inserer_adherents_adhesions"/);
  });

  it("le bilan nomme les doublons au lieu de les additionner en silence", () => {
    const actions = lire("src/app/[asso]/cockpit/adherents/actions.ts");
    expect(actions).toMatch(/doublons\.push/);
    const ecran = lire("src/components/site/ImportAdherents.tsx");
    expect(ecran).toMatch(/DÉJÀ ADHÉRENTS/);
    expect(ecran).toMatch(/sansCours/);
    expect(ecran).toMatch(/listeAttente/);
  });

  it("l'écran envoie bien la naissance, le responsable et le montant", () => {
    const ecran = lire("src/components/site/ImportAdherents.tsx");
    expect(ecran).toMatch(/naissance: dateIso\(/);
    expect(ecran).toMatch(/responsable:/);
    expect(ecran).toMatch(/montantCentimes: montantCentimes\(/);
  });
});
