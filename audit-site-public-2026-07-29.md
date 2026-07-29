# Audit du site public Klubster — 29 juillet 2026

Périmètre : les huit pages publiques, mesurées **en production** sur `klubster.fr`
après la fusion de `a111427`.

Toutes les valeurs de ce document sont **mesurées dans le DOM rendu**, aux largeurs
1280 px et 390 px, pas estimées à la lecture du code. Chaque point porte sa preuve.

**Aucune modification de code n'a été faite.** Ce document est un constat et des
propositions ; les arbitrages restent à Mathieu.

---

## Verdict d'ensemble

| Dimension | Note | Constat principal |
|---|---|---|
| Accessibilité | 2/4 | 39 textes sous le seuil AA sur `/fonctionnalites`, aucun lien d'évitement |
| Responsive | 3/4 | Aucun débordement horizontal, mais des cibles tactiles sous 44 px |
| Thématisation | 4/4 | Tokens partout, zéro couleur en dur relevée, `border-radius: 0` tenu |
| Typographie | 2/4 | 57 textes sous 10 px, lignes jusqu'à ~198 caractères |
| Message et conversion | 2/4 | Deux CTA primaires concurrents, vocabulaire non tranché |
| Direction visuelle | 4/4 | La DA tient, les pages récentes ne détonnent pas |

**Total : 17/24.** Le socle est sain — c'est un site tenu, cohérent, sans dette
visuelle. Ce qui pèche est concentré sur deux points : la lisibilité des
reconstructions d'interface, et l'éparpillement du message d'action.

### Le site a-t-il l'air fait par une IA ?

**Non, et c'est remarquable.** Aucun des marqueurs habituels : pas de dégradé sur du
texte, pas de verre dépoli, pas de grille de cartes identiques, pas de bloc « gros
chiffre + petit label », pas de fond crème. `border-radius: 0` est tenu sur les
huit pages, sans une seule exception relevée. Les photos sont documentaires. Le
vocabulaire est celui du terrain.

Une réserve, et une seule. Le kicker en petites capitales espacées au-dessus de
chaque section (`LE PROBLÈME_`, `L'OFFRE_`, `LA PREUVE_`) est aujourd'hui l'un des
tics les plus reconnaissables des pages générées. Chez Klubster il est *systémique et
signé* — le `_` vert le rattache au logo `k_`, c'est une grammaire de marque, pas un
réflexe. Il passe. Mais `/clubs-fondateurs` en aligne cinq sur cinq sections, et
c'est la page où il ressemble le plus à du remplissage. Une section sans kicker y
casserait la mécanique et ferait respirer.

---

## P1 — À corriger avant la campagne

### P1-1 · `/fonctionnalites` : 39 textes sous le seuil AA

**Mesuré :** 39 éléments sous le ratio minimum, 57 textes sous 10 px, dont des
libellés à **8 px** (`DOSSIERS À TERMINER`, `COTISATION À RELANCER`,
`INSCRIPTIONS · 7 JOURS`) au ratio **3,29:1** contre les 4,5:1 requis.

**Cause :** `text-ink-faint` (`#8C8C88`) plafonne à 3,29:1 sur `paper`. Il est
lisible en gros corps, jamais en 8 ou 9 px. Le couple « couleur la plus pâle + taille
la plus petite » se retrouve 16 fois dans `fonctionnalites/page.tsx`, 7 fois dans
`Apercus.tsx`, 2 fois dans `CockpitPreview.tsx`.

**Ce que ça viole :** WCAG 2.2 AA 1.4.3, et la règle du projet lui-même —
CLAUDE.md écrit « labels ≥ 10-11 px ». 28 occurrences de `text-[8px]` / `text-[9px]`
sont dans le dépôt.

**Ce que je proposerais :** relever le plancher à 10 px et passer ces libellés de
`text-ink-faint` à `text-ink-soft` (`#6f6f6b`, mesuré à 5,3:1). Les reconstructions
grandissent d'environ 15 % — c'est le prix, et elles gagnent en lisibilité sur
téléphone où elles sont aujourd'hui à la limite du déchiffrable.

**Nuance honnête :** ce sont des maquettes d'interface, pas du contenu de lecture.
Un auditeur strict les compte comme du texte ; un lecteur les regarde comme une
image. Le risque juridique est faible, le risque d'usage est réel sur mobile.

### P1-2 · Aucun lien d'évitement

**Mesuré :** aucun élément de type « aller au contenu » sur les huit pages.

**Ce que ça viole :** WCAG 2.4.1 « Contournement de blocs », **niveau A** — pas AA.
C'est le seul manquement de niveau A trouvé.

**Impact :** un utilisateur au clavier ou au lecteur d'écran traverse les 4 à 6
liens de navigation à chaque page avant d'atteindre le contenu.

**Correctif :** un lien masqué en premier enfant du `<main>`, révélé au focus. Une
dizaine de lignes, aucune incidence visuelle.

### P1-3 · Deux CTA primaires se disputent la home

**Mesuré sur `/` :** quatre appels à l'action distincts —
`CRÉER MON ASSOCIATION` (nav), `CRÉER MON ASSOCIATION →` (deux fois),
`DEVENIR CLUB FONDATEUR →`, plus `Créer mon association` au pied de page.

Deux d'entre eux mènent à des endroits différents (`/creer` et
`/creer?offre=fondateur`) pour la même intention. Le visiteur doit choisir entre
deux portes qui donnent sur la même pièce.

**Ce que ça coûte :** l'offre fondateur est le meilleur argument du moment — import
du fichier repris, trois mois offerts. Elle est présentée comme une *alternative* au
parcours normal, alors qu'elle devrait être le parcours normal tant que les quinze
places existent.

**Ce que je proposerais :** un seul CTA sur la home pendant la campagne, pointant
vers `/creer?offre=fondateur`, l'offre fondateur devenant l'argument du bouton plutôt
qu'une deuxième porte. À rebasculer sur `/creer` quand les quinze clubs seront pris.

### P1-4 · « Association » ou « club » : le site n'a pas tranché

**Mesuré :** `/clubs-fondateurs` dit `CRÉER MON CLUB` dans son en-tête et ses trois
CTA — mais son pied de page dit `Créer mon association`. Sur la même page. Les
quatre autres pages disent `CRÉER MON ASSOCIATION`, la nav et le cockpit disent
« club ».

CLAUDE.md signale l'arbitrage comme non tranché. Il ne peut plus attendre : la
campagne va marteler ces pages, et un prospect qui lit deux mots pour la même chose
sur un même écran doute du sérieux du produit.

**Mon avis, puisque tu le demanderas :** « club » gagne. C'est le mot que tes
prospects emploient entre eux, il est plus court, il tient mieux dans un bouton, et
« association » sonne administratif — précisément ce que Klubster prétend leur
épargner. Mais le H1 de la home dit « association », et le changer touche la marque :
c'est ta décision, pas la mienne.

---

## P2 — À corriger dans la foulée

### P2-1 · Cibles tactiles sous 44 px

**Mesuré à 390 px de large :** 18 éléments interactifs sous 44 px sur la home, 20 sur
`/clubs-fondateurs`, 16 sur le cas client, 23 sur `/fonctionnalites`.

Les plus gênants sont les liens secondaires, hauts de **19 à 21 px** :
`VOIR COMMENT ÇA FONCTIONNE →`, `LIRE LE CAS DU PREMIER CLUB →`,
`Voir le site public d'un club →`. Larges mais plats — la zone de frappe est une
bande fine.

**Sur la vitrine club** — la page « terrain » où CLAUDE.md exige ≥ 44 px —
`S'INSCRIRE →` mesure **35 px** de haut et `LIRE →` **21 px**.

**Ce que ça viole :** WCAG 2.2 AA 2.5.8 (24 px minimum) est respecté ; la règle
interne des 44 px ne l'est pas. C'est donc une exigence maison, plus stricte que la
norme, que le site ne tient pas.

**Correctif :** `py-3` sur les liens secondaires suffit à passer de 19 à 44 px sans
rien changer visuellement, l'espace autour du texte étant déjà là.

### P2-2 · Lignes trop longues sur écran large

> **Correction du 29/07/2026 — ma première mesure était fausse.** J'avais annoncé
> « ~198 caractères » sur quatre pages. Ce chiffre venait de la largeur de la *boîte*
> des paragraphes, pas de la largeur du *texte* rendu : des paragraphes d'une seule
> ligne, dans un conteneur large, comptaient comme des lignes de 198 caractères.
> Remesuré au `Range`, sur les seuls paragraphes qui font au moins deux lignes.

**Mesuré, deuxième passe :**

| Page | Lignes au-dessus de 78 caractères | Maximum réel |
|---|---|---|
| `/` | aucune | — |
| `/tarifs` | 6 paragraphes | 89 car. |
| `/cas-clients/usm-boxe-anglaise` | 5 paragraphes | 90 car. |

Le confort de lecture plafonne autour de 65-75 caractères. Ce sont les réponses de la
FAQ tarifs et les descriptions du cas client — 15 px dans un conteneur de 768 px,
sans `max-w-prose`. Dépassement réel, mais modeste : 15 à 20 % au-dessus de la limite
haute, pas 160 %.

**La home est propre**, contrairement à ce que j'avais écrit.

**Correctif :** `max-w-prose` sur ces paragraphes-là. Invisible sur téléphone.

### P2-3 · Métadonnées tronquées dans les résultats de recherche

**Mesuré :**

| Page | Titre | Description |
|---|---|---|
| `/` | 79 car. — **tronqué** | 236 car. — **tronquée** |
| `/tarifs` | 50 car. | 210 car. — **tronquée** |
| `/fonctionnalites` | 26 car. | 168 car. |
| `/cas-clients/usm-boxe-anglaise` | 50 car. | 152 car. |
| `/clubs-fondateurs` | 27 car. | 156 car. |

Google coupe les titres vers 60 caractères et les descriptions vers 155-160. Le
titre de la home perd « site web », et sa description perd sa fin — dont
« premier mois offert », qui est un argument de clic.

`/fonctionnalites` a le problème inverse : « Fonctionnalités — Klubster » ne contient
aucune requête réelle. Personne ne tape ça.

### P2-4 · Le kicker sur cinq sections consécutives

`/clubs-fondateurs` empile `LANCEMENT — 15 CLUBS FONDATEURS_`, `LE MÉCANISME_`,
`L'OFFRE_`, `LA PREUVE_`, `APRÈS LES TROIS MOIS_`. Cinq sections, cinq kickers.

Sur la home la cadence est plus riche : chiffres romains, kickers nommés, citations
pleine page. La landing n'a hérité que du kicker, ce qui la rend plus mécanique que
le reste du site — sur la page qui doit convaincre le plus.

---

## P3 — Détails

- **`/creer` : lignes à 78 caractères**, unique valeur mesurée, sans `max-w-prose`.
  Frôle la limite haute.
- **`/combat` : 12 textes à 9 px** (`COMBO × 1`, `EXCEL`, `CRÉER MON CLUB`). Le parti
  pris rétro-arcade justifie le pixel serré, mais le CTA à 9 px reste un CTA.
- **Répétition du mot « tableur » sur la home** : « sans rouvrir un tableur », puis
  deux lignes plus bas « moins de soirées devant le tableur ».
- **Le contour de focus est en `#279B65`**, mesuré à 3,06:1 sur blanc. Il passe le
  seuil de 3:1 des éléments non textuels, mais de justesse. `brand-dark` serait plus
  sûr.

---

## Ce qui est bien fait, et qu'il faut garder

- **`border-radius: 0` tenu sur les huit pages**, zéro exception relevée. C'est rare
  et c'est ce qui fait la signature.
- **Un seul `<h1>` par page**, hiérarchie de titres sans saut de niveau.
- **Aucune image sans attribut `alt`** sur l'ensemble du site.
- **Aucun débordement horizontal** à 390 px, sur aucune des huit pages.
- **`:focus-visible` implémenté**, avec neutralisation correcte du focus à la souris.
- **`prefers-reduced-motion` respecté** — 7 déclarations dans `globals.css`.
- **Aucune couleur en dur relevée** hors tokens sur les pages marketing.
- **Le cas client assume ce qu'il ne sait pas encore**, et le dit. C'est le contraire
  du réflexe marketing, et c'est ce qui le rend crédible.

---

## Ce que je ferais, dans l'ordre

1. **Trancher « club » ou « association »** — c'est un arbitrage, pas un correctif, et
   tout le reste du message en dépend.
2. **Un seul CTA sur la home** pendant la campagne, vers l'offre fondateur.
3. **Plancher typographique à 10 px** et `text-ink-soft` sur les libellés de
   reconstruction.
4. **Lien d'évitement** — dix lignes, seul manquement de niveau A.
5. **`py-3` sur les liens secondaires**, et les CTA de la vitrine à 44 px.
6. **Titres et descriptions recalibrés** sur la home, `/tarifs` et `/fonctionnalites`.

Les points 3 à 6 sont mécaniques et sans risque. Les points 1 et 2 touchent la
marque et la stratégie de campagne : ils ne devraient pas être décidés par un audit.

---

*Mesures relevées le 29 juillet 2026 sur klubster.fr en production, aux largeurs
1280 px et 390 px. Contrastes calculés selon WCAG 2.x, en excluant le texte
en surimpression sur photographie — non mesurable de façon fiable par calcul, à
vérifier à l'œil.*
