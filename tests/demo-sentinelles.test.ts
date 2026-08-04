import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Sentinelles de la démonstration publique (lot R).
 *
 * `/demo` est la seule page du produit qui s'adresse à un inconnu, sans compte et
 * sans garde. Ce qui la protège n'est pas une permission : c'est le fait qu'elle
 * n'a AUCUN moyen d'atteindre les données réelles. Ces tests vérifient que cette
 * propriété tient, y compris après une modification distraite.
 */

const RACINES = ["src/app/demo", "src/components/demo", "src/lib/demo"];

function fichiers(dir: string): string[] {
  const abs = join(process.cwd(), dir);
  let out: string[] = [];
  for (const e of readdirSync(abs)) {
    const p = join(abs, e);
    if (statSync(p).isDirectory()) out = out.concat(fichiers(join(dir, e)));
    else if (/\.(ts|tsx)$/.test(e)) out.push(join(dir, e));
  }
  return out;
}

/** Le code, sans les commentaires — un interdit cité dans un commentaire n'en est pas un. */
function codeSeul(chemin: string): string {
  return readFileSync(join(process.cwd(), chemin), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const TOUS = RACINES.flatMap(fichiers);

describe("la démonstration ne peut pas atteindre les données réelles", () => {
  it("existe et couvre les écrans annoncés au prospect", () => {
    expect(TOUS.length).toBeGreaterThan(20);
    for (const page of [
      "src/app/demo/page.tsx",
      "src/app/demo/adherents/page.tsx",
      "src/app/demo/cours/page.tsx",
      "src/app/demo/inscriptions/page.tsx",
      "src/app/demo/paiements/page.tsx",
      "src/app/demo/messages/page.tsx",
      "src/app/demo/controle/page.tsx",
      "src/app/demo/site/page.tsx",
    ]) {
      expect(TOUS, page).toContain(page);
    }
  });

  it("n'importe ni Supabase, ni Stripe, ni Resend, ni l'authentification", () => {
    for (const f of TOUS) {
      const code = codeSeul(f);
      for (const interdit of [
        /from ["']@\/lib\/supabase/,
        /from ["']@supabase\//,
        /from ["']@\/lib\/stripe/,
        /from ["']@\/lib\/resend/,
        /from ["']@\/lib\/auth/,
        /from ["']@\/lib\/queries/,
      ]) {
        expect(code, `${f} : import interdit ${interdit}`).not.toMatch(interdit);
      }
    }
  });

  it("ne déclare aucune Server Action — donc aucune écriture serveur possible", () => {
    for (const f of TOUS) {
      expect(codeSeul(f), f).not.toMatch(/["']use server["']/);
    }
  });

  it("n'appelle aucun service distant (fetch, XHR, WebSocket)", () => {
    for (const f of TOUS) {
      const code = codeSeul(f);
      expect(code, f).not.toMatch(/\bfetch\s*\(/);
      expect(code, f).not.toMatch(/XMLHttpRequest|new WebSocket/);
    }
  });

  it("n'écrit dans aucun stockage du navigateur : un rechargement remet tout à zéro", () => {
    for (const f of TOUS) {
      const code = codeSeul(f);
      expect(code, f).not.toMatch(/localStorage|sessionStorage|indexedDB|document\.cookie/);
    }
  });

  it("ne peut ni encaisser, ni abonner, ni envoyer un message réel", () => {
    for (const f of TOUS) {
      const code = codeSeul(f);
      expect(code, f).not.toMatch(/checkout\.stripe\.com|createCheckout|createAbonnement/);
      expect(code, f).not.toMatch(/api\.resend\.com|envoyerEmail/);
    }
  });

  it("ne porte aucune adresse email hors du domaine réservé aux exemples", () => {
    // RFC 2606 : `example.com` / `example.org` ne peuvent appartenir à personne.
    for (const f of TOUS) {
      const code = codeSeul(f);
      for (const m of code.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi) ?? []) {
        // `clubs@klubster.fr` est notre PROPRE adresse d'expédition, citée dans un
        // texte qui explique au visiteur ce qui se passerait dans un vrai club.
        // Ce n'est pas une donnée d'adhérent : c'est une information sur le produit.
        if (m.toLowerCase() === "clubs@klubster.fr") continue;
        expect(m.toLowerCase(), `${f} : ${m}`).toMatch(/@(.+\.)?example\.(com|org|net)$/);
      }
    }
  });

  it("annonce au visiteur qu'il regarde une simulation, dès le bandeau", () => {
    const bandeau = readFileSync(join(process.cwd(), "src/components/demo/BandeauDemo.tsx"), "utf8");
    expect(bandeau).toMatch(/DÉMONSTRATION/);
    expect(bandeau).toMatch(/FICTIF|AUCUNE DONNÉE RÉELLE/);
  });

  it("mène vers l'offre : le prospect doit pouvoir créer son club", () => {
    const accueil = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
    const bandeau = readFileSync(join(process.cwd(), "src/components/demo/BandeauDemo.tsx"), "utf8");
    expect(accueil + bandeau).toMatch(/\/creer|CRÉER MON CLUB/);
  });
});
<<<<<<< HEAD
=======

describe("la démonstration montre le produit qu'on livre", () => {
  it("utilise LA hiérarchie du cockpit réel, pas une mise en page parallèle", () => {
    // Défaut trouvé au lot R : la démo affichait trois cartes sur le même plan —
    // l'écran d'AVANT la refonte de hiérarchisation (#15). Un prospect découvrait
    // après inscription un cockpit qui ne ressemblait pas à celui qu'on lui avait
    // montré. La démo consomme désormais `calculerPriorites`, la même fonction.
    const demo = readFileSync(join(process.cwd(), "src/app/demo/page.tsx"), "utf8");
    expect(demo).toMatch(/from ["']@\/lib\/priorites["']/);
    expect(demo).toMatch(/calculerPriorites\(/);
    expect(demo).toMatch(/À TRAITER MAINTENANT/);
    expect(demo).toMatch(/À SURVEILLER/);
    expect(demo).toMatch(/resumeAttention\(/);
  });

  it("porte les mêmes repères visuels que le produit (aucune rondeur, mêmes tokens)", () => {
    for (const f of TOUS) {
      // border-radius: 0 est imposé globalement ; aucune classe `rounded-*` ne doit
      // réapparaître par la démo — la marque n'a pas de coins arrondis.
      expect(codeSeul(f), f).not.toMatch(/\brounded-/);
    }
  });
});
>>>>>>> fix/demo-alignement-cockpit
