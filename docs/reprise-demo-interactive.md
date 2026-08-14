# Reprise — démonstration interactive `/demo`

Document de passation, réécrit le **01/08/2026**. Il remplace la version du 31/07 : les
lots 4 à 10 sont faits, et ce qui suit décrit l'état réel de la branche, pas le plan.

---

## 1. Où en est la branche

```
branche : feat/demo-judo — la bascule judo, reportée sur origin/main le 14/08/2026
origine : feat/demo-interactive, qui était restée un ANCÊTRE de main (la release y a
          été fusionnée depuis : lot S, priorités du cockpit, tokens de couleur)
fusion  : AUCUNE — ne rien fusionner sans accord explicite de Mathieu
```

**Ne cherchez pas ici le SHA de tête : il serait faux.** Un document qui note son propre
commit se trompe forcément — le commit qui l'enregistre vient après lui. La version
précédente l'a appris à ses dépens : elle affichait `1bb54af` et « 22 commits » alors que
la branche était à `a45959d` et 24. Deux repères stables, et une commande pour le reste :

| Repère | Valeur |
|---|---|
| Base de la branche | `origin/main` au 14/08/2026 — la release y est fusionnée |
| Ce que `feat/demo-judo` ajoute à `main` | la bascule judo, et rien d'autre (`git rev-list --count origin/main..HEAD`) |
| Branche d'origine, désormais close | `feat/demo-interactive` (`284ad82`), restée en arrière de `main` |

```bash
# L'état courant, toujours vrai, jamais recopié :
git log --oneline -1
git rev-list --count origin/main..HEAD
git diff origin/main...HEAD --stat | tail -1
```

Dernière chaîne complète, lue jusqu'au bout :

| Étape | Résultat |
|---|---|
| `npm test` | `TEST_EXIT=0` — **1095 tests**, 49 fichiers (14/08, sur `feat/demo-judo`) |
| `npm run build` | `BUILD_EXIT=0` — 18 routes `/demo/*`, 14 prérendues statiques |
| `npm run typecheck` | `TC_EXIT=0` |
| `npm run lint` | `LINT_EXIT=0` — 0 erreur, 12 avertissements, **tous pré-existants** |

Les 12 avertissements portent sur `CombatClient`, `HeroFight`, `CreerWizard`,
`FormBuilder`, `Scanner`, `QuestionnaireSante`, `GuideInstallation`, `Citation`,
`PushSetup`, `Reveal` et les deux fichiers de configuration. Aucun ne vient de `demo`.
Ne pas les compter comme une régression.

⚠️ **Sous forte charge machine, des tests d'interface tombent en `Test timed out in
5000ms` sans la moindre erreur d'assertion.** C'est arrivé le 14/08 : treize échecs à
une charge moyenne de 262, zéro échec vingt minutes plus tard sur le même commit. Un
échec sans message d'assertion se rejoue avant d'être cru.

---

## 2. Le piège d'environnement, à connaître avant tout

`NODE_ENV=production` traîne dans l'environnement du terminal local (pas dans le dépôt,
pas dans la CI). Sous ce réglage, React charge sa version de production, **où `React.act`
n'existe pas** : les tests d'interface tombent avec `TypeError: React.act is not a
function` alors que le code est parfaitement sain.

```bash
NODE_ENV=test npm test        # toujours préfixer
NODE_ENV=test npx vitest run tests/demo-messages.test.tsx
```

Le dépôt n'a **pas** été modifié pour contourner ça.

Note pratique : `npm run build` dépasse le délai des appels de terminal. Le lancer en
arrière-plan vers un fichier de log et interroger le log.

**Attention si vous travaillez depuis un bac à sable Linux** : `node_modules` est installé
pour macOS. `rollup` et `esbuild` y ont des binaires par plateforme, et vitest refuse de
démarrer avec `Cannot find module @rollup/rollup-linux-x64-gnu`. Les commandes doivent
tourner sur la machine de Mathieu, pas dans le bac à sable.

---

## 3. Les routes existantes

```
/demo                          hub
/demo/adherents                liste, filtres, pagination
/demo/adherents/[id]           fiche
/demo/adherents/nouveau        ajout manuel
/demo/adherents/import         import CSV
/demo/controle                 contrôle au bord du tapis
/demo/paiements                encaissements
/demo/paiements/relances       relances
/demo/paiements/remise         remise de chèques
/demo/messages                 composeur + historique
/demo/messages/[id]            détail d'une campagne
/demo/actualites               atelier + aperçu de vitrine
/demo/actualites/[id]          la page publique d'une actualité
/demo/inscriptions             atelier du formulaire
/demo/inscriptions/apercu      ce que l'atelier produit, en lecture seule
/demo/site                     vitrine + mode édition
/demo/cours                    cours, tarifs, jauges, liste d'attente
/demo/piece/[id]               document fictif
```

---

## 4. Ce qui est fait — lots 1 à 10

| Lot | Objet | Commit |
|---|---|---|
| 1 | Import et export CSV | `2cf2491` |
| 2 | Contrôle terrain | `cfaa677` |
| 3 | Paiements, relances, remise | `04ce0b8` |
| 4 | Messages | `f84c8be` |
| 5 | Actualités | `9bf3a7c` |
| 6 | Inscriptions | `04b1d85` |
| 7-10 | Site, cours, isolation, accessibilité | `1bb54af` |

### Lot 4 — Messages

Les adhérents **sans email** n'entrent nulle part : le club en a un, le compteur dit donc
33 sur 34. Le groupe « Parents (adhérents mineurs) » sélectionne les adhérents **mineurs**
et écrit à l'adresse de leur dossier, qui est celle du représentant légal ; il rend donc
24 destinataires. Son libellé **archivé** diffère du libellé affiché : « Responsables
légaux des mineurs ».

⚠️ **Corrigé le 13/08/2026, avec le passage au judo.** Le groupe rendait auparavant
**zéro** en dur, avec le commentaire « aucun mineur dans ce club » — vrai du club de yoga,
faux dès qu'un club en accueille. Le test qui avait besoin d'un groupe vide s'appuie
désormais sur un créneau neuf où personne n'est encore inscrit.

**Le compteur qui se trompe tout seul** : « accepté » n'est pas exclusif de « distribué ».
`nombre_acceptes` est posé à l'envoi et `appliquer_evenement_resend` n'y retouche jamais.
Compter les seules lignes restées au statut `accepte` afficherait « 0 accepté ·
32 distribués » : arithmétiquement satisfaisant, et faux.

Le `mailto:` et le presse-papier du vrai écran **ne sont pas repris** : ils sortent de la
page pour agir sur la machine du visiteur.

### Lot 5 — Actualités

Deux gestes, et pas un de plus : publier, supprimer. La **date de publication n'ordonnance
rien** — une actualité datée du mois prochain est visible tout de suite, et un test le
prouve. L'aperçu de vitrine montre les deux emplacements que le chapô annonce.

Correction au réducteur : le comparateur de tri renvoyait `-1` pour deux dates égales — il
annonçait donc « a avant b » **et** « b avant a ». Il rend maintenant `0`, et la stabilité
du tri tient le rôle de `created_at desc`.

### Lot 6 — Inscriptions

Six blocs dans l'ordre du produit, avec ses asymétries : les réductions n'ont pas de
flèches, les autorisations et les pièces en ont ; une pièce se rattache à un cours, un
champ non ; le champ des options n'apparaît que pour une liste de choix.

**Trois écarts assumés** : pas de brouillon `localStorage` (la phrase qui le promet est
remplacée), pas de modèles de départ (`formulaireType()` fabrique ses identifiants avec
`Math.random()`), et le modèle joint à une pièce reste inerte.

`/demo/inscriptions/apercu` est **en lecture seule** : une démonstration publique n'a pas
à recueillir de nom, d'adresse ni de donnée de santé, fût-ce pour faire joli.

### Lot 7 — Site

La vitrine et son mode édition sur la même page, avec la bascule `TERMINER →` /
`MODIFIER LE SITE →`. Le produit les distingue par `?edition=1` ; ici c'est un booléen
local, aucune URL ne devant porter d'état dans une simulation qui se réinitialise.

Retirer un chapitre standard le **masque** et il se réaffiche ; un chapitre personnalisé
est **supprimé**. Un chapitre retiré perd son ancre : la navigation et le bouton
« DÉCOUVRIR LES COURS » disparaissent avec lui.

Les chapitres à photos restent dans la bibliothèque et disent ce qu'ils ne peuvent pas
faire ici.

### Lot 8 — Cours et tarifs

Un tarif modifié suit jusqu'à la vitrine **et** jusqu'à l'aperçu du formulaire ; deux
tests le prouvent d'un écran à l'autre. Un cours qui compte des adhérents ne se supprime
pas, et l'écran le dit avant le clic.

### Lot 9 — Isolation

`tests/demo-isolation.test.ts` cherche vingt interdits dans le code de `/demo`,
**commentaires retirés** — sans ce nettoyage, ce sont les fichiers les plus scrupuleux qui
échouent, puisqu'ils écrivent en toutes lettres ce qu'ils s'interdisent. Il vérifie aussi
l'absence de Server Action importée, l'absence de lien sortant, et que toutes les adresses
sont en `@example.com`.

### Lot 10 — Accessibilité

`tests/demo-accessibilite.test.tsx` couvre **les dix-huit routes**, pages dynamiques
comprises (paramètres déjà résolus, sous `<Suspense>`). Six vérifications par écran : un
seul `h1` ; un nom accessible sur tout ce qui se clique ; une étiquette sur tout champ ;
**aucun doublon de nom** dans le `<main>` ; une cible tactile déclarée partout ; aucune
information portée par la seule couleur.

Un dix-neuvième test compare la liste des écrans au contenu réel de `src/app/demo` :
ajouter une route sans l'ajouter à la liste fait tomber le test, au lieu de laisser la
couverture se dégrader en silence. C'est ce garde-fou qui manquait — la première version
de ce fichier ne montait que sept routes sur dix-huit.

Ce que l'extension a trouvé, et qui est corrigé : « Consulter » et « ✓ Reçue » répétés
sur chaque pièce d'une fiche ; le bouton d'encaissement retombant sur son `title`,
identique pour tout le monde ; dix « SIMULER LA RELANCE » indistincts ; les flèches d'un
champ et d'une pièce dans l'atelier ; six « S'INSCRIRE À CE COURS » et trois « LIRE » sur
la vitrine ; six « + AJOUTER UN CRÉNEAU » et six « SIMULER L'ENREGISTREMENT » sur les
cours ; et le nom d'un adhérent en liste d'attente, cliquable sur 24 px de haut.
`BoutonSimuler` et `GesteInerte` acceptent désormais un `nomAccessible`.

La couleur du club se dédouble : `CLUB.couleur` (`#6B7F5E`) pour les accents non textuels,
`CLUB.couleurTexte` (`#3F4C36`, 8,9:1 sur le papier) pour tout ce qui porte du texte. Le
test vérifie **par le calcul** que la brute échoue en AA et que l'assombrie passe, de
sorte qu'une « correction » de la donnée du club plutôt que de son usage ferait tomber le
test.

---

## 5. Ce qui a été mesuré au navigateur — et comment

Tout ce qui suit a tourné sur le **build de production** (`npm run build` puis
`next start`), jamais sur `next dev`.

### La méthode des trois largeurs

Redimensionner la fenêtre ne marche pas : macOS refuse de descendre sous une largeur
minimale, et `resize_window` répond « succès » sans que la mise en page bouge. La bonne
réponse tient en une ligne : **une `<iframe>` de 390 px de large EST un viewport de
390 px.** Les media queries CSS s'y résolvent contre la largeur de l'iframe, pas contre
celle de la fenêtre. Aucun outil à installer, et une mesure réelle plutôt qu'une
déclaration relue.

Ce qu'on lit dans l'iframe, à chaque largeur :

- `documentElement.scrollWidth − largeur` → le **débordement horizontal** en pixels ;
- `getBoundingClientRect().height` de chaque bouton et lien du `<main>` → la **hauteur
  rendue** des cibles tactiles, et non la classe qui prétend la produire ;
- le nombre de `<h1>`.

**Résultat : 18 routes × 3 largeurs (390, 768, 1280) = 54 mesures, zéro défaut.**

Un défaut a été trouvé et corrigé au passage : à 390 px, `/demo/inscriptions` débordait
de **36 px**. La ligne d'en-tête d'une page du formulaire — numéro, titre, `↑ ↓ ✕` — ne
passait pas à la ligne, et les trois boutons de 44 px poussaient le champ hors de
l'écran. `flex-wrap` et une largeur minimale sur le champ.

### Le parcours complet, en une seule session d'état

Quatorze gestes enchaînés sans rechargement, du hub à la réinitialisation. Vérifié :

| Ce qui a été fait | Résultat |
|---|---|
| Modifier une coordonnée sur une fiche | « Marion-TEST » enregistré |
| Verser un acompte | reste recalculé |
| **Revenir par le lien d'en-tête** | état conservé — voir le défaut ci-dessous |
| Marquer une présence au contrôle | « ✓ PRÉSENT AUJOURD'HUI » |
| Solder une cotisation | solde total 2 845,00 € → 2 700,00 € |
| Préparer une remise de chèques | bordereau affiché |
| Simuler un message | en tête de l'historique |
| Publier une actualité | « À la une » sur l'aperçu |
| L'ouvrir sur `/demo/site` | reflet immédiat |
| Passer le Yin Yoga à 412 € | répercuté sur la vitrine |
| `RÉINITIALISER` | tarif revenu à 295,00 € |
| Modifier à nouveau puis **recharger** | 999,00 € → 295,00 € |

**Un défaut sérieux, trouvé là et nulle part ailleurs.** Le lien de retour de
`EnTeteDemo` était un `<a href>` nu. Un `<a>` ordinaire provoque une navigation de
DOCUMENT : le layout est rechargé, le `DemoProvider` remonté, **et tout l'état simulé
disparaît**. Un visiteur qui encaissait un chèque puis cliquait « ← AUJOURD'HUI »
retrouvait le club dans son état de départ, sans rien pour le lui dire. Aucun test
d'interface ne pouvait le voir : `happy-dom` ne navigue pas. Corrigé par `next/link`, et
un garde-fou ajouté dans `tests/demo-isolation.test.ts` (les liens `target="_blank"`
restent permis : ils n'ont pas cet effet).

### Traces locales et réseau

Après le parcours, avant comme après réinitialisation :
`localStorage` **vide**, `sessionStorage` **vide**, `document.cookie` **vide**,
`indexedDB.databases()` **vide**. Aucune erreur de console, aucun avertissement
d'hydratation.

**54 requêtes réseau, toutes vers `localhost`** — segments RSC de Next et morceaux de
JavaScript statiques. Rien vers Supabase, Stripe, Resend, Clarity ou une route `/api/`.

**Une observation non expliquée, consignée telle quelle** : six préchargements RSC
simultanés de `/demo/adherents/[id]`, déclenchés par le navigateur à l'affichage de la
liste, ont répondu **503**. Les mêmes URL répondent 200 à la demande, en série comme en
parallèle (`curl`), le journal du serveur ne montre aucune erreur, et la navigation n'a
jamais été affectée. Cela ressemble à un délestage de préchargement propre à Next, pas à
une page en échec — mais ce n'est pas prouvé, et il ne faut pas le classer avant de
l'avoir revu.

### Ce qui n'a PAS pu être vérifié

**Le parcours sur la preview Vercel.** L'URL est connue, le déploiement est vert, et la
page reste inatteignable :

```
https://klubster-git-feat-demo-interactive-klubsters-projects.vercel.app/demo
```

Elle redirige vers `vercel.com/login` : la **protection de déploiement** (SSO Vercel) est
active sur les previews du projet. S'y connecter demanderait de saisir des identifiants,
ce qui n'est pas une opération que je fais. Deux sorties, toutes deux du ressort de
Mathieu : ouvrir la preview depuis une session Vercel déjà connectée, ou passer la
protection en « Only Preview Deployments / Disabled » le temps de la revue.

Le parcours a donc été fait sur le **build de production local** (`npm run build` puis
`next start`), qui est le même artefact que celui déployé — mais servi depuis une autre
machine, sans le CDN ni les en-têtes de Vercel. C'est ce qui reste à confirmer.

**Deux erreurs de la version précédente de ce document, corrigées ici.**

1. J'y avais écrit que le dépôt était **privé** et que l'API GitHub échouait pour cette
   raison. Il est **public** : la page du dépôt le dit en toutes lettres. Le constat
   d'échec était juste, l'explication inventée.
2. J'en avais conclu que le projet n'était pas sur un compte Vercel accessible. Il est
   sur `klubsters-projects` — une équipe que l'outil de listage employé ne voit pas, ce
   qui n'est pas la même chose qu'une absence.

Dans les deux cas, une explication commode a été préférée à « je ne sais pas ». C'est
exactement ce qu'un rapport de vérification ne doit pas faire : le lecteur se fie au
diagnostic, pas seulement au symptôme.

| Sujet | État |
|---|---|
| Chapitres à photos de `/demo/site` | inertes, par décision |
| Modèle joint à une pièce | inerte, par décision |
| Parcours sur la preview Vercel | bloqué par la protection de déploiement — voir ci-dessus |
| 503 sur les préchargements de fiches | observé, non expliqué |

---

## La revue

**PR #9**, en brouillon, ouverte le 01/08/2026 :
<https://github.com/Klubster/klubster/pull/9>

Elle ne doit pas être fusionnée avant trois choses : la revue du diff, le parcours sur la
preview, et une décision explicite sur les 503 de préchargement.

---

## 6. Règles de travail à ne pas relâcher

**Interdictions absolues sous `/demo`** : Supabase, Server Actions, routes API, `fetch`,
Stripe, Resend, Storage, cookies, `localStorage`, `sessionStorage`, IndexedDB,
authentification, données réelles. Emails fictifs en `@example.com` uniquement.
`tests/demo-isolation.test.ts` le vérifie ; **si un écran a besoin d'un de ces interdits,
ce n'est pas la liste qu'il faut modifier, c'est l'écran.**

**Vocabulaire des gestes** : le dernier geste d'un parcours porte **toujours** le mot
`SIMULER`.

**Déterminisme** : aucun `Date.now()`, aucun `Math.random()`, aucun `new Date()` sans
argument. Les instants portent leur décalage horaire (`DECALAGE_PARIS`), et toute lecture
de calendrier passe par `timeZone: "Europe/Paris"`. Sans cela, le rendu du serveur et
celui du navigateur divergent, et React remplace tout l'arbre au premier affichage.

**Méthode par lot** : retrouver les routes réelles → lire les composants → lire les Server
Actions → lire les RPC et migrations → reproduire uniquement ce qui existe → écrire les
tests sur les vrais écrans de `/demo` → **réintroduire temporairement les principaux
défauts pour prouver que les tests tombent** → restaurer → chaîne complète → commit vert.

**Ne jamais annoncer vert** avant d'avoir lu le résultat final des quatre étapes.

---

## 7. Conventions de test en place

Fichiers `.tsx` avec `// @vitest-environment happy-dom` en première ligne. Le défaut
reste `node`.

```tsx
// Sonde : lire l'état réel, ne jamais recalculer ce que le code produit
let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => { vu = etat; }, [etat]);
  return null;
}

// Monter le layout UNE fois ; le démonter remonterait le provider
const monter = (ecran) => render(<DemoLayout>{ecran}<Sonde /></DemoLayout>);

// BoutonSimuler attend 450 ms : vérifier à 449 (rien) puis à 450 (mutation exacte)
const avancer = (ms) => act(() => void vi.advanceTimersByTime(ms));

// Les <select>, <input> et <textarea> se changent par le setter natif du prototype,
// sinon React n'écoute rien

// Une page dynamique reçoit une promesse DÉJÀ RÉSOLUE (`paramsResolus`) et un
// <Suspense> : sous horloge simulée, une promesse en attente ne se réveille jamais
```

Pièges déjà payés :

- `a[href^="/demo/adherents/"]` attrape aussi les boutons d'en-tête ;
- `eur()` produit des espaces fines insécables : comparer sur `replace(/\D/g, "")` ;
- `getByText` **normalise les blancs** : chercher une phrase sans retour à la ligne ;
- chercher un mot dans `document.body.textContent` attrape les phrases d'aide — pour
  prouver qu'un champ n'existe pas, inspecter les `input/select/textarea` ;
- deux écrans montés côte à côte partagent le provider, ce qui est utile pour tester une
  circulation d'état — mais `getByText` trouve alors les deux : cibler par `section#id` ;
- un même libellé peut apparaître dans la base d'un formulaire ET dans une liste de types
  de champ (« Téléphone »).

---

## 8. Les données du club, et ce qu'elles portent

`Judo Club des Peupliers`, judo, Laval. 34 adhérents **dont 24 mineurs**, 6 cours, une
saison `2026-2027`, horloge figée au **mardi 20 octobre 2026, 19 h**.

**Le club a changé de discipline le 13/08/2026, et ce n'est pas cosmétique.** La campagne
de prospection vise 2 000 clubs de sports de combat : la démonstration devait montrer ce
que l'email promet — des dossiers d'enfants, une autorisation parentale à réclamer, un
questionnaire de santé signé par un parent. Le club de yoga ne le pouvait pas, faute de
mineurs. Klubster n'est pour autant pas un logiciel de combat : le judo est un décor,
et rien dans le code de `/demo` ne connaît de ceinture ni de tatami.

Ce que les données rendent atteignable, et qu'il ne faut pas casser :

- **un adhérent sans email** (Michel Chevalier) — fait exister le « 33 sur 34 » du
  composeur et la mention « Pas d'email » des relances ;
- **24 mineurs sur 34** — font vivre le groupe « Parents », les autorisations parentales,
  et le bloc « Responsable légal » de la fiche. La minorité se **déduit** de
  `date_naissance` via `estMineur` (`src/lib/sante.ts`), jamais d'un indicateur posé sur
  la fiche : c'est la règle du serveur, et la démonstration ne s'en écarte pas. Aucune
  date de naissance n'est en octobre, pour qu'un décalage de fuseau ne puisse faire
  basculer personne d'un groupe à l'autre entre le rendu serveur et le rendu navigateur ;
- **cinq dossiers incomplets** — cinq autorisations parentales jamais rendues, ce qui fait
  vivre le groupe « Dossiers incomplets » ;
- **deux questionnaires de santé concluent au certificat** — seul chemin du produit vers
  une pièce « certificat médical ». En judo le questionnaire **suffit** depuis 2021, sauf
  réponse positive et sauf compétition ; le certificat systématique est l'affaire de la
  boxe anglaise. Ne pas réécrire l'inverse ;
- **deux personnes n'ont que la saison passée** — sans elles, « RENOUVELER LA SAISON »
  répond immédiatement « tout le monde en a déjà une » ;
- **les poussins sont complets, sept inscrits pour sept places** — c'est la jauge, et rien
  d'autre, qui ouvre la liste d'attente. Corrigé le 01/08 : le cours annonçait 22 places
  pour 7 inscrits, et une enfant attendait pourtant ;
- **une seule adhésion payée par carte** — seul chemin vers le panneau de remboursement ;
- **cinq chèques non remis** — matière de la remise ;
- **trois enfants déjà présents ce soir** — le contrôle montre l'état « déjà présent ».

**Dette levée.** La portée d'âge d'une pièce (`form_config.pieces[].mineurs_seulement`) est
ce qui évite de réclamer une autorisation parentale à un adulte. Elle était absente du tronc
tant que la release n'était pas fusionnée ; elle y est depuis (migration
`20260804090000_pieces_mineurs.sql`, `src/types/form.ts`, le `FormBuilder` du cockpit et le
filtre de `src/app/[asso]/inscription/actions.ts`). La démonstration ne devance plus son
propre produit : la case « MINEURS UNIQUEMENT » de `/demo/inscriptions` a désormais un
équivalent exact dans le cockpit réel.
