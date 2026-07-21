import { describe, it, expect } from "vitest";
import { peut, libelleRole, ROLES, type RoleAsso, type Action } from "@/lib/roles";

/**
 * La matrice des rôles ne servait qu'à masquer des boutons ; elle garde désormais les
 * actions serveur (lib/garde.ts). Une erreur ici ne cache plus un bouton : elle ouvre
 * l'export des adhérents ou l'envoi en masse à quelqu'un qui n'y a pas droit.
 *
 * On teste donc la matrice entière, case par case — y compris les « non », qui sont
 * l'essentiel du sujet.
 */

const TOUTES: Action[] = [
  "paiements", "sante", "adherents_ecriture", "controle", "site", "messages", "equipe",
];

const ATTENDU: Record<RoleAsso, Action[]> = {
  admin_asso: ["paiements", "sante", "adherents_ecriture", "controle", "site", "messages", "equipe"],
  tresorier: ["paiements"],
  secretaire: ["sante", "adherents_ecriture", "site", "messages"],
  encadrant: ["controle"],
  lecture: [],
};

describe("peut() — matrice complète", () => {
  for (const [role, autorisees] of Object.entries(ATTENDU) as [RoleAsso, Action[]][]) {
    for (const action of TOUTES) {
      const doit = autorisees.includes(action);
      it(`${role} ${doit ? "peut" : "ne peut pas"} « ${action} »`, () => {
        expect(peut(role, action)).toBe(doit);
      });
    }
  }
});

describe("peut() — cas particuliers", () => {
  it("le super-admin peut tout", () => {
    for (const action of TOUTES) expect(peut("super_admin", action)).toBe(true);
  });

  it("un rôle inconnu ne peut rien", () => {
    // Un rôle inventé ou renommé ne doit jamais ouvrir de droits par accident.
    for (const action of TOUTES) expect(peut("bidouille", action)).toBe(false);
  });

  it("null et undefined ne peuvent rien", () => {
    for (const action of TOUTES) {
      expect(peut(null, action)).toBe(false);
      expect(peut(undefined, action)).toBe(false);
    }
  });

  it("le rôle « adherent » n'a aucun droit d'équipe", () => {
    // Un adhérent possède un compte : il ne doit jamais hériter des droits du club.
    for (const action of TOUTES) expect(peut("adherent", action)).toBe(false);
  });

  it("« lecture » ne peut écrire nulle part", () => {
    expect(peut("lecture", "adherents_ecriture")).toBe(false);
    expect(peut("lecture", "paiements")).toBe(false);
    expect(peut("lecture", "site")).toBe(false);
    expect(peut("lecture", "messages")).toBe(false);
  });

  it("le trésorier n'accède pas aux données de santé", () => {
    // Séparation voulue : l'argent d'un côté, le médical de l'autre.
    expect(peut("tresorier", "paiements")).toBe(true);
    expect(peut("tresorier", "sante")).toBe(false);
  });

  it("l'encadrant ne touche ni à l'argent ni aux adhérents", () => {
    expect(peut("encadrant", "controle")).toBe(true);
    expect(peut("encadrant", "paiements")).toBe(false);
    expect(peut("encadrant", "adherents_ecriture")).toBe(false);
  });

  it("seul le président gère l'équipe", () => {
    expect(peut("admin_asso", "equipe")).toBe(true);
    for (const r of ["tresorier", "secretaire", "encadrant", "lecture"]) {
      expect(peut(r, "equipe")).toBe(false);
    }
  });
});

describe("libelleRole()", () => {
  it("nomme chaque rôle connu", () => {
    for (const r of ROLES) expect(libelleRole(r.cle)).toBe(r.label);
  });
  it("retombe sur « Membre » pour un rôle inconnu", () => {
    expect(libelleRole("inconnu")).toBe("Membre");
    expect(libelleRole(null)).toBe("Membre");
  });
});
