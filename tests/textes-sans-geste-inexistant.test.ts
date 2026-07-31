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

describe("aucun texte n’envoie déplacer un adhérent depuis sa fiche", () => {
  it.each([
    ["depuis leur fiche", /depuis\s+leur\s+fiche/i],
    ["depuis sa fiche", /depuis\s+sa\s+fiche/i],
    ["Déplacez-les", /D[ée]placez[- ]les/i],
    ["Déplacez-le", /D[ée]placez[- ]le\b/i],
  ])("la formule « %s » n’apparaît dans aucun texte affiché", (_libelle, motif) => {
    const fautifs = SOURCES.filter((c) => motif.test(texteAffichable(c))).map((c) =>
      c.replace(process.cwd() + "/", "")
    );
    expect(fautifs).toEqual([]);
  });
});

describe("les deux textes corrigés disent le fait, sans prescrire", () => {
  it("le pied de page de l’écran Cours s’arrête au constat", () => {
    const page = texteAffichable(join(RACINE, "app/[asso]/cockpit/cours/page.tsx"));
    expect(page).toMatch(/Un cours qui compte des adhérents ne peut pas être supprimé/);
    // Et rien après le point : pas de consigne, pas de renvoi vers un écran.
    expect(page).toMatch(/leurs dossiers y sont rattachés\.\s*\n?\s*<\/p>/);
  });

  it("le message d’erreur du serveur non plus", () => {
    const actions = texteAffichable(join(RACINE, "app/[asso]/cockpit/cours/actions.ts"));
    expect(actions).toMatch(/leurs dossiers y sont rattachés/);
    expect(actions).not.toMatch(/avant de le supprimer/);
  });
});

describe("la fiche adhérent ne propose toujours pas de changer de cours", () => {
  // Le jour où ce test tombe, c'est que l'action existe — il faudra alors revoir les
  // deux textes ci-dessus, et sans doute les rétablir.
  it("aucun contrôle de sélection de cours sur la fiche", () => {
    const fiche = texteAffichable(join(RACINE, "app/[asso]/cockpit/adherents/[id]/page.tsx"));
    expect(fiche).not.toMatch(/name="cours"/);
    expect(fiche).not.toMatch(/changerCours|deplacerAdherent/);
  });
});
