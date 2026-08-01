import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

/**
 * LA PREUVE QUE LA DÉMONSTRATION NE PEUT RIEN FAIRE.
 *
 * POURQUOI CE TEST EXISTE
 * La promesse de `/demo` — « essayez tout, rien n'est enregistré » — ne se tient pas par
 * la vigilance. Elle se tient parce qu'il n'existe, dans ces fichiers, RIEN À APPELER :
 * pas de client Supabase, pas de Server Action, pas de `fetch`, pas de Stripe, pas de
 * Resend, pas de Storage, aucune persistance locale. Une garantie structurelle se
 * vérifie ; une garantie d'attention se perd au premier ajout pressé.
 *
 * Ce test lit le SOURCE, fichier par fichier. Il ne prouve pas qu'aucun octet ne sortira
 * jamais du navigateur — un `<a href>` reste possible, et le layout affiche des liens —
 * mais il prouve qu'aucune ÉCRITURE ne peut partir d'ici, et qu'aucune trace ne peut
 * rester sur la machine du visiteur.
 *
 * LE FICHIER À NE PAS ALLÉGER. Si un jour un écran de démonstration a besoin d'un des
 * interdits ci-dessous, ce n'est pas la liste qu'il faut modifier : c'est l'écran.
 */

const RACINE = path.resolve(__dirname, "..");

const DOSSIERS = ["src/app/demo", "src/lib/demo", "src/components/demo"];

/** Chaque interdit, avec ce qu'il coûterait s'il passait. */
const INTERDITS: { motif: RegExp; nom: string; pourquoi: string }[] = [
  { motif: /@supabase\//, nom: "SDK Supabase", pourquoi: "un client suffit à lire ou écrire de vraies données" },
  { motif: /@\/lib\/supabase/, nom: "clients Supabase du projet", pourquoi: "même conséquence, par un chemin plus court" },
  { motif: /\bcreateSupabase\w*Client\b/, nom: "fabrique de client Supabase", pourquoi: "idem" },
  { motif: /["'`]use server["'`]/, nom: "Server Action", pourquoi: "une écriture serveur atteignable depuis la démonstration" },
  { motif: /@\/lib\/stripe/, nom: "Stripe", pourquoi: "un paiement réel n'a rien à faire dans une simulation" },
  { motif: /@\/lib\/resend/, nom: "Resend", pourquoi: "un email partirait vraiment, à une adresse fictive" },
  { motif: /\bfetch\s*\(/, nom: "fetch", pourquoi: "toute sortie réseau contredit la promesse" },
  { motif: /\bXMLHttpRequest\b/, nom: "XMLHttpRequest", pourquoi: "même chose, en plus ancien" },
  { motif: /\bnavigator\.sendBeacon\b/, nom: "sendBeacon", pourquoi: "une sortie réseau qu'on ne voit pas passer" },
  { motif: /\blocalStorage\b/, nom: "localStorage", pourquoi: "une trace survivrait à la visite" },
  { motif: /\bsessionStorage\b/, nom: "sessionStorage", pourquoi: "idem, jusqu'à la fermeture de l'onglet" },
  { motif: /\bindexedDB\b/i, nom: "IndexedDB", pourquoi: "idem, en plus durable" },
  { motif: /\bdocument\.cookie\b/, nom: "cookie", pourquoi: "une trace, et un bandeau de consentement à devoir écrire" },
  { motif: /\bnavigator\.clipboard\b/, nom: "presse-papier", pourquoi: "on remplacerait ce que le visiteur avait copié" },
  { motif: /\bnavigator\.mediaDevices\b/, nom: "caméra ou micro", pourquoi: "décision explicite : le scanner ne demande pas la caméra" },
  { motif: /\bgeolocation\b/, nom: "géolocalisation", pourquoi: "aucune raison, et une permission de trop" },
  { motif: /\bhref=["']mailto:/, nom: "mailto:", pourquoi: "ouvrir la messagerie d'un visiteur n'est pas une démonstration" },
  { motif: /\bMath\.random\b/, nom: "Math.random", pourquoi: "le rendu doit être identique au serveur et au client" },
  { motif: /\bDate\.now\b/, nom: "Date.now", pourquoi: "même raison : l'horloge de la démonstration est figée" },
  { motif: /\bnew Date\(\s*\)/, nom: "new Date() sans argument", pourquoi: "idem" },
];

/** Les fichiers du périmètre, chemins relatifs à la racine du dépôt. */
function fichiers(): string[] {
  const trouves: string[] = [];
  const parcourir = (dossier: string) => {
    for (const entree of readdirSync(dossier)) {
      const complet = path.join(dossier, entree);
      if (statSync(complet).isDirectory()) parcourir(complet);
      else if (/\.tsx?$/.test(entree)) trouves.push(path.relative(RACINE, complet));
    }
  };
  for (const d of DOSSIERS) parcourir(path.join(RACINE, d));
  return trouves.sort();
}

const LISTE = fichiers();

/**
 * Le CODE d'un fichier, ses commentaires retirés.
 *
 * SANS CE NETTOYAGE, LE TEST EST INUTILISABLE. Les fichiers de `/demo` expliquent
 * longuement ce qu'ils s'interdisent — « ni `localStorage`, ni `sessionStorage`, ni
 * cookie, ni IndexedDB » — et un test qui cherche ces mots dans le texte brut échoue
 * précisément sur les fichiers les plus scrupuleux. Le seul remède aurait été de cesser
 * d'écrire pourquoi, ce qui reviendrait à payer la vérification avec la compréhension.
 *
 * Le nettoyage est volontairement simple : blocs `/* … *␣/`, lignes `//`, et commentaires
 * JSX `{/* … *␣/}`. Il peut mordre sur une chaîne contenant `//` — une URL, par exemple —
 * et c'est sans conséquence ici : aucun des motifs surveillés n'apparaît dans une URL.
 */
function code(fichier: string): string {
  return readFileSync(path.join(RACINE, fichier), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("isolation de la démonstration", () => {
  it("trouve bien les fichiers à surveiller", () => {
    // Un test qui ne lirait rien passerait pour toujours. On s'assure d'abord qu'il lit.
    expect(LISTE.length).toBeGreaterThan(15);
    expect(LISTE).toContain(path.join("src", "app", "demo", "page.tsx"));
    expect(LISTE).toContain(path.join("src", "lib", "demo", "etat.ts"));
  });

  for (const { motif, nom, pourquoi } of INTERDITS) {
    it(`n’utilise nulle part ${nom} — ${pourquoi}`, () => {
      const coupables = LISTE.filter((f) => motif.test(code(f)));
      expect(coupables, `${nom} trouvé dans : ${coupables.join(", ")}`).toEqual([]);
    });
  }

  it("n’écrit qu’à des adresses en @example.com", () => {
    // RFC 2606 : ce domaine est réservé et n'appartiendra jamais à personne. Une adresse
    // en `.fr` inventée peut, elle, exister — et recevoir.
    const autres = new Set<string>();
    for (const f of LISTE) {
      const contenu = code(f);
      for (const m of contenu.matchAll(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi)) {
        // `clubs@klubster.fr` apparaît dans une phrase explicative, jamais comme
        // destinataire : c'est l'adresse d'expédition du produit réel.
        if (!m[0].endsWith("@example.com") && m[0] !== "clubs@klubster.fr") autres.add(`${f} → ${m[0]}`);
      }
    }
    expect([...autres]).toEqual([]);
  });

  it("n’importe aucune Server Action du produit", () => {
    // Un import depuis `src/app/[asso]/…/actions` amènerait une écriture réelle par la
    // porte de derrière, sans qu'aucun des motifs ci-dessus ne le voie.
    const coupables = LISTE.filter((f) =>
      /from\s+["'][^"']*(actions|edition-actions|chat-actions|stripe-actions)["']/.test(code(f))
    );
    expect(coupables).toEqual([]);
  });

  it("ne navigue jamais dans /demo par un `<a>` nu", () => {
    /**
     * POURQUOI CE TEST EXISTE, ET CE QU'IL A COÛTÉ DE NE PAS L'AVOIR.
     *
     * Un `<a href="/demo/…">` ordinaire provoque une navigation de DOCUMENT : le layout
     * est rechargé, le `DemoProvider` remonté, et tout l'état simulé disparaît. Le lien
     * de retour de `EnTeteDemo` en était un. Un visiteur qui encaissait un chèque puis
     * cliquait « ← AUJOURD'HUI » retrouvait le club dans son état de départ — la
     * promesse de la démonstration, « ce que vous faites vous suit d'un écran à
     * l'autre », était fausse dès le premier retour en arrière.
     *
     * Aucun test d'interface ne pouvait le voir : `happy-dom` ne navigue pas. Il a fallu
     * un vrai navigateur. Ce garde-fou, lui, coûte trois lignes.
     *
     * Les ancres internes (`href="#ajouter"`) et les liens externes ne sont pas
     * concernés : ils ne rechargent rien.
     */
    const coupables: string[] = [];
    for (const f of LISTE) {
      // La balise entière, pour pouvoir lire ses autres attributs.
      for (const m of code(f).matchAll(/<a\s[^>]*>/g)) {
        const balise = m[0];
        if (!/href=(?:"|\{`)\/demo/.test(balise)) continue;
        // `target="_blank"` ouvre un AUTRE onglet : le document courant n'est pas
        // rechargé, et l'état de la simulation ne bouge pas. C'est le cas de
        // « Consulter » sur une pièce, qui doit précisément ouvrir à côté.
        if (/target=["']_blank["']/.test(balise)) continue;
        coupables.push(`${f} → ${balise.slice(0, 70)}`);
      }
    }
    expect(coupables).toEqual([]);
  });

  it("ne mène nulle part hors de /demo par un lien interne", () => {
    // Sauf les deux sorties assumées du bandeau, listées plus bas.
    const echappees = new Set<string>();
    for (const f of LISTE) {
      const contenu = code(f);
      for (const m of contenu.matchAll(/href=["'](\/[^"'#?]*)["']/g)) {
        const cible = m[1];
        // Deux sorties assumées, toutes deux dans le bandeau : la page d'accueil et
        // « clubs fondateurs », qui est le geste que la demonstration prepare.
        if (cible === "/" || cible === "/clubs-fondateurs" || cible.startsWith("/demo")) continue;
        echappees.add(`${f} → ${cible}`);
      }
    }
    expect([...echappees]).toEqual([]);
  });
});
