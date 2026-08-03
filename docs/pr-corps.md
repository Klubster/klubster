Lot **contraste des couleurs de club**, ouvert depuis `main` — indépendant des PR #13 à #16.

## Le problème

Un club peut saisir n'importe quel hex. Sur un jaune très clair, trois boutons posaient du **blanc codé en dur** sur la couleur du club : « Enregistrer » d'AjoutReglement (cockpit), « Enregistrer » des réglages emails, « Ouvrir mon espace » (/installer) — bouton invisible. Et trois couleurs de secours différentes circulaient selon la page (`#111111`, `#279B65`, `#189460`) : un club sans couleur n'avait pas le même site d'un écran à l'autre.

## Une source centrale

`src/lib/contraste.ts` (existant, étendu) est le seul endroit qui sait : **normaliser** une couleur (« # » optionnel, hex court `#1AB`, casse, espaces), **reconnaître une valeur invalide**, calculer **luminance** et **ratio WCAG**, choisir automatiquement un **texte clair ou sombre** (≥ 4,5:1), produire une **bordure** qui se détache (≥ 3:1), un **état survol lisible** — une vraie variante de couleur, plus jamais `hover:opacity-90` qui rapprochait un fond clair du papier au moment précis où l'on va cliquer — et fournir la **couleur de secours** unique (`COULEUR_SECOURS`). `themeClub()` livre le tout aux surfaces en une entrée.

## Surfaces câblées

Vitrine publique (CTA, badges, tarifs, cours), navigation (`SiteHeader`), formulaire d'inscription (bouton « Valider mon inscription »), pages espace / installer / actualités / merci, et le cockpit partout où la couleur du club sert d'accent (cours, fiche adhérent, import, emails, scanner). Manifest PWA, icône et image OpenGraph passent par la même normalisation. Focus clavier : outline encre décalée sur les CTA publics.

## L'écran de personnalisation montre la vérité

L'aperçu rend le bouton réel, son état survolé et un badge — calculés par **les mêmes fonctions que la vitrine**, pas une maquette. Le bénévole lit une seule phrase, sans ratio ni sigle WCAG :

> Votre couleur est conservée. Le texte est automatiquement adapté pour rester lisible.

L'action serveur accepte désormais le hex court et normalise par la même source que l'affichage.

## Tests — les dix cas imposés

39 tests (`tests/contraste.test.ts`) : blanc, noir, jaune très clair, vert clair, vert Klubster, rouge sombre, bleu vif, couleur invalide, valeur vide, ancien club (couleur conservée à la casse près). Chaque couleur est vérifiée sur les trois garanties : texte ≥ 4,5:1, bordure ≥ 3:1, survol lisible et distinct du repos.

## Prouvé dans le rendu

Sur la base de développement (`klubster-dev`), jamais la production :

- couleur passée à `#FFF9C4` (jaune très clair) depuis l'écran du cockpit → vitrine, inscription et installer rendent `background:#FFF9C4;color:#111111`, survol `#E0DBAC` ;
- valeur **invalide** écrite en base (`bleu`) → toutes les surfaces retombent sur `background:#111111;color:#FFFFFF` ;
- `#1A6FB5` (bleu vif) → blanc sur bleu ;
- persistance vérifiée après rechargement (la couleur vient de la base à chaque rendu serveur).

Captures 390 / 768 / 1280 px dans `docs/contraste-captures/` (jaune et bleu).

## Chaîne

288 vitest ✓ (dont 39 nouveaux) · build ✓ · typecheck ✓ · lint ✓ (0 erreur, 11 avertissements préexistants).

## Limites

Le mode « thème noir » des vitrines garde son traitement existant (`accentLisibleSur`) ; l'aperçu du cockpit montre le rendu sur fond papier uniquement. Les emails HTML ont leur propre garde-fou (`email-gabarit.ts`), inchangé.
