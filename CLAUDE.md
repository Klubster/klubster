# Klubster — cadre de travail

Ce fichier est lu à chaque session. Il dit ce qu'est le projet, ce qui est non négociable,
et ce qui a déjà été cassé une fois. Il ne raconte pas l'historique : les audits datés à la
racine s'en chargent.

## Le contexte, qui change tout

Klubster est une plateforme SaaS multi-locataire pour associations et clubs sportifs français :
vitrine par club, inscriptions en ligne, dossiers d'adhérents, encaissement des cotisations,
communication, PWA installable. Abonnement 9/19/29 €/mois selon l'effectif, **0 % de commission** —
l'argent des cotisations va directement sur le compte Stripe du club.

Trois faits à garder en tête avant d'écrire une ligne :

1. **C'est en production, avec de vraies associations et de vraies données personnelles.**
   Dont des **données de santé** (art. 9 RGPD) et des **mineurs**. Une erreur ici n'est pas un bug,
   c'est un incident.
2. **Mathieu est seul, et n'est pas développeur de métier.** Il est président d'un club de boxe.
   Il ne relira pas 400 lignes de diff. Le code doit être lisible et les commentaires doivent
   expliquer *pourquoi*, pas *quoi*.
3. **USM Boxe est un client de démonstration, pas le projet.** Si tu te retrouves à coder pour la
   boxe en dur, tu t'es trompé de couche.

## Commandes

```bash
npm run dev        # next dev
npm test           # vitest run — voir « Chaîne canonique » ci-dessous
npm run build      # next build
npm run typecheck  # tsc --noEmit
npm run lint       # eslint (flat config, eslint 9)
```

**Chaîne canonique, dans cet ordre** : `NODE_ENV=test npm test` → `next build` → `tsc --noEmit` → `eslint .`.
Sur `main` : 14 fichiers de tests. Sur la **branche de release** (`release/klubster-commercial-v1-demo`) :
**46 fichiers, 1050 tests**. Un total qui diffère d'un rapport à l'autre n'est pas une anomalie :
chaque branche = `main` + ses propres fichiers ; seule la release les cumule. `tests/db/*.sql` est
le harnais Postgres (PR #11), que vitest n'exécute pas.

⚠️ **Le build n'est pas décoratif.** Une accolade perdue à une résolution de conflit a cassé
`next build` en restant **invisible des 527 tests unitaires**. Ne jamais conclure sur les seuls tests.

**L'ordre compte : `test` → `build` → `typecheck` → `lint`.** `next build` génère `.next/types/**`
que `tsconfig` inclut ; lancer `tsc` avant le build échoue sur des types qui n'existent pas encore
(TS6053). C'est l'ordre de `.github/workflows/ci.yml`, garde-le.

Déploiement : **Vercel déploie automatiquement au push**, région `cdg1` (fonctions en Europe —
c'est un engagement RGPD écrit, pas un réglage). La CI GitHub tourne en parallèle et rend le
verdict visible sur le commit. Un cron Vercel quotidien `0 8 * * *` frappe `/api/cron/relances`.

## Carte du repo

```
src/app/(marketing)/     home, /creer, /tarifs, /fonctionnalites, /combat, /clubs-fondateurs, cas clients
src/app/[asso]/          vitrine publique, /inscription, /espace, /installer, /cockpit/* (back-office club)
src/app/admin/           console super-admin (MRR, fiches clubs, /codes, /messages)
src/app/api/             stripe/webhook, cron/relances, chat/reply
src/proxy.ts             ex-middleware.ts, renommé par Next 16 — réécriture des domaines personnalisés
src/app/auth/            confirm + callback (redirection filtrée par destinationSure)
src/app/connexion/       + /cgu /cgv /mentions-legales /confidentialite /sous-traitance
src/lib/                 logique métier — c'est le périmètre couvert par les tests
src/lib/supabase/        les 4 clients (voir ci-dessous) — ne pas en créer un 5e
supabase/migrations/     0001 → 0023, numérotées séquentiellement
tests/                   vitest ; les tests vivent ici, pas à côté du code
src/app/demo/            cockpit de DÉMONSTRATION publique — simulation 100 % locale
src/components/ui/       Button, Card, StatutBadge, Layout — ⚠️ importés par ZÉRO écran (dette, lot S)
src/components/demo/     provider, bandeau, briques de simulation
src/lib/demo/            données fictives, réducteur, sélecteurs, CSV
src/graphify-out/        sorties générées, datées — à exclure des recherches
```

**`/demo` est une simulation, pas une copie de l'application.** Tout son état vit dans un
`useReducer` côté navigateur et disparaît au rechargement. Y sont **interdits** : Supabase,
Server Actions, routes API, `fetch`, Stripe, Resend, Storage, cookies, `localStorage`,
`sessionStorage`, IndexedDB, authentification, données réelles. Emails fictifs en
`@example.com` uniquement, et le dernier geste d'un parcours porte **toujours** le mot
`SIMULER` — jamais « Envoyer », « Encaisser » ou « Publier ». Chantier en cours sur la
branche `feat/demo-interactive` : **lire `docs/reprise-demo-interactive.md` avant d'y
toucher**, il dit ce qui est fait, ce qui reste, et les spécifications déjà relevées.

⚠️ Sur la machine de Mathieu, `NODE_ENV=production` traîne dans l'environnement du
terminal : React charge alors sa version de production, `React.act` n'existe pas, et
38 tests d'interface tombent sans que le code soit en cause. Préfixer : `NODE_ENV=test npm test`.
La CI n'est pas concernée — ne rien changer dans le dépôt pour ça.

Stack : **Next.js 16 (App Router), React 19, TypeScript strict, Tailwind**, Supabase
(Postgres + Auth + Storage), Stripe, Resend. **Pas de SDK Stripe ni Resend** : appels REST maison
(`src/lib/stripe.ts`, `src/lib/resend.ts`). Ne pas ajouter de dépendance sans demander.

## Règles dures

**Écritures et permissions**

- Toute écriture passe par une **Server Action ou un Route Handler**. Jamais depuis le client.
- Les contrôles de permission serveur passent par `src/lib/garde.ts` :
  `exigerPermission(slug, action)`, `exigerPresident(slug)`, `exigerMembre(slug)`,
  `verifierPermission(slug, action)`. Ne réinvente pas la vérification à la main dans une action.
- **Toute écriture Storage passe par `createSupabaseStorageClient()`** (`src/lib/supabase/server.ts`).
  Les RLS ne gardent pas ces écritures : c'est le code applicatif qui autorise en amont, et le
  chemin de destination est **construit côté serveur depuis l'identifiant de l'organisation**,
  jamais depuis une valeur du navigateur. Cette règle vient d'une panne réelle : du 21 au 28/07,
  plus aucun envoi de fichier ne fonctionnait.
- Sur les pages publiques, lire une organisation via **`getOrganisationPubliqueBySlug`**, jamais la
  lecture complète de `organisations` (`anon` n'a plus les colonnes Stripe/abonnement/emails_config).

**Base de données**

- Chaque ligne porte un `organisation_id`. Le cloisonnement repose sur les **RLS**, appuyées sur
  `current_org_id()` et `is_super_admin()` en `SECURITY DEFINER`.
- **Toute modification de RLS, de RPC ou de droits faite en prod doit être versionnée en migration.**
  La base doit rester reconstructible depuis le repo. `0013` est le snapshot de référence
  (21 RPC métier + politiques `storage.objects` avec `GRANT`/`REVOKE` explicites).
- Partout où `authenticated` peut écrire : **grants par colonne** + triggers d'immuabilité sur
  `organisation_id` / `adherent_id` / `cle`. Une RPC conçue pour la `service_role` doit être
  **révoquée** de `anon`, `authenticated` et `public` — c'est la faille du 4ᵉ audit.
- Matrice de rôles **en base, pas seulement en UI** : règlements → président/trésorier ;
  cours et adhérents → président/secrétaire ; présences → président/encadrant.
  **Lecture des pièces et des questionnaires de santé : président et secrétaire uniquement.**
- **On n'efface pas un adhérent** : effacer emporte ses règlements et son questionnaire de santé.
  On archive. L'effacement RGPD réel se fait en trois couches (fichiers Storage `pieces/…`,
  anonymisation SQL, suppression `auth.users` si le compte n'est pas partagé).

**L'argent**

- Stripe **Connect en charges directes** pour les cotisations, **Billing** pour l'abonnement Klubster.
  Le 0 % de commission est un invariant produit, pas une option de pricing.
- **Une promesse commerciale doit être vraie dans le code, pas dans un geste que le client ignore.**
  Le site annonçait « trois mois offerts » aux quinze premiers clubs et le code posait
  `trial_period_days: 30` — les deux mois manquants dépendaient d'un code promo à saisir soi-même.
  Depuis : `organisations.fondateur_rang` (séquence atomique, rang 1..15) et `joursEssai(rang)`,
  **une seule fonction** que consomment le checkout Stripe et l'écran d'abonnement.
- Un rang, un compteur de places, un numéro d'ordre : **jamais un `count(*)` lu puis écrit**.
  Deux créations simultanées passeraient toutes les deux. Séquence Postgres, point.
- Webhooks : signature HMAC vérifiée maison, idempotence atomique (`claim_stripe_event`),
  contrôle de propriété du compte connecté. **Un échec d'écriture doit lever** (500 → rejeu Stripe),
  jamais retourner silencieusement — c'est le rôle du `exiger()` local à
  `src/app/api/stripe/webhook/route.ts`, appliqué à toutes les écritures critiques.
- **Les montants sont recalculés côté serveur, toujours.** Une remise est enregistrée « à valider
  par le club » et l'adhérent paie plein tarif.
- Effectif facturable = **nombre d'adhérents** (unifié entre checkout, `palier_abonnement` et console
  admin). Toute modif de grille tarifaire touche la home **et** les CGV — elles se sont déjà contredites.

**Emails**

- Outbox `emails_journal` : réservation **atomique** avant envoi (`reserver_email` /
  `marquer_email_envoye` / `liberer_email`), unicité `organisation_id + motif + période`.
- **Garde-fou anti-harcèlement** : un motif n'est jamais renvoyé deux fois, au plus une relance par
  adhérent tous les 7 jours, filtrage à la saison courante et aux statuts actifs, clubs suspendus
  exclus. Purge à 13 mois (`purger_emails_journal`), documentée au registre RGPD.
- ⚠️ Les relances sont **désactivées pour usmboxe** (données historiques importées). Attention : c'est
  un réglage en base (`emails_config`), **il n'existe aucune exclusion par slug dans le code** — le seul
  filtre du cron est `accesClub(org) === "suspendu"`. Le vérifier en base avant de toucher au cron.

**Sources uniques — ne jamais en créer une seconde**

Un calcul dupliqué finit toujours par diverger, et la divergence ne se voit qu'une fois le mal fait.
Chacun de ces modules est LA source ; les écrans, le cron et la démo les consomment, ne les recopient pas.

| Module | Décide de | Consommé par |
| --- | --- | --- |
| `src/lib/finances.ts` | états financiers, reste à payer, tolérance 5 c | cockpit, fiche, export, relances |
| `src/lib/priorites.ts` | ce qui mérite l'attention, et à quel niveau | cockpit **et `/demo`** |
| `src/lib/ciblage.ts` | qui reçoit un message collectif | compteur, aperçu, envoi |
| `src/lib/relances.ts` | relancer ou non, motif, montant, destinataire | cron, écran relances, actions |
| `src/lib/pieces.ts` | statuts de pièce (`manquante`/`fournie`/`par_email`) | tous les écrans de dossier |
| `src/lib/csv-export.ts` | écriture CSV, injection de formule neutralisée | export serveur **et** export trésorerie |

**Import et export suivent les mêmes règles que l'inscription publique.** `importer_adherents`
reprend le chemin de `register_adherent_full` : capacité verrouillée puis liste d'attente, pièces
filtrées par cours et par `mineurs_seulement`, instantané `obligatoire`, tarif lu en base. Un import
qui ne crée pas les pièces produit des dossiers éternellement complets et tue les relances.

**Le rôle se contrôle en base, pas seulement à l'écran.** Une RPC `security definer` appelée
directement par l'API REST contourne toute garde applicative : un encadrant et un trésorier créaient
ainsi des adhérents. Toute RPC d'écriture porte `a_role_asso([...])`, comme `changer_cours`.

**Conformité — ce sont des obligations, pas des préférences**

- Santé : consentement explicite **art. 9.2.a uniquement**, jamais l'intérêt légitime ; consentement
  du représentant légal pour un mineur. **Le détail des réponses n'est jamais stocké** — seulement
  résultat, signature, date. La garantie est applicative, pas structurelle : la colonne `reponses`
  existe toujours mais `enregistrer_questionnaire_sante` force `'{}'::jsonb`. Ne pas défaire ça.
  Export CSV **sans données de santé**.
- Tout nouveau sous-traitant doit être déclaré dans `/sous-traitance`, `/confidentialite` **et**
  `docs/registre-des-traitements.md`. ⚠️ **Écart actif au 29/07/2026** : le registre ne liste que
  Supabase, Vercel et Stripe — **Resend et Microsoft Clarity y manquent** alors qu'ils figurent bien
  dans les pages publiques. À corriger.
- Pas de « hébergé dans l'UE » sans nuance : base en Irlande, Vercel et Resend américains sous CCT.
- Mesure d'audience : liste blanche stricte dans `src/components/site/Mesure.tsx`
  (`/`, `/tarifs`, `/fonctionnalites`, `/combat` — `/creer` volontairement exclu), et le composant
  n'est monté que dans le layout `(marketing)`. Double barrière : **jamais sur les espaces des clubs.**
  C'est écrit dans la politique de confidentialité. Ne pas élargir la liste sans y repenser.
- **Zéro placeholder sur les pages publiques**, et jamais de bandeau d'auto-invalidation
  (« à faire valider par un juriste ») sur une page légale opposable.
- Pied de page : `SiteFooter` pour le site et les vitrines ; les pages légales passent par
  `LegalShell`, qui a son propre `<footer>`. Deux implémentations à tenir en cohérence.
  Téléphone public 06 31 83 84 17. TVA non applicable, art. 293 B.

## Design

Direction éditoriale magazine-carnet, assumée et stable. **À ne pas « moderniser » :**

- **`border-radius: 0`**, imposé globalement dans `globals.css` en `!important` (seule exception
  assumée : `.kb-dot`). Zéro `rounded-*` dans le code. Toute rondeur ajoutée dilue la marque.
- Typographie : **Inter** pour le corps (`--font-sans`), **Space Grotesk** pour les titres
  h1/h2/h3 (`--font-display`), **Space Mono** pour les labels, kickers et chiffres (`.mono`),
  IBM Plex Mono pour le logo. Kickers avec `_`.
- Vert `brand` `#279B65` en **accent ≤ 5 %**, présent surtout en détail graphique.
- Photos couleur re-gradées chaudes, documentaires. **Aucune image au rendu IA.**
- La couleur d'une vitrine vient du **tenant** (`couleur_primaire`, défaut base `#189460`),
  jamais du vert Klubster. Un vert légèrement différent du token n'est donc pas un bug de thème.
- Accessibilité AA minimum, cibles tactiles ≥ 44 px sur les pages « terrain », labels ≥ 10-11 px.

## Langue et vocabulaire

**Tout le domaine est nommé en français** — tables (`adherents`, `adhesions`, `reglements`,
`pieces_adherent`, `presences`, `emails_journal`), RPC (`register_adherent_full`,
`enregistrer_reglement_webhook`, `anonymiser_adherent`, `palier_abonnement`), fonctions TS
(`resultatDepuisReponses`, `planifierEcheances`, `destinationSure`, `accesClub`), fichiers
(`garde.ts`, `emails-config.ts`), routes (`/creer`, `/connexion`, `/tarifs`). Reste dedans.

Le vocabulaire produit : **cockpit** (back-office d'un club), **adhérent** — jamais « utilisateur »,
et « membre » est réservé à l'équipe encadrante, pas à l'adhérent —, **adhésion**, **règlement**,
**pièce**, **présence**, **créneau**,
**chapitre** (bloc éditable de la vitrine), **vitrine**, **saison**.
Rôles : président (`admin_asso`), trésorier, secrétaire, encadrant, lecture seule, super-admin.

Ton : concret, sobre, sans jargon. Vouvoiement partout, **sauf `/combat`** où le tutoiement est
assumé. Le vocabulaire de terrain est une preuve d'initié : bureau, licence, forum des associations,
dossier incomplet, mercredi soir, « le questionnaire de santé remplace le certificat depuis 2021,
sauf pour la compétition ».

⚠️ **« association » vs « club » n'est pas tranché** : le H1 dit association, la nav et le cockpit
disent club. Demander avant d'uniformiser.

## Pièges connus — déjà payés une fois

1. **`www.` et l'apex sont deux origines.** Cookie PKCE et brouillon `localStorage` écrits sur l'une
   n'existent pas sur l'autre → confirmation d'email en échec silencieux **et** perte du wizard.
2. **Server Actions plafonnées à ~1 Mo.** L'ajout de chapitre avec photo n'a jamais atteint le
   serveur. Pour tout fichier volumineux : **upload direct navigateur → Supabase**.
3. **Ne jamais avaler une erreur.** `redirect()` dans un `try`, `return` silencieux, état d'échec
   indiscernable d'un succès : c'est l'axe de relecture n°1 du projet.
4. **`role = 'admin_asso'` exclut les `super_admin`.** Promouvoir un compte le faisait disparaître
   des recherches de président, et les notifications partaient au mauvais destinataire.
5. **Fallback obligatoire sur l'email du compte président** quand `organisations.email` est vide.
6. **Masquer une section sans mettre à jour la nav** = liens morts. `SiteHeader` doit recevoir les
   chapitres réellement rendus.
7. **Jamais d'état vide affiché au public**, jamais d'échec d'auth muet (`?erreur=confirmation` sans
   message a été le point d'abandon n°1).
8. **Jamais de chiffre en dur périssable** dans une page (« 312 adhérents cette saison »).
9. Une capture d'écran d'extension peut afficher en gris une image GPU pourtant visible : contre-vérifier
   avec Mathieu avant de conclure à un bug visuel.
10. Hors code, ne cherche pas à les corriger dans le repo : `NEXT_PUBLIC_CLARITY_ID`, nom d'expéditeur
    SMTP, 2FA du super-admin, URL de redirection Supabase Auth, domaine `auth.klubster.fr`.

## Méthode de travail

- **Rien de structurant sans accord** : schéma de base, dépendance, choix d'architecture, décision de
  DA. Avancer par petites étapes et montrer le résultat à chaque palier. En cas d'ambiguïté, poser la
  question plutôt que deviner.
- **« Vérifié » veut dire prouvé** : reproduit dans le navigateur, mesuré, ou lu dans le code / la base
  de prod, preuve citée. Tout ce qui n'est pas vérifié doit être annoncé comme tel.
- **Ne rien inventer.** Pas de fonctionnalité décrite qui n'existe pas dans le code, pas de preuve
  sociale avant qu'elle soit réelle, pas de chiffre de promesse non chronométré.
- **Le filtre 18 h** : une fonctionnalité qu'un président n'ouvrirait pas avant d'ouvrir la salle ne
  se code pas. Déjà refusés à ce titre : tableau de bord analytique, module comptabilité / export FEC,
  application mobile native, génération de pages par IA, gestion des bénévoles.
- **Ne jamais toucher aux données d'une association réelle** sans demande explicite. Les tests se font
  sur des comptes dédiés (`+audit`, `+adherent`), supprimés ensuite.
- Un audit qui ne trouve rien après ses propres corrections est complaisant : chercher aussi les
  régressions qu'on vient d'introduire.
- Au premier « ça ne marche pas », **faire ouvrir la session côté Mathieu** avant de diagnostiquer.
  Trois diagnostics faux d'affilée (RLS → droits → taille de photo) sont venus d'un test dans une
  autre fenêtre.

## Points ouverts, assumés

Pas de suite E2E (attaques PostgREST ciblées rejouées, mais pas de parcours complets avec horloges de
test Stripe). 2FA du super-admin à activer. **Turnstile et le rate-limit distribué ne protègent que le
formulaire d'inscription** (`verifierSoumissionPublique` n'est importé que par
`src/app/[asso]/inscription/actions.ts`) : `/creer` et `/connexion` reposent uniquement sur les
limites Supabase. Lecture des dossiers par rôle : choix assumé et documenté au registre plutôt
qu'une refonte.

## État au 4 août 2026 — branche de release prête, rien n'est déployé

`main` (`42ff19d`) porte encore **tous** les défauts d'origine : import qui ne crée pas les pièces,
export vulnérable à l'injection de formule, trois mois offerts non appliqués. La production tourne
là-dessus.

La branche **`release/klubster-commercial-v1-demo` (`d3a28f9`)** intègre les douze branches de lots
plus la démo : **1050 tests, 46 fichiers, build ✔, tsc ✔, eslint 0 erreur**. Elle attend une
autorisation de fusion. Ordre d'application des migrations = ordre alphabétique des noms de fichiers
(`0028` puis les horodatées), les dépendances de données le suivent.

**Aucun feu vert commercial** tant que : migrations appliquées, production déployée, tests
post-déploiement rejoués, club pilote réel. Une PR verte isolément ne prouve pas que sa fusion
l'est — la fusion a d'ailleurs révélé quatre défauts qu'aucune PR ne montrait.

Reprise détaillée : **`docs/reprise-lot-S.md`**.

## Sur les fichiers de la racine

Les `audit-*.md`, `corrections-a-valider.md`, `propositions-ameliorations.md` sont des **archives
datées** : utiles pour comprendre une décision, jamais comme source de l'état actuel — beaucoup de
points y sont déjà corrigés. `AUDIT-ENTETE.md` (en-tête de l'export du 22/07 pour relecture externe)
est la meilleure synthèse technique disponible — lire l'en-tête seul, pas le dump qui suit.
`PROMPT_claude-code.md` est un document de démarrage **partiellement périmé** : il pointe vers quatre
docs qui n'existent pas et vers un vocabulaire (« Équipage », « Tour de contrôle ») abandonné —
ne pas le citer comme référence. Les `klubster-code-*.md` et `cockpit-code-export.md` sont des dumps
volumineux générés par `export-code.sh` : ne pas les ouvrir sans raison.
