# Backlog de finalisation — Klubster

Établi le 01/08/2026 sur `main` à `42ff19d`. **Audit partiel** : voir « Périmètre
réellement couvert » en fin de document. Un backlog qui laisserait croire à une
couverture complète serait pire qu'un backlog court.

Qualification : **[V]** vérifié par test ou commande · **[O]** observé · **[D]** déduit
du code · **[H]** hypothèse · **[N]** cause non déterminée.

---

## P0 — bloquant avant les premiers clients payants

### KLB-P0-001 · Le contrôle peut afficher le cours d'une adhésion et le règlement d'une autre

| | |
|---|---|
| **Gravité** | P0 |
| **Domaine** | exactitude métier |
| **Fichier** | `supabase/migrations/0013_reference_rpc_et_storage.sql`, fonction `verifier_adherent` |
| **Constat** | La RPC pose **deux sous-requêtes indépendantes** — l'une pour `cours`, l'autre pour `regle` — chacune avec `order by ad.created_at desc limit 1`. `created_at` est une **date**, pas un instant : deux adhésions du même jour sont ex æquo, et l'ordre n'est pas total. Rien n'oblige Postgres à départager les deux sous-requêtes de la même façon. **[D]** |
| **Preuve** | Lecture de `0013`, lignes 493-505. `docs/defauts-a-corriger.md` ne décrivait que l'absence d'ordre total ; l'indépendance des deux sous-requêtes n'y figurait pas. **[O]** |
| **Risque** | Au bord du tapis, l'écran annonce « Yoga Nidra · à jour » à quelqu'un qui a payé le Hatha et pas le Nidra. Un encadrant laisse entrer une personne non à jour, ou refuse une personne à jour. Le cas survient dès qu'un club saisit un renouvellement le jour de l'inscription. |
| **Correction** | Migration `0028` : une seule adhésion de référence, choisie par `LEFT JOIN LATERAL`, avec une règle métier explicite en quatre critères — saison courante, statut actif, plus récente, puis identifiant pour l'ordre total. `cours` et `regle` en sortent tous deux. |
| **Test attendu** | 15 tests dans `tests/adhesion-reference.test.ts` : ex æquo stable, saisons différentes, adhésion annulée/remboursée/en attente de place, renouvellement non payé, cohérence cours/règlement, 100 appels sur ordre aléatoire, comparaison du `order by` SQL à la règle TypeScript, migration additive, droits non rouverts. |
| **Branche/PR** | `fix/rpc-adhesion-deterministe` |
| **Statut** | **corrigé — 15 tests verts, suite complète 264 tests verte [V]** |

---

## P1 — important avant lancement commercial

### KLB-P1-001 · La couleur du club sert de couleur de texte sans garantie de contraste

| | |
|---|---|
| **Gravité** | P1 (P0 si un club choisit une couleur claire) |
| **Domaine** | accessibilité |
| **Fichier** | `src/app/[asso]/cockpit/scanner/Scanner.tsx`, et partout où `organisations.couleur_primaire` est posée en `color` ou `background` |
| **Constat** | La couleur est choisie par le club, sans contrainte. Un vert sauge `#6B7F5E` mesure ~3,6:1 sur le papier — sous le 4,5:1 exigé en AA pour du texte de 13 px, et sous le seuil pour du blanc posé dessus. **[D]** |
| **Preuve** | `docs/defauts-a-corriger.md` n°2. Contraste calculé dans `tests/demo-accessibilite.test.tsx` (branche démo) : la brute échoue, l'assombrie passe. **[V]** |
| **Risque** | Statuts illisibles pour une partie des utilisateurs. Ce n'est pas un cas d'école : c'est le vert que choisit une association de yoga ou de randonnée. |
| **Correction** | Un module `src/lib/couleur-tenant.ts` : contraste calculé, assombrissement à la volée jusqu'au seuil, choix automatique de texte clair ou sombre, valeur invalide ou absente traitée. Appliqué à **tous** les écrans, pas au seul scanner. |
| **Test attendu** | Couleurs très claire, très sombre, jaune, rouge, bleu, vert sauge, noir, blanc, valeur invalide, valeur absente. Contraste réellement calculé. |
| **Branche/PR** | `fix/couleurs-tenant-accessibles` |
| **Statut** | **à faire** |

### KLB-P1-002 · Une liste d'attente peut rester ouverte alors que le cours a des places

| | |
|---|---|
| **Gravité** | P1 |
| **Domaine** | exactitude métier |
| **Fichier** | `src/lib/complets.ts`, `src/app/[asso]/cockpit/cours/page.tsx` |
| **Constat** | `coursComplets` déclare un cours complet quand ses adhésions actives atteignent `places_max`. Rien n'empêche une adhésion `liste_attente` d'exister sur un cours qui a de la place : une jauge relevée après coup laisse les personnes en attente là où elles sont, sans signal. **[D]** |
| **Preuve** | `docs/defauts-a-corriger.md` n°3, relevé en construisant l'aperçu d'inscription de la démo. **[O]** |
| **Risque** | L'écran affiche « 5/16 inscrits · 3 en liste d'attente » — exact, et incompréhensible. Des personnes attendent une place qui existe. |
| **Correction** | Détecter et **alerter**, sans promotion automatique : donner une place envoie un email, et un email déclenché par un réglage surprend. Afficher les places libres, les personnes en attente, et l'action manuelle existante en disant ce qu'elle déclenche. Protéger contre deux promotions concurrentes. |
| **Test attendu** | Jauge augmentée, désinscription libérant une place, plusieurs personnes en attente, promotion simultanée, cours archivé, saison différente, action répétée, jauge redevenue pleine. |
| **Branche/PR** | `fix/liste-attente-places-disponibles` |
| **Statut** | **à faire** |

### KLB-P1-003 · Quatre PR sont ouvertes alors que leur code est déjà dans `main`

| | |
|---|---|
| **Gravité** | P1 (hygiène de dépôt, risque de retravail) |
| **Domaine** | processus |
| **Constat** | Les PR **#5, #6, #7, #8** apparaissent ouvertes, alors que leurs commits sont dans `main` : `7b1a851 (#5)`, `fb131d8 (#6)`, `c0b476b (#7)`, `42ff19d (#8)`. **[V]** — liste GitHub et `git log origin/main`. |
| **Cause** | **[N] non déterminée.** Compatible avec un merge local poussé directement sur `main` sans fermeture des PR, mais ce n'est pas établi. |
| **Risque** | Quelqu'un — ou un agent — reprend une PR déjà appliquée, réimplémente une correction existante, ou crée un conflit. |
| **Correction** | Décision de Mathieu : fermer les quatre PR, ou les fusionner formellement si leur contenu diffère de `main`. |
| **Branche/PR** | aucune — action GitHub |
| **Statut** | **décision attendue** |

---

## P2 — optimisation après sécurisation

### KLB-P2-001 · 503 intermittents sur les préchargements RSC des fiches adhérent

| | |
|---|---|
| **Domaine** | performance / robustesse |
| **Constat** | Six préchargements RSC simultanés de `/demo/adherents/[id]`, déclenchés par le navigateur à l'affichage de la liste, répondent **503**. Les mêmes URL répondent 200 à la demande, en série comme en parallèle (`curl`). Aucune erreur au journal du serveur. Navigation jamais affectée. **[O]** |
| **Cause** | **[N] non déterminée.** Compatible avec un délestage de préchargement propre à Next, mais ce n'est pas établi et ne doit pas être classé bénin. |
| **Protocole de surveillance** | Reproduire sur le build de production *et* sur Vercel ; compter les préchargements ; relever les journaux Vercel ; tester `prefetch={false}` sur la liste ; mesurer l'impact réel — une navigation a-t-elle jamais échoué ? |
| **Statut** | **à instruire** |

### KLB-P2-002 · Aucun environnement de test isolé pour la base

| | |
|---|---|
| **Domaine** | testabilité |
| **Constat** | La suite tourne sur `src/lib` uniquement. Aucun harnais Postgres : les RLS, les RPC, les triggers et les webhooks ne sont exercés par **aucun** test. **[V]** — `vitest.config.ts` et l'absence de service Postgres dans `.github/workflows/ci.yml`. |
| **Risque** | C'est ce qui rend impossible d'auditer sérieusement le cloisonnement entre clubs, les paiements et l'onboarding. Toute affirmation de sécurité multi-tenant reposerait aujourd'hui sur de la lecture de code, pas sur une preuve. |
| **Correction** | Un Postgres jetable (Supabase local ou conteneur) rejouant `supabase/migrations/*` dans l'ordre, plus des tests de rôle. |
| **Statut** | **prérequis à tout audit sécurité — à ouvrir en premier** |

---

## Périmètre réellement couvert par cet audit

**Lu et vérifié :**

- état de `main`, branches distantes, PR ouvertes, CI ; **[V]**
- `docs/defauts-a-corriger.md` et ses trois défauts ; **[V]**
- la RPC `verifier_adherent` et son appelant `scanner/actions.ts` ; **[V]**
- `src/lib/complets.ts`, `src/lib/saison.ts`, le `check` des statuts d'adhésion. **[V]**

**Non couvert — à ne pas croire audité :**

| Domaine | État |
|---|---|
| RLS multi-tenant, isolation entre clubs | **non audité** |
| Storage, URLs signées, documents de santé | **non audité** |
| Stripe, Stripe Connect, idempotence des webhooks | **non audité** |
| Calculs financiers, arrondis, remboursements | **non audité** |
| Onboarding d'un club vide | **non audité** |
| Import CSV | **non audité** |
| Contrôle terrain sur mobile réel | **non audité** |
| Messages et délivrabilité | **non audité** |
| Site public d'un club | **non audité** |
| Accessibilité du cockpit réel | **non audité** |
| Performance, Core Web Vitals | **non audité** |
| Observabilité, journalisation | **non audité** |
| Home, tarifs, conversion | **non audité** |
| Parcours E2E | **non audité** |

Aucun club fictif complet n'a été créé : cela demande un environnement Supabase isolé,
qui n'existe pas dans le dépôt (**KLB-P2-002**). Le créer est le prérequis de tout audit
sérieux des RLS, des paiements et de l'onboarding.
