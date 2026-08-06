# Reprise — après la certification commerciale, avant le Lot S

Écrit le 4 août 2026, fin de session. Ce document sert à ouvrir la prochaine discussion sans
relire l'historique. Il dit **où en est le produit**, **ce qui attend une décision de Mathieu**,
et **par quoi commencer**.

---

## 1. L'état en trois phrases

La branche `release/klubster-commercial-v1-demo` (`d3a28f9`) contient tout ce qui a été certifié
depuis le début : lots J, K, L, O, P, Q, la vérité commerciale et la démo publique alignée sur le
produit. Elle est verte de bout en bout — 1050 tests, 46 fichiers, build, typecheck, lint.

**Rien n'est fusionné, rien n'est déployé.** `main` (`42ff19d`) est toujours ce qui tourne en
production, avec l'import qui ne crée pas les pièces, l'export vulnérable à l'injection de formule
et les trois mois offerts qui n'arrivent jamais.

Le Lot S (design, UX, ergonomie, PWA) est ouvert : seule l'étape S1 — l'inventaire — est faite.

---

## 2. Ce qui attend une décision de Mathieu

| Décision | Pourquoi elle bloque |
| --- | --- |
| **Autoriser la fusion de la release** | Aucune des corrections n'existe en production tant que ce n'est pas fait |
| **Appliquer les migrations** | Douze migrations, ordre alphabétique des noms |
| **Choisir le club pilote** | Le feu vert commercial l'exige explicitement |
| **Ordre du Lot S** | Proposition ci-dessous, à confirmer ou changer |

---

## 3. Branches et PR

Tout est en **brouillon**, empilé dans cet ordre de dépendance :

```
main 42ff19d
 └─ release/klubster-commercial-v1        (12 branches de lots intégrées)
     └─ release/klubster-commercial-v1-demo  d3a28f9  ← LA branche à fusionner
         └─ fix/demo-alignement-cockpit    e14f290  (déjà dedans)
```

PR ouvertes en brouillon : #9 (démo), #10 à #24 (lots précédents), **#25** import, **#26** export,
**#27** abonnement fondateurs, **#28** vérité hébergement.

Migrations livrées, dans leur ordre d'application :

```
0028_verifier_adherent_adhesion_de_reference
20260802120000_roles_attribuables          20260802200000_equipe_ajouter_deja_membre
20260803160000_liste_attente               20260803180000_controle_terrain
20260803230000_paiements_coherence         20260804090000_pieces_mineurs
20260804100000_storage_pieces_par_role     20260804120000_changer_cours
20260804150000_opposition_communications   20260804170000_import_adherents
20260804190000_clubs_fondateurs
```

Toutes rejouées deux fois sur `klubster-dev`. ⚠️ `20260804100000` touche `storage.objects` :
elle demande les droits propriétaire (appliquée via le MCP Supabase sur dev).

---

## 4. Ce qui a été corrigé, en une ligne chacun

- **Import** — ne créait aucune pièce (dossiers éternellement complets, relances mortes), ignorait
  la capacité des cours, perdait dates de naissance, responsables légaux et montants encaissés.
  En prime : un encadrant et un trésorier créaient des adhérents via la RPC en direct.
- **Export** — injection de formule CSV (`=cmd|…` exécuté à l'ouverture dans Excel), et
  « export complet » qui sortait dix colonnes sur les vingt-et-une nécessaires.
- **Abonnement** — « trois mois offerts » annoncés, trente jours appliqués ; les quinze places
  n'existaient que dans les textes.
- **Vérité commerciale** — la home affirmait « hébergées dans l'UE » quand ses propres pages
  légales listent trois prestataires américains.
- **Fusion** — quatre défauts qu'aucune PR isolée ne montrait, dont une accolade perdue qui cassait
  le build sans qu'aucun test ne bronche.
- **Démo** — montrait le cockpit d'avant la hiérarchisation ; raccordée à `calculerPriorites`,
  sept tests réécrits sur le comportement, trois sentinelles ajoutées.

---

## 5. Lot S — ce qui est fait, ce qui reste

**S1 (inventaire) : fait.** 63 écrans recensés. Trois constats qui commandent la suite :

1. **Le design system existe mais n'est branché nulle part.** `src/components/ui/` contient
   `Button`, `Card`, `StatutBadge`, `Layout` — **zéro import**. En face : 26 écrans réécrivent leur
   bouton primaire à la main, 42 codent les couleurs de statut en dur. C'est la cause mécanique des
   divergences visuelles, et la raison pour laquelle la démo a pu dériver sans alerte.
2. **Aucun état de chargement ni frontière d'erreur.** Pas un `loading.tsx`, pas un `error.tsx`
   dans les 63 écrans. Pendant une navigation serveur, l'utilisateur reste sur l'écran précédent
   sans signal ; une erreur serveur affiche l'écran générique de Next, hors marque.
3. **19 écrans de cockpit contre 2 pour l'espace adhérent.** Les adhérents et les parents — la
   majorité des utilisateurs — ont deux écrans.

**Ordre proposé pour la suite** (traite les causes avant les symptômes) :

1. **S8 — design system** : brancher `ui/` sur les 26 + 42 endroits. Tout le reste en découle.
2. **S4 + S7** — cockpit et espace adhérent, là où un bénévole passe son temps.
3. **S13 + S14** — accessibilité et responsive (neuf largeurs).
4. **S15** — PWA installée : demande les appareils de Mathieu.

Noté au passage : la barre noire de démonstration est trop dominante, surtout sur mobile.
Pas un blocage de release.

---

## 6. Environnement de travail — pièges à connaître

- **`NODE_ENV=production` traîne dans le terminal de Mathieu.** Conséquences : `npm ci` omet les
  devDependencies (vitest absent), et 38 tests d'interface tombent sans que le code soit en cause.
  Toujours préfixer : `NODE_ENV=test npm test`, `NODE_ENV=development npm ci`.
- **`next dev` a perdu l'hydratation** sur cette machine (websocket HMR refusé). Pour toute preuve
  navigateur : `next build && next start`.
- **`node_modules` en lien symbolique casse Turbopack** — toujours copier.
- **`psql -tAc` avec plusieurs ordres = une seule transaction**, donc `now()` figé : un test de bail
  expiré y donne un faux négatif. Lancer les ordres séparément.
- **Données de production interdites.** Toute vérification passe par `klubster-dev`
  (`xumkklyinikmvfafyjxd`). Le projet de prod est `basnfuvdjobanejahayt` : ne jamais le cibler.
- Fixtures de test : `@example.org` / `@dev.example.org`, purgées après mesure.

---

## 7. Pour ouvrir la prochaine discussion

Trois entrées possibles, selon ce que Mathieu veut faire :

**a. Déployer** — « Fusionne la release et applique les migrations » : la branche est prête, il
manque l'autorisation et la sauvegarde préalable.

**b. Continuer le Lot S** — « Commence par S8 » : brancher le design system, avec captures avant
et après, sur une branche dédiée.

**c. Autre chose** — le graphe graphify est à jour (`raw/certification-commerciale-lots-o-p-q-r-8971d5d2.md`),
il répond aux questions sur ce qui a déjà été décidé ou écarté.
