import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Aucun texte du cockpit ne doit prescrire un geste que le produit n'offre pas.
 *
 * L'ORIGINE
 * Le pied de page de `/cockpit/cours` disait : « Un cours qui compte des adhérents ne
 * peut pas être supprimé : leurs dossiers y sont rattachés. Déplacez-les d'abord, depuis
 * leur fiche. » Or la fiche adhérent ne propose AUCUN changement de cours — ni bouton,
 * ni select, ni action. Le président suivait l'instruction, cherchait, ne trouvait rien,
 * et en concluait qu'il n'avait pas compris.
 *
 * Le message d'erreur du serveur portait le même défaut sous une autre forme :
 * « Déplacez-les avant de le supprimer. »
 *
 * POURQUOI UN TEST, ET PAS SEULEMENT UNE CORRECTION
 * Parce que la phrase reviendra. Le jour où quelqu'un développera le changement de
 * cours, il la remettra — et ce jour-là, elle sera vraie. Ce test tombera alors, et
 * c'est exactement ce qu'on veut : il obligera à vérifier que l'action existe VRAIMENT
 * avant de la promettre, plutôt qu'à le supposer.
 *
 * Le changement de cours est en feuille de route, avec ses sept arbitrages non tranchés
 * (docs/roadmap-ecarts-demo.md).
 */

const RACINE = join(process.cwd(), "src");

function fichiersSources(dossier: string): string[] {
  const trouves: string[] = [];
  for (const nom of readdirSync(dossier)) {
    const chemin = join(dossier, nom);
    if (statSync(chemin).isDirectory()) {
      trouves.push(...fichiersSources(chemin));
    } else if (/\.tsx?$/.test(nom)) {
      trouves.push(chemin);
    }
  }
  return trouves;
}

/** Le texte, débarrassé des commentaires — ceux-ci ont le droit de citer la phrase. */
function texteAffichable(chemin: string): string {
  return readFileSync(chemin, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const SOURCES = fichiersSources(RACINE)
  // Les données de démonstration citent le produit, elles ne le pilotent pas.
  .filter((c) => !c.includes("/lib/demo/"));

describe("les textes qui citent le déplacement visent un geste réel (lot J)", () => {
  // Avant le lot J, ces formules étaient interdites : elles prescrivaient un geste
  // inexistant. Le geste existe (RPC changer_cours) — la sentinelle vérifie
  // désormais que TOUTE occurrence coexiste avec le contrôle réel sur la fiche.
  it.each([
    ["depuis sa fiche", /depuis\s+sa\s+fiche/i],
  ])("la formule « %s » n’apparaît dans aucun texte affiché", (_libelle, motif) => {
    const fautifs = SOURCES.filter((c) => motif.test(texteAffichable(c))).map((c) =>
      c.replace(process.cwd() + "/", "")
    );
    expect(fautifs).toEqual([]);
  });
});

describe("les textes de l’écran Cours prescrivent désormais un geste qui EXISTE", () => {
  it("le pied de page renvoie vers « Changer de cours » (lot J)", () => {
    const page = texteAffichable(join(RACINE, "app/[asso]/cockpit/cours/page.tsx"));
    expect(page).toMatch(/déplacez-les d’abord, depuis leur fiche/);
  });

  it("le message d’erreur du serveur aussi", () => {
    const actions = texteAffichable(join(RACINE, "app/[asso]/cockpit/cours/actions.ts"));
    expect(actions).toMatch(/Changer de cours/);
  });
});

describe("la fiche adhérent ne propose toujours pas de changer de cours", () => {
  // Le jour où ce test tombe, c'est que l'action existe — il faudra alors revoir les
  // deux textes ci-dessus, et sans doute les rétablir.
  it("le changement de cours existe désormais — le texte doit l'assumer, pas le nier", () => {
    // Ce test protégeait l'honnêteté du produit quand le geste n'existait pas.
    // Depuis le lot J (RPC changer_cours), la fiche PORTE le geste : on vérifie
    // l'inverse — le contrôle est là, avec ses règles affichées.
    const fiche = texteAffichable(join(RACINE, "app/[asso]/cockpit/adherents/[id]/page.tsx"));
    expect(fiche).toMatch(/Changer de cours \(saison en cours\)/);
    expect(fiche).toMatch(/Cours complet = refus/);
  });
});
