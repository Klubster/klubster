# Preuves S9-S11 (6 août 2026, branche feat/lot-s-marketing-formulaires)

Mesures Puppeteer sur `next build && next start`, localhost uniquement.

## Démo certifiée (S9) — 18/18 routes exercées dans le navigateur
- 14 routes statiques parcourues à 390 px : **0 erreur console** (donc 0 erreur
  d'hydratation), **0 hôte externe**, **0 débordement**.
- Les 4 routes dynamiques (`actualites/[id]`, `adherents/[id]`, `messages/[id]`,
  `piece/[id]`) exercées ensuite sur les ids de l'état initial (`n1`, `a12`, `m1`,
  `pf1`) : rendu correct, 0 erreur console, 0 hôte externe, **0 réponse 404**,
  0 débordement à 390 px ; navigation fiche → liste restée SPA (`a33` → liste).
- Geste rejoué en navigation SPA : ajout d'un adhérent → **effectif 34 → 35**, fiche
  `a-sim1` ouverte, nom visible dans la liste (`geste-ajout-spa-1280.png`) ; rechargement
  dur → état intégralement perdu (isolation prouvée).

## Responsive (S10/S11)
5 routes critiques (home, /creer, /tarifs, inscription, /demo) × **9 largeurs**
(320→1920) : **45/45 sans débordement**. Bornes en capture (`*-320.png`, `home-1920.png`).

## Clavier
Focus visible (outline) après tabulations sur home et /demo.

## PWA (audit code, aucun appareil physique)
Manifest par club complet (standalone, scope, start_url espace, icônes 192/512
dynamiques, thème = couleur du club) ; `sw.js` versionné servi, mise à jour silencieuse
(`skipWaiting` + `controllerchange`) ; aucune promesse hors-ligne dans l'interface.
