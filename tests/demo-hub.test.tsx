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
      <button onClick={() => envoyer({ type: "reinitialiser" })}>reinitialiser</button>
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
/**
 * Le nombre affiché à côté d'un libellé de priorité.
 *
 * Le hub a été aligné sur la hiérarchie du cockpit réel (lot R) : les trois cartes
 * ont laissé place aux lignes « À TRAITER MAINTENANT » / « À SURVEILLER ». Le repère
 * change, l'intention de ces tests ne change pas — les chiffres doivent bouger quand
 * le visiteur agit, sinon la démonstration est une maquette.
 */
const compteur = (label: RegExp) => {
  const el = screen.queryByText(label);
  if (!el) return "0"; // une priorité à zéro n'est pas affichée : c'est la règle du produit
  return el.previousElementSibling?.textContent ?? "0";
};

/**
 * LA HIÉRARCHIE DES PRIORITÉS — la même que le cockpit réel.
 *
 * Ces tests remplacent ceux qui décrivaient les trois cartes de l'accueil. Cette
 * disposition-là n'existe plus : elle datait d'avant la refonte du cockpit (#15), et
 * la démonstration montrait donc au prospect un écran que le produit n'a plus. Ce
 * n'est pas un détail de mise en page — c'est la démonstration qui cessait de
 * raconter le fonctionnement réel.
 *
 * L'intention des anciens tests est intégralement conservée : les chiffres doivent
 * BOUGER quand le visiteur agit, sinon la démonstration est une maquette. Elle est
 * ici étendue au classement (urgent / secondaire), à la disparition d'une priorité
 * retombée à zéro, et à la restitution exacte de l'état initial.
 */

/** Le nombre affiché à gauche d'un libellé de priorité, ou `null` si la ligne est absente. */
const nombreDe = (libelle: RegExp): number | null => {
  const el = screen.queryByText(libelle);
  if (!el) return null;
  const n = el.previousElementSibling?.textContent ?? "";
  return n.trim() === "" ? null : Number(n);
};

/** Le bloc (« À TRAITER MAINTENANT » ou « À SURVEILLER ») qui contient un libellé. */
const blocDe = (libelle: RegExp): string | null => {
  const el = screen.queryByText(libelle);
  if (!el) return null;
  let n: HTMLElement | null = el as HTMLElement;
  for (let i = 0; i < 8 && n; i++) {
    const t = n.textContent ?? "";
    if (/À TRAITER MAINTENANT/.test(t)) return "traiter";
    if (/À SURVEILLER/.test(t)) return "surveiller";
    n = n.parentElement;
  }
  return null;
};

/** Le lien d'action porté par une ligne de priorité : sa destination et son libellé. */
const actionDe = (libelle: RegExp): { href: string; action: string } | null => {
  const el = screen.queryByText(libelle);
  const lien = el?.closest("a");
  if (!lien) return null;
  const spans = lien.querySelectorAll("span");
  const action = spans[spans.length - 1]?.textContent?.trim() ?? "";
  return { href: lien.getAttribute("href") ?? "", action };
};

describe("les priorités de la démonstration, calculées comme celles du cockpit", () => {
  it("1 — les données initiales produisent les priorités attendues", () => {
    avecLeviers();
    expect(nombreDe(/cotisations? en retard/)).toBeGreaterThan(0);
    expect(nombreDe(/dossiers? incomplets?/)).toBeGreaterThan(0);
    expect(nombreDe(/règlements? attendus?/)).toBeGreaterThan(0);
    expect(document.querySelector("h1")?.textContent).toMatch(/chose[s]? à traiter\.|Le club est à jour\./);
  });

  it("2 — ce qui bloque quelqu'un aujourd'hui est sous « À traiter maintenant »", () => {
    avecLeviers();
    expect(blocDe(/cotisations? en retard/)).toBe("traiter");
    expect(blocDe(/dossiers? incomplets?/)).toBe("traiter");
  });

  it("3 — ce qui n'est pas urgent est sous « À surveiller »", () => {
    avecLeviers();
    expect(blocDe(/règlements? attendus?/)).toBe("surveiller");
    expect(blocDe(/cours complets?/)).toBe("surveiller");
  });

  it("4 — les nombres suivent l'état : encaisser, relancer, recevoir une pièce", () => {
    avecLeviers();

    const retardAvant = nombreDe(/cotisations? en retard/)!;
    expect(retardAvant).toBeGreaterThan(0);
    clic("regler-retard");
    expect(nombreDe(/cotisations? en retard/)).toBe(retardAvant - 1);

    const attenteAvant = nombreDe(/règlements? attendus?/)!;
    expect(attenteAvant).toBeGreaterThan(0);
    clic("regler-attente");
    expect(nombreDe(/règlements? attendus?/)).toBe(attenteAvant - 1);

    const incompletsAvant = nombreDe(/dossiers? incomplets?/)!;
    clic("recevoir-piece");
    const apres = nombreDe(/dossiers? incomplets?/);
    expect(apres === null || apres <= incompletsAvant).toBe(true);
  });

  it("5 — une priorité retombée à zéro n'est plus présentée : elle disparaît", () => {
    avecLeviers();
    expect(nombreDe(/dossiers? incomplets?/)).toBeGreaterThan(0);

    clic("recevoir-tout");

    // Règle du produit : ne PAS afficher un zéro. Un cockpit calme doit être
    // visiblement calme, pas une colonne de zéros à interpréter.
    expect(screen.queryByText(/dossiers? incomplets?/)).toBeNull();
    expect(document.body.textContent).not.toMatch(/\b0\s+dossiers? incomplets?/);
  });

  it("6 — la réinitialisation restitue exactement l'état initial", () => {
    avecLeviers();
    const initial = {
      retard: nombreDe(/cotisations? en retard/),
      incomplets: nombreDe(/dossiers? incomplets?/),
      attendus: nombreDe(/règlements? attendus?/),
      titre: document.querySelector("h1")?.textContent ?? "",
    };

    clic("regler-retard");
    clic("recevoir-tout");
    expect(nombreDe(/cotisations? en retard/)).not.toBe(initial.retard);

    clic("reinitialiser");

    expect(nombreDe(/cotisations? en retard/)).toBe(initial.retard);
    expect(nombreDe(/dossiers? incomplets?/)).toBe(initial.incomplets);
    expect(nombreDe(/règlements? attendus?/)).toBe(initial.attendus);
    expect(document.querySelector("h1")?.textContent).toBe(initial.titre);
  });

  it("7 — libellés et destinations sont ceux du cockpit, transposés à /demo", () => {
    avecLeviers();
    expect(actionDe(/cotisations? en retard/)).toEqual({
      href: "/demo/adherents?statut=en_retard",
      action: "VOIR LES DOSSIERS →",
    });
    expect(actionDe(/dossiers? incomplets?/)).toEqual({
      href: "/demo/adherents?dossier=incomplet",
      action: "VOIR LES DOSSIERS →",
    });
    expect(actionDe(/règlements? attendus?/)).toEqual({
      href: "/demo/adherents?statut=en_attente",
      action: "VOIR →",
    });
    for (const a of Array.from(document.querySelectorAll('a[href^="/"]'))) {
      const h = a.getAttribute("href") ?? "";
      expect(h.startsWith("/demo") || h === "/creer" || h === "/", `lien hors démo : ${h}`).toBe(true);
    }
  });
});

describe("la démonstration ne réimplémente pas la logique du produit", () => {
  const SOURCE = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
  const RAIL = readFileSync(join(process.cwd(), "src/app/demo/RailDemo.tsx"), "utf8");
  const sansCommentaires = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

  it("SENTINELLE — le classement vient de `calculerPriorites`, jamais d'un tri maison", () => {
    const code = sansCommentaires(SOURCE);
    expect(code).toMatch(/from ["']@\/lib\/priorites["']/);
    expect(code).toMatch(/calculerPriorites\(/);
    expect(code).toMatch(/resumeAttention\(/);
    // Le classement doit LIRE `niveau`, pas le recalculer depuis des seuils écrits
    // dans l'écran : deux logiques finiraient par diverger, et la démonstration
    // mentirait sans que rien ne le signale.
    expect(code).toMatch(/niveau === "traiter"/);
    expect(code).toMatch(/niveau === "surveiller"/);
    // Un niveau décidé dans l'écran (« si enRetard > 3 alors urgent ») serait un
    // second calcul : c'est cela qu'on interdit, pas l'affichage d'un compteur.
    expect(code, "le niveau ne doit pas être décidé dans l'écran").not.toMatch(/niveau\s*[:=]\s*["'`]/);
    expect(code, "aucun tri maison sur les priorités").not.toMatch(/priorites\.sort\(|\.sort\(\(a, b\) =>/);
  });

  it("SENTINELLE — les compteurs viennent des sélecteurs, aucun nombre en dur", () => {
    const code = sansCommentaires(SOURCE);
    expect(code).toMatch(/chiffresDuClub\(etat\)/);
    for (const m of code.match(/nombre=\{[^}]*\}/g) ?? []) {
      expect(m).not.toMatch(/nombre=\{\d+\}/);
    }
  });

  it("SENTINELLE — la hiérarchie affichée est celle du cockpit, pas trois cartes", () => {
    const code = sansCommentaires(SOURCE);
    expect(code).toMatch(/À TRAITER MAINTENANT/);
    expect(code).toMatch(/À SURVEILLER/);
    expect(code).not.toMatch(/DOSSIERS? À TERMINER|COTISATIONS? À RELANCER/);
  });

  it("« Le club aujourd’hui » porte les lignes du produit, pas les miennes", () => {
    expect(sansCommentaires(SOURCE)).toMatch(/LE CLUB AUJOURD/);
  });

  it("le rail ne porte pas de montant encaissé", () => {
    expect(sansCommentaires(RAIL)).not.toMatch(/encaisse|montant/i);
  });

  it("aucun geste inerte sur le hub", () => {
    avecLeviers();
    for (const a of Array.from(document.querySelectorAll("a"))) {
      expect((a.getAttribute("href") ?? "").length, `lien sans destination : ${a.textContent}`).toBeGreaterThan(0);
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
        const n = compteur(/nouvelles? inscriptions? cette semaine/);
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
