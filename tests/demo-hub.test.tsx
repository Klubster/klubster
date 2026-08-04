// @vitest-environment happy-dom

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render, screen, act } from "@testing-library/react";
import DemoLayout from "@/app/demo/layout";
import DemoAujourdhui from "@/app/demo/page";
import { DemoProvider, useDemo } from "@/components/demo/DemoProvider";

/**
 * Le hub : rail fidèle, chiffres vivants.
 *
 * DEUX CHOSES SE JOUENT ICI
 *
 * 1. LA FIDÉLITÉ DU RAIL. La première démonstration inventait une entrée `ADHÉRENTS` et
 *    oubliait `06 ACTUALITÉS`. Personne ne l'avait vu pendant des semaines, parce qu'un
 *    rail plausible ne se relit pas. Ces tests comparent les sept entrées une par une.
 *
 * 2. LES CHIFFRES VIVANTS. Un hub dont les compteurs sont écrits en dur meurt au premier
 *    geste : le visiteur ajoute un adhérent, rien ne bouge, et il comprend qu'il regarde
 *    une image. On vérifie donc qu'ils changent — c'est la différence entre une
 *    simulation et une maquette.
 */

const hub = () =>
  render(
    <DemoLayout>
      <DemoAujourdhui />
    </DemoLayout>
  );

describe("le rail — sept entrées, celles du produit", () => {
  const ATTENDUES = [
    ["01", "AUJOURD’HUI", "/demo"],
    ["02", "INSCRIPTIONS", "/demo/inscriptions"],
    ["03", "CONTRÔLE", "/demo/controle"],
    ["04", "PAIEMENTS", "/demo/paiements"],
    ["05", "MESSAGES", "/demo/messages"],
    ["06", "ACTUALITÉS", "/demo/actualites"],
    ["07", "SITE", "/demo/site"],
  ] as const;

  it("les sept, dans l’ordre, avec leur numéro", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    const liens = Array.from(rail.querySelectorAll("a"));
    expect(liens).toHaveLength(7);
    liens.forEach((lien, i) => {
      const [n, label, href] = ATTENDUES[i];
      expect(lien.textContent).toContain(`${n} ${label}`);
      expect(lien.getAttribute("href")).toBe(href);
    });
  });

  it("aucune entrée ADHÉRENTS — elle n’existe pas dans le rail réel", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.textContent).not.toMatch(/ADHÉRENTS/);
  });

  it("ACTUALITÉS est bien présente — la première version l’oubliait", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.textContent).toContain("06 ACTUALITÉS");
  });

  it("l’entrée courante est signalée aux lecteurs d’écran, pas seulement en gras", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    const actifs = rail.querySelectorAll('a[aria-current="page"]');
    expect(actifs).toHaveLength(1);
    expect(actifs[0].getAttribute("href")).toBe("/demo");
  });

  it("chaque entrée atteint la cible tactile de 44 px", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    for (const lien of Array.from(rail.querySelectorAll("a"))) {
      expect(lien.className).toContain("min-h-[44px]");
    }
  });

  it("le rail défile horizontalement sur mobile et devient colonne au-delà", () => {
    hub();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.className).toContain("overflow-x-auto");
    expect(rail.className).toContain("md:block");
  });
});

describe("ADHÉRENTS s’atteint par un geste, pas par le rail", () => {
  it("le geste « Gérer les adhérents » mène à /demo/adherents", () => {
    hub();
    const lien = screen.getByText("Gérer les adhérents").closest("a");
    expect(lien?.getAttribute("href")).toBe("/demo/adherents");
  });

  it("les gestes pointent vers de vraies routes de démonstration", () => {
    hub();
    for (const [titre, href] of [
      ["Cours et tarifs", "/demo/cours"],
      ["Envoyer un message", "/demo/messages"],
      ["Encaisser une cotisation", "/demo/paiements"],
      ["Faire l'appel", "/demo/controle"],
      ["Publier une actualité", "/demo/actualites"],
      ["Modifier le site", "/demo/site"],
      ["Formulaire d'inscription", "/demo/inscriptions"],
      ["Importer vos adhérents", "/demo/adherents/import"],
    ] as const) {
      expect(screen.getByText(titre).closest("a")?.getAttribute("href")).toBe(href);
    }
  });
});

/** Un enfant qui agit, monté à côté du hub dans le même provider. */
function Leviers() {
  const { etat, envoyer } = useDemo();
  const manquantes = etat.pieces.filter((p) => p.statut !== "recue");
  return (
    <>
      <button
        onClick={() =>
          envoyer({
            type: "adherent/ajouter",
            prenom: "Zoé",
            nom: "Nouvelle",
            email: "zoe@example.com",
            telephone: "",
            coursId: "c1",
            mode: "cheque",
          })
        }
      >
        ajouter-adherent
      </button>
      <button onClick={() => envoyer({ type: "piece/basculer", id: "a03-certificat" })}>recevoir-piece</button>
      {/* Reçoit TOUTES les pièces manquantes d'un coup : c'est le seul moyen de voir
          disparaître la ligne « pièces attendues », qui n'existe que si le compte est
          supérieur à zéro. */}
      <button onClick={() => manquantes.forEach((p) => envoyer({ type: "piece/basculer", id: p.id }))}>
        recevoir-tout
      </button>
      <button
        onClick={() => envoyer({ type: "reglement/ajouter", adhesionId: "ad04", montantCentimes: 31300, mode: "cheque", note: null })}
      >
        regler-retard
      </button>
      <button
        onClick={() => envoyer({ type: "reglement/ajouter", adhesionId: "ad02", montantCentimes: 31300, mode: "cheque", note: null })}
      >
        regler-attente
      </button>
    </>
  );
}

const avecLeviers = () =>
  render(
    <DemoProvider>
      <DemoAujourdhui />
      <Leviers />
    </DemoProvider>
  );

const clic = (t: string) => act(() => screen.getByText(t).click());
const compteur = (label: RegExp) => screen.getByText(label).previousElementSibling?.textContent;

describe("les chiffres du hub bougent quand on agit", () => {
  it("ajouter un adhérent augmente les dossiers à terminer ET les inscriptions récentes", () => {
    avecLeviers();
    const attenteAvant = Number(compteur(/DOSSIERS? À TERMINER/));
    const recentesAvant = Number(compteur(/INSCRIPTIONS? · 7 JOURS/));

    clic("ajouter-adherent");

    // L'adhésion naît « en attente » ET porte la date du jour : les deux cartes bougent.
    expect(Number(compteur(/DOSSIERS? À TERMINER/))).toBe(attenteAvant + 1);
    expect(Number(compteur(/INSCRIPTIONS? · 7 JOURS/))).toBe(recentesAvant + 1);
  });

  it("la ligne « nouvelle inscription cette semaine » apparaît", () => {
    avecLeviers();
    // Toutes les inscriptions du club datent de septembre : au départ, aucune récente.
    expect(screen.getByText(/Pas de nouvelle inscription cette semaine/)).toBeTruthy();
    clic("ajouter-adherent");
    expect(screen.getByText(/1 nouvelle inscription cette semaine/)).toBeTruthy();
  });

  it("régler une cotisation en retard fait baisser le second compteur", () => {
    avecLeviers();
    const avant = Number(compteur(/COTISATIONS? À RELANCER/));
    expect(avant).toBeGreaterThan(0);

    clic("regler-retard");
    expect(Number(compteur(/COTISATIONS? À RELANCER/))).toBe(avant - 1);
  });

  it("encaisser une adhésion en attente fait baisser le premier compteur", () => {
    avecLeviers();
    const avant = Number(compteur(/DOSSIERS? À TERMINER/));
    expect(avant).toBeGreaterThan(0);

    clic("regler-attente");
    expect(Number(compteur(/DOSSIERS? À TERMINER/))).toBe(avant - 1);
  });

  it("recevoir la dernière pièce fait DISPARAÎTRE la ligne des pièces attendues", () => {
    avecLeviers();
    expect(screen.getByText(/pièces? de dossier attendues?/)).toBeTruthy();

    clic("recevoir-tout");
    // La ligne n'est pas mise à zéro : elle n'est plus rendue du tout, comme dans le
    // produit où elle est conditionnée à `piecesAttendues > 0`.
    expect(screen.queryByText(/pièces? de dossier attendues?/)).toBeNull();
  });

  it("la phrase d’état suit les pièces reçues", () => {
    avecLeviers();
    const titre = () => document.querySelector("h1")?.textContent ?? "";
    const avant = Number(titre().match(/^(\d+)/)?.[1]);
    clic("recevoir-piece");
    expect(Number(titre().match(/^(\d+)/)?.[1])).toBe(avant - 1);
  });
});

describe("fidélité au cockpit — les écarts déjà commis une fois", () => {
  const SOURCE = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
  const RAIL = readFileSync(join(process.cwd(), "src/app/demo/RailDemo.tsx"), "utf8");
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("l’attention compte les PIÈCES attendues, pas les dossiers incomplets", () => {
    // Un adhérent à qui il manque deux pièces ne compte pas pour un.
    expect(sansCommentaires(SOURCE)).toMatch(/c\.enAttente \+ c\.enRetard \+ c\.piecesAttendues/);
    expect(sansCommentaires(SOURCE)).not.toMatch(/attention = [^;]*dossiersIncomplets/);
  });

  it("la troisième carte est « INSCRIPTIONS · 7 JOURS »", () => {
    avecLeviers();
    const cartes = Array.from(document.querySelectorAll('a[href^="/demo"]'))
      .filter((a) => a.querySelector(".mono.text-\\[34px\\]"))
      .map((a) => a.textContent ?? "");
    expect(cartes).toHaveLength(3);
    expect(cartes[0]).toMatch(/DOSSIERS? À TERMINER/);
    expect(cartes[1]).toMatch(/COTISATIONS? À RELANCER/);
    expect(cartes[2]).toMatch(/INSCRIPTIONS? · 7 JOURS/);
    expect(cartes[2]).toMatch(/VÉRIFIER/);
    expect(cartes.join(" ")).not.toMatch(/INCOMPLET/);
  });

  it("« Le club aujourd’hui » porte les lignes du produit, pas les miennes", () => {
    avecLeviers();
    const bloc = screen.getByText(/LE CLUB AUJOURD/).parentElement?.textContent ?? "";
    // Les cinq lignes réelles.
    expect(bloc).toMatch(/inscription/i);
    expect(bloc).toMatch(/cotisation/i);
    expect(bloc).toMatch(/dossiers? en attente de règlement/i);
    expect(bloc).toMatch(/pièces? de dossier attendues?/i);
    // Et aucune des six que j'avais inventées.
    expect(bloc).not.toMatch(/adhérents cette saison/i);
    expect(bloc).not.toMatch(/chèques? en attente de remise/i);
    expect(bloc).not.toMatch(/liste d’attente/i);
    expect(bloc).not.toMatch(/à encaisser/i);
  });

  it("le rail ne porte pas de montant encaissé", () => {
    avecLeviers();
    const rail = screen.getByRole("navigation", { name: "Sections du cockpit" });
    expect(rail.textContent).toContain("✓ reversée direct");
    expect(rail.textContent).toContain("0 % commission");
    expect(rail.textContent).not.toMatch(/encaissé/i);
    expect(rail.textContent).not.toMatch(/€/);
    expect(sansCommentaires(RAIL)).not.toMatch(/chiffresDuClub|eur\(/);
  });

  it("aucun bloc « DANS VOTRE CLUB, PAS DANS LA DÉMONSTRATION »", () => {
    avecLeviers();
    expect(screen.queryByText(/DANS VOTRE CLUB, PAS DANS LA DÉMONSTRATION/)).toBeNull();
  });

  it("aucun geste inerte sur le hub", () => {
    // Stripe, domaine et équipe appartiennent au bloc « Premiers pas », qui disparaît
    // dès qu'un club a un adhérent. Celui-ci en a trente-quatre.
    expect(sansCommentaires(SOURCE)).not.toMatch(/GesteInerte/);
  });
});

describe("aucun chiffre écrit en dur dans le hub", () => {
  const SOURCE = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("les compteurs viennent des sélecteurs", () => {
    expect(SOURCE).toMatch(/chiffresDuClub\(etat\)/);
  });

  it("aucun nombre à deux chiffres ou plus dans un libellé de carte", () => {
    // Le piège du CLAUDE.md : « 312 adhérents cette saison » écrit en dur, qui devient
    // faux dès le lendemain. Ici, il rendrait surtout la démonstration morte.
    const cartes = SOURCE.match(/<Carte[\s\S]*?\/>/g) ?? [];
    expect(cartes.length).toBeGreaterThan(0);
    for (const c of cartes) {
      expect(c).toMatch(/n=\{String\(c\./);
      expect(c).not.toMatch(/n="\d+"/);
    }
  });
});

describe("la date affichée — juste, et la même partout", () => {
  it("le 20 octobre 2026 est un MARDI", () => {
    hub();
    const kicker = screen.getByText(/OCTOBRE/).textContent ?? "";
    expect(kicker).toContain("MARDI 20 OCTOBRE");
    // La version précédente l'écrivait en dur, et se trompait de jour.
    expect(kicker).not.toContain("LUNDI");
  });

  it("le cours affiché est celui du mardi, pas celui du lundi", () => {
    hub();
    const bloc = screen.getByText(/LE CLUB AUJOURD/).parentElement?.textContent ?? "";
    // Mardi 12:30 → Vinyasa Flow. Lundi 18:30 → Hatha Yoga : un jour faux se serait vu
    // dans le nom du cours avant de se voir dans la date.
    expect(bloc).toContain("Vinyasa Flow");
    expect(bloc).not.toContain("Hatha Yoga");
  });

  it("le fuseau de la machine ne change ni le jour ni les cours", () => {
    // Le vrai défaut : `new Date("2026-10-20")` est lu à minuit UTC. À Los Angeles il
    // était encore le 19 — un lundi — et le hub affichait les cours du lundi.
    const tzOriginal = process.env.TZ;
    const releve = () => {
      const vue = render(
        <DemoLayout>
          <DemoAujourdhui />
        </DemoLayout>
      );
      const kicker = screen.getByText(/OCTOBRE/).textContent ?? "";
      const bloc = screen.getByText(/LE CLUB AUJOURD/).parentElement?.textContent ?? "";
      vue.unmount();
      return { kicker, coursCite: /Vinyasa Flow/.test(bloc) };
    };

    try {
      const fuseaux = ["Europe/Paris", "America/Los_Angeles", "Pacific/Auckland", "UTC"];
      const releves = fuseaux.map((tz) => {
        process.env.TZ = tz;
        return releve();
      });
      // Tous identiques, et tous justes.
      for (const r of releves) {
        expect(r.kicker).toContain("MARDI 20 OCTOBRE");
        expect(r.coursCite).toBe(true);
      }
    } finally {
      process.env.TZ = tzOriginal;
    }
  });

  it("les inscriptions récentes ne glissent pas non plus avec le fuseau", () => {
    // `setDate`/`getDate` lisent le calendrier LOCAL : sur une date à minuit UTC, ils
    // renvoient la veille à l'ouest de Greenwich, et la fenêtre de sept jours bougeait.
    const tzOriginal = process.env.TZ;
    try {
      const comptes = ["Europe/Paris", "America/Los_Angeles", "Pacific/Auckland"].map((tz) => {
        process.env.TZ = tz;
        const vue = render(
          <DemoLayout>
            <DemoAujourdhui />
          </DemoLayout>
        );
        const n = compteur(/INSCRIPTIONS? · 7 JOURS/);
        vue.unmount();
        return n;
      });
      expect(new Set(comptes).size).toBe(1);
    } finally {
      process.env.TZ = tzOriginal;
    }
  });
});

describe("le rail n’est rendu que par /demo", () => {
  it("le hub l’importe", () => {
    const source = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
    expect(source).toMatch(/import RailDemo from "\.\/RailDemo"/);
  });

  it("le layout ne l’importe pas", () => {
    const source = readFileSync(join(process.cwd(), "src/app/demo/layout.tsx"), "utf8");
    expect(source).not.toMatch(/RailDemo/);
  });

  it("monter le layout sans le hub ne montre aucun rail", () => {
    render(
      <DemoLayout>
        <p>une sous-page</p>
      </DemoLayout>
    );
    expect(screen.queryByRole("navigation", { name: "Sections du cockpit" })).toBeNull();
  });
});
