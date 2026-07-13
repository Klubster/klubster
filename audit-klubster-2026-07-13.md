# Audit Klubster — 13 juillet 2026

**Méthode** : croisement de trois référentiels — `impeccable` (audit technique + critique UX), `ui-ux-pro-max` (99 règles UX, accessibilité, perf) et le pack marketing (`cro`, `copywriting`, `marketing-psychology`).
**Périmètre** : pages publiques en prod (home, /creer→/connexion, /combat, vitrine /usmboxe) + code source (`src/app`, composants site, tokens).
**Constats vérifiés en live** (screenshots, console, réseau, inspection DOM) — pas de suppositions.

---

## Score de santé (grille impeccable audit)

| # | Dimension | Score /4 | Constat clé |
|---|-----------|----------|-------------|
| 1 | Accessibilité | 3 | Focus visible, labels associés, reduced-motion partout ; mais labels mono 11px et erreurs d'hydratation qui cassent les garanties SSR |
| 2 | Performance | 2 | **Le hero (élément LCP) ne se peint pas** ; 5 erreurs React #425/#418/#423 à chaque chargement → re-rendu client complet |
| 3 | Responsive | 3 | Breakpoints soignés et commentés dans le code ; mais le fix du h1 ne marche pas (voir P0-2) |
| 4 | Theming | 4 | Tokens CSS variables propres, WCAG documenté dans le code, mode blanc/noir clubs, aucune couleur en dur significative |
| 5 | Anti-patterns (slop AI) | 4 | **Verdict : passe.** DA singulière (mono + `_` vert, 0px, photos re-gradées). Personne ne dira « une IA a fait ça » |
| **Total** | | **16/20** | **Bon — corriger les dimensions faibles (perf) avant tout le reste** |

**Verdict anti-slop** : la home échappe aux tells classiques (pas de gradient text, pas de glassmorphism, pas de grilles de cards identiques, pas de hero-metric). Les kickers numérotés `I — POURQUOI_` sont à la limite du « numbered section markers » banni par impeccable, mais ici ils sont un système de marque nommé (sommaire de magazine), assumé et cohérent → acceptable. La voix copy (« La salle ouvre dans quinze minutes. ») est ce qui vous distingue le plus. À protéger.

---

## P0 — Bloquants (à corriger avant toute action marketing)

### ~~P0-1 · La photo du hero ne s'affiche pas~~ — FAUSSE ALERTE (corrigée le 13/07 au soir)
- **Constat initial** : les captures d'écran de l'audit montraient un hero gris, image chargée (HTTP 200) mais apparemment non peinte.
- **Réalité, confirmée par Mathieu** : la photo s'affiche normalement à l'écran. Le gris était un **artefact de l'outil de capture** (la layer GPU de l'image prioritaire n'était pas rasterisée dans les captures de l'extension). Le test canvas (pixels chauds présents) le suggérait déjà ; l'écran réel tranche.
- **Ce qui reste de l'épisode** : un `img.decode()` forcé après hydratation sur l'image prioritaire (bonne pratique LCP, no-op si déjà décodée), conservé dans `Parallax.tsx`. La respiration `kb-breathe`, le parallaxe et `will-change-transform` du hero ont été **restaurés à l'identique** — la DA n'a pas bougé.
- **Leçon de méthode** : un constat visuel issu d'un outil d'instrumentation doit être contre-vérifié sur un écran réel avant d'être classé P0.

### P0-2 · Les deux lignes du H1 se chevauchent (desktop)
- **Constat live** : « au même endroit. » monte dans les jambages de « Toute votre association, ». Mesuré au DOM : `font-size: 58px`, `line-height: 40px` (!).
- **Cause** : cascade Tailwind. Le commentaire du code dit « leading 1.12 les sépare » mais `sm:text-4xl` (qui définit `line-height: 2.5rem` en plus du font-size) **écrase `leading-[1.12]`** à partir de 640px, et `md:text-[58px]` ne remet que le font-size. Résultat : 58px de corps sur 40px d'interligne. Le bug est dans le repo, pas seulement en prod.
- **Fix** : `text-[30px] leading-[1.12] sm:text-4xl sm:leading-[1.12] md:text-[58px] md:leading-[1.12]` — ou plus propre : `sm:text-4xl/[1.12]`.
- Commande : `/impeccable typeset hero`

### P0-3 · Cinq erreurs d'hydratation React à chaque chargement de la home
- **Constat console** : React #425 (×5), #418, #423 — « text content mismatch » → React jette le HTML serveur et re-rend tout côté client.
- **Impact** : perf (double rendu, LCP retardé), risque de flash de contenu, et c'est probablement lié au fait que certains éléments animés se comportent différemment selon les sessions. À investiguer en dev non-minifié ; suspects habituels : contenu dépendant de la largeur d'écran au premier rendu, extensions, ou un composant client qui rend un texte différent au serveur. `© {new Date().getFullYear()}` est stable en 2026, mais à minuit du 31 décembre il produira exactement ce mismatch — mettez l'année en dur ou `suppressHydrationWarning`.
- Commande : `/impeccable harden home`

---

## P1 — Majeurs (avant d'envoyer du trafic — Emelia, LinkedIn)

### P1-1 · CRO : le CTA principal est sous le fold du hero
Le hero (85vh) ne contient **ni prix, ni bouton** — seulement titre + sous-titre. Le bloc « À partir de 9 €/mois · CRÉER MON ASSOCIATION → » n'apparaît qu'après scroll. Le code l'assume (« le bloc blanc doit affleurer, sinon rien n'appelle le scroll ») : c'est un vrai parti pris éditorial, mais avec le hero cassé (P0-1) il ne reste **aucun élément d'action visible** à l'arrivée hormis le petit bouton nav. Framework cro : la règle « primary CTA visible without scrolling » est violée. Compromis possible qui respecte la DA : garder le hero pur, mais remonter la ligne prix + CTA pour qu'elle affleure dans le fold (h-[80vh] au lieu de 85, ou padding réduit).

### P1-2 · CRO : « Créer mon association » atterrit sur un mur de connexion
`/creer` redirige vers `/connexion?next=/creer` : le visiteur qui clique « CRÉER MON ASSOCIATION » voit… « Se connecter / Créer un compte » avec prénom, nom, email, mot de passe — **avant d'avoir rien construit**. C'est le point de friction n°1 du funnel (activation energy, BJ Fogg : motivation élevée mais abilité perçue chute).
- Le titre de la page (« Créez votre association. Gratuit à la création… ») fait le bon travail de réassurance — bien.
- Mieux : inverser l'ordre IKEA — laisser choisir le **nom du club + template** (étape 1 du wizard) *avant* de demander le compte, ou au minimum afficher les 4 étapes (« 01 Compte → 02 Club → 03 Activités → 04 En ligne ») pour déclencher le goal-gradient. Le wizard existe déjà (`CreerWizard`), il s'agit de déplacer la porte.
- Petit point : le bouton « CRÉER MON COMPTE → » grisé tant que le formulaire est vide ressemble à un bouton mort. Un bouton actif qui valide à la soumission convertit mieux qu'un disabled ambigu (règle ui-ux-pro-max `disabled-states` + `inline-validation`).

### P1-3 · Psychologie : zéro preuve sociale chiffrée
Le seul trust signal est l'histoire du fondateur (excellente — authority + similarity + pratfall « je ne suis pas développeur ») et « testé à l'USM Boxe ». Mais aucun chiffre, aucun logo, aucun témoignage tiers. Règle des contraintes (theory of constraints) : au stade actuel (peu de clubs), ne pas inventer — **utiliser la spécificité à la place du volume** :
- « 214 adhérents gérés cette saison à l'USM Boxe » (vrai chiffre du club),
- un témoignage d'un bénévole/parent de l'USM Boxe avec prénom et rôle,
- « 0 % de commission — vérifiable dans les CGV » comme preuve d'alignement.
Dès le 2e ou 3e club : bandeau « Utilisé par X associations » près du CTA tarifs (bandwagon), photos réelles des clubs.

### P1-4 · SEO : la home ne vise aucune requête, /combat est orphelin
- Title actuel : « Klubster — Toute votre association, au même endroit » → aucune requête tapée par un président d'asso (« logiciel gestion association », « logiciel inscription club sportif », « alternative HelloAsso/AssoConnect/Pep's Up »). Garder la marque + voix, mais injecter la catégorie : `Klubster — Logiciel de gestion d'association : inscriptions, paiements, site web`.
- **/combat n'est pas dans le sitemap** (vérifié dans `sitemap.ts`) et aucun lien interne n'y mène depuis la home → invisible pour Google alors que « logiciel club de boxe / MMA » est exactement la niche où la prospection Emelia tape déjà.
- Le bloc objections (« Et si je veux partir ? »…) est une FAQ parfaite → l'annoter en `FAQPage` JSON-LD (le `SoftwareApplication` existe déjà, bien).
- Aucune page ne cible les comparateurs (« HelloAsso vs », « AssoConnect alternative ») : opportunité de contenu la plus rentable du secteur, cohérente avec l'argument 0 % commission.

### P1-5 · La nav de la home pointe « Tarifs » vers `#tarifs` mais le hero occupe 85vh
Détail mesuré : depuis les pages `/fonctionnalites` ou `/combat`, il n'y a pas de retour évident vers les tarifs de la home (le lien `#tarifs` n'existe que sur la home). Nielsen #3 (user control) : un visiteur qui explore Fonctionnalités doit retrouver le prix sans revenir en arrière. Ajouter `/#tarifs` dans la nav des pages secondaires ou une section tarifs sur /fonctionnalites (elle mentionne « à partir de 9 €/mois » dans la meta description mais le corps de page l'enterre).

---

## P2 — Mineurs

- **Labels et CTA en mono 11–13px uppercase** : signature de marque assumée, mais 11px avec tracking 0.18em sur mobile flirte avec le seuil de lisibilité (règle `readable-font-size` : 16px corps mobile — le corps est ok, les labels non). Ne rien changer à la DA ; monter les labels porteurs d'info (prix, « premier mois offert ») à 12–13px minimum.
- **Cartes tarifs sans CTA individuel** : les trois paliers sont des cartes passives, le CTA est en dessous. Bien (un seul CTA, paradox of choice maîtrisé) — mais « PREMIER MOIS OFFERT » répété 4 fois dans la même section (kicker, 3 cartes, ligne sous le bouton) : la répétition dilue. Deux occurrences suffisent.
- **Vitrine /usmboxe** : très propre (hero texte, cours, tarifs, carte). Deux points : les prix « 160 € /an » en vert brand partout attirent plus l'œil que les noms de cours (hiérarchie inversée pour un parent qui cherche « boxe enfant ») ; et le H1 « La boxe anglaise pour tous à Montauban » est excellent pour le SEO local — dupliquer ce pattern pour chaque futur club.
- **Espace président (footer)** : lien présent sur la home mais pas dans la nav desktop — un président existant qui revient doit chercher. C'est peut-être voulu (page orientée conversion) ; dans ce cas le footer suffit, mais le lien mobile du menu l'a déjà (« Espace président ») → incohérence desktop/mobile.
- **Modifs non commitées** : `layout.tsx` (Space Grotesk pour les titres), `globals.css` et 8 autres fichiers sont modifiés mais non déployés — la prod rend les h1 en Inter (vérifié au DOM : 3 variables de police sur 4). Décider : soit committer la piste Space Grotesk, soit la jeter, mais ne pas laisser prod et repo diverger pendant une phase de prospection.
- **`sitemap.ts` expose la clé anon Supabase en dur en fallback** : elle est « publishable » donc pas un secret critique, mais la retirer du code source reste plus propre (variable d'env obligatoire, échec silencieux sinon — c'est déjà le comportement).

---

## Lecture marketing (cro + copywriting + marketing-psychology)

### Ce qui est déjà fort — à ne pas toucher
- **Proposition de valeur** : « Les associations méritent mieux qu'un tableur » — langage client (le tableur est l'ennemi réel), spécifique, mémorable. Passe le test des 5 secondes.
- **Prix** : 3 paliers (good-better-best), transparents, sans astérisque ; « 0 % de commission, les cotisations arrivent sur le compte Stripe de votre association » est **le** différenciateur face à HelloAsso — il mérite d'être encore plus haut dans la page.
- **Objections** : les trois questions (« tableur », « partir », « données ») sont exactement les bonnes (status-quo bias, regret aversion, RGPD). Le traitement « export en un clic, sans préavis » est du désarmement d'objection de manuel.
- **Zero-price effect** : « Premier mois offert, sans prélèvement » bien exploité.
- **Voix** : « La salle ouvre dans quinze minutes. Vous ouvrez Klubster. Tout est prêt. » — scène physique, present bias (bénéfice immédiat), aucun buzzword. Rare.

### Leviers absents (par ordre d'impact)
1. **Preuve sociale** (P1-3) — le levier manquant n°1.
2. **Urgence honnête** : la rentrée de septembre est LA deadline réelle des assos. « Prêt pour septembre » / « Ouvrez les inscriptions avant la rentrée » est une urgence saisonnière vraie (scarcity légitime), plus puissante en juillet–août que « prêt en 30 minutes ».
3. **Contraste avant/après** : le cockpit est montré, mais jamais le « avant » (le tableur, les 4 fichiers, le groupe WhatsApp). /combat le fait (« GAME OVER pour… les SMS à tout le monde ») — la home gagnerait une version sobre de ce contraste.
4. **Loss aversion** : tout est formulé en gain. Une seule ligne suffirait : « Chaque impayé non relancé, c'est une cotisation perdue. »

### Alternatives copy (à A/B tester, pas à appliquer d'office)
- H1 (garder l'actuel comme contrôle) :
  - B : « La rentrée de votre association, sans tableur. » (saisonnier + ennemi)
  - C : « Inscriptions, paiements, relances. Vous, vous ouvrez la salle. » (division du travail, voix Klubster)
- CTA : « CRÉER MON ASSOCIATION → » est bon (spécifique, possessif). Variante à tester : « OUVRIR MON CLUB → » (métaphore maison « on ouvre la salle ») ; sous-texte : remplacer une des occurrences « Prêt en moins de 30 minutes » par « Gratuit le premier mois ».

---

## Ce qui marche (à conserver et répliquer)
- Système de tokens + commentaires WCAG dans le code : rare et précieux.
- `prefers-reduced-motion` respecté sur **toutes** les animations, focus-visible propre, autocomplete sur les formulaires : au-dessus du standard.
- SEO technique de base sain : metadata par page, canonical, robots qui exclut les espaces privés, sitemap dynamique avec vitrines clubs, JSON-LD offres.
- /combat : landing de niche audacieuse, message match parfait pour une campagne « clubs de combat » (l'URL à utiliser dans les emails Emelia vers les clubs de boxe/MMA — pas la home).
- La vitrine USM Boxe sert de démo réelle — « Un club » dans la nav est une excellente idée ; renommer éventuellement « Voir un club réel » pour expliciter la preuve.

## Plan d'action recommandé
1. ~~P0-1 hero~~ — fausse alerte (artefact de capture), voir ci-dessus.
2. **P0-2** interligne h1 (`/impeccable typeset`) — 15 min. ✅ corrigé et déployé le 13/07.
3. **P0-3** hydratation — non reproduit sur chargements propres (artefact d'instrumentation également). ✅ clos.
4. **P1-2** déplacer la porte de connexion après l'étape « nom du club » du wizard — le gain CRO le plus important du funnel.
5. **P1-3 + copy** : chiffres USM Boxe + 1 témoignage réel près des tarifs.
6. **P1-4** : title SEO catégorisé, /combat dans le sitemap + liens internes, FAQ en JSON-LD.
7. Committer ou abandonner les modifs locales (Space Grotesk) pour réaligner prod et repo.
8. Re-passer `/impeccable audit` après corrections pour mesurer la progression (16/20 → objectif 18+).

---
*Audit réalisé le 13/07/2026 — sources : prod klubster.fr (Chrome, console + réseau + DOM), repo local (commit dd775e7 + modifs non commitées). Précédent audit : audit-klubster-2026-07-08.md.*
