// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { Button, ButtonLink, classesBouton } from "../src/components/ui/Button";
import { EtatVide } from "../src/components/ui/EtatVide";
import { StatutBadge, PieceBadge, libelleAdhesion } from "../src/components/ui/StatutBadge";

// S6 — comportement, pas apparence : ces tests vérifient la sémantique HTML et les
// garanties d'usage, jamais une chaîne exacte de classes Tailwind.

describe("Button — un vrai bouton", () => {
  it("rend un élément <button>, pas un lien déguisé", () => {
    render(<Button>Enregistrer le paiement</Button>);
    expect(screen.getByRole("button", { name: "Enregistrer le paiement" }).tagName).toBe("BUTTON");
  });

  it("laisse passer type=submit — les formulaires Server Actions en dépendent", () => {
    render(
      <form>
        <Button type="submit">Envoyer la relance</Button>
      </form>
    );
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
  });

  it("désactivé : réellement inerte pour le clavier et la souris", () => {
    render(<Button disabled>Ajouter l’adhérent</Button>);
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(true);
  });

  it("garantit la cible tactile de 44px par défaut — compact la retire sciemment", () => {
    expect(classesBouton("primary")).toContain("min-h-[44px]");
    expect(classesBouton("primary", { compact: true })).not.toContain("min-h-[44px]");
  });
});

describe("ButtonLink — un vrai lien", () => {
  it("rend un élément <a> avec son href : navigation, clavier, nouvel onglet préservés", () => {
    render(<ButtonLink href="/club-a/cockpit/adherents/nouveau">Ajouter</ButtonLink>);
    const lien = screen.getByRole("link", { name: "Ajouter" });
    expect(lien.tagName).toBe("A");
    expect(lien.getAttribute("href")).toBe("/club-a/cockpit/adherents/nouveau");
  });
});

describe("EtatVide — jamais une impasse", () => {
  it("affiche le titre, le détail, et l'action quand elle existe", () => {
    render(
      <EtatVide
        titre="Aucun adhérent pour l’instant."
        detail="Ils apparaîtront ici dès la première inscription."
        action={{ href: "/club-a/cockpit/adherents/nouveau", label: "AJOUTER LE PREMIER ADHÉRENT →" }}
      />
    );
    expect(screen.getByText("Aucun adhérent pour l’instant.")).toBeTruthy();
    expect(screen.getByRole("link", { name: "AJOUTER LE PREMIER ADHÉRENT →" }).getAttribute("href")).toBe("/club-a/cockpit/adherents/nouveau");
  });

  it("sans action : aucun lien fantôme", () => {
    render(<EtatVide titre="Tout le monde est à jour." />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

describe("StatutBadge — lisible sans la couleur", () => {
  it("chaque statut d'adhésion porte un libellé textuel", () => {
    render(<StatutBadge statut="en_retard" />);
    expect(screen.getByText("En retard")).toBeTruthy();
  });

  it("les pièces aussi", () => {
    render(<PieceBadge statut="manquante" />);
    expect(screen.getByText("Manquante")).toBeTruthy();
  });

  it("la table exportée est LA source des libellés texte (liste = fiche = badge)", () => {
    expect(libelleAdhesion("annule")).toBe("Annulé");
    expect(libelleAdhesion("liste_attente")).toBe("Liste d’attente");
  });
});

describe("S6 — les anciennes variantes manuelles ne reviennent pas dans les écrans migrés", () => {
  const MIGRES = [
    "src/app/[asso]/cockpit/page.tsx",
    "src/app/[asso]/cockpit/adherents/page.tsx",
    "src/app/[asso]/cockpit/adherents/[id]/page.tsx",
    "src/app/[asso]/cockpit/cours/page.tsx",
    "src/app/[asso]/cockpit/paiements/page.tsx",
    "src/app/[asso]/espace/page.tsx",
  ];
  // Le motif d'un bouton primaire/secondaire recodé à la main : bg-ink ou border-ink
  // dans la classe d'un <button> ou <Link> natif. Les composants ui/ sont la seule
  // implémentation autorisée de ce motif dans les écrans migrés.
  const interdit = /<(button|Link)[^>]*className="[^"]*(bg-ink |border border-ink )/;

  for (const f of MIGRES) {
    it(`${f} ne recode plus de bouton à la main`, () => {
      const src = readFileSync(join(__dirname, "..", f), "utf8");
      expect(src).not.toMatch(interdit);
    });
  }
});
