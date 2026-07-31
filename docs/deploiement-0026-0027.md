# Déploiement des migrations 0026 et 0027 — séquence expand/contract

**Pourquoi ce document existe.** Les deux migrations *retirent* des droits. Appliquées avant le code qui s'y adapte, elles cassent la production ; appliquées après, le code appelle une RPC qui n'existe pas encore. Aucun des deux ordres naïfs ne marche.

La parade est classique : **on ouvre d'abord, on ferme en dernier** (*expand/contract*). Entre les deux, le schéma et le code sont tous les deux valides, et l'on peut s'arrêter à n'importe quelle étape sans rien casser.

---

## Ce qui se casserait dans l'ordre naïf

| Ordre | Ce qui arrive |
|---|---|
| **SQL d'abord, code ensuite** | Le code encore en ligne fait `select … litige_le …` sur `adhesions`. Le droit vient d'être retiré : **PostgREST répond 42501**, la fiche adhérent, la page paiements et les relances tombent en erreur — pour le président comme pour tout le monde |
| **Code d'abord, SQL ensuite** | Le nouveau code appelle `adhesions_finance`, qui n'existe pas : **PostgREST répond 404**, mêmes écrans en panne |

Fenêtre concernée : le temps du déploiement Vercel, quelques minutes. C'est peu, et c'est un mardi soir de rentrée où trois présidents encaissent des chèques.

---

## La séquence, en trois temps

### Temps 1 — EXPAND : créer la RPC, **hors du mécanisme de migration**

Exécuter à la main, en SQL direct, **uniquement** :

- le `create or replace function public.adhesions_finance(…)` ;
- ses `revoke execute … from anon, public` et `grant execute … to authenticated`.

Aucun droit de colonne n'est retiré. Aucune migration n'est enregistrée.

> **Pourquoi à la main, et pas « la seconde moitié de 0027 »**
> Parce qu'appliquer une demi-migration par le mécanisme habituel enregistrerait `0027` comme jouée alors qu'elle ne l'est qu'à moitié. La base et le registre divergeraient, et le prochain qui reconstruit le schéma depuis le dépôt — ou qui rejoue les migrations manquantes — obtiendrait un état différent de la production. C'est exactement ce que la règle « la base doit rester reconstructible depuis le repo » interdit.
> Ici, on assume une exécution manuelle **transitoire**, que le temps 3 rendra officielle.

À ce stade : la RPC existe, les colonnes restent lisibles en direct, **et le code en production continue de marcher sans modification.** Rien n'est protégé, rien n'est cassé. C'est le point d'appui.

### Temps 2 — le code

Fusionner la PR #6, laisser Vercel déployer, puis **vérifier sur le site réel** avant d'aller plus loin :

- une **fiche d'adhérent ayant des règlements** → « Réglé / Reste », historique des règlements ;
- **`/cockpit/paiements`** → la liste, et le bandeau des litiges s'il y en a ;
- **`/cockpit/paiements/relances`** → les mentions « relancé il y a N j » ;
- **un bouton « Rembourser ce paiement en ligne »** sur une adhésion payée par carte — c'est le seul chemin qui lit `stripe_payment_intent`, et le seul que les trois autres écrans ne couvrent pas.

Si l'un des quatre est vide ou en erreur, **s'arrêter là** : la RPC ne rend pas ce qu'on croit, et rien n'est encore fermé.

### Temps 3 — CONTRACT : appliquer les deux migrations **en entier**

Par le mécanisme habituel, dans cet ordre :

1. **`0026` en entier** ;
2. **`0027` en entier**.

Le `create or replace function` de `0027` rejoue la RPC déjà créée au temps 1 : c'est sans effet, et c'est justement pourquoi la manœuvre tient. Ce sont les `revoke select` / `grant select (…)` par colonne qui font le travail de fermeture.

À la fin, la base et le registre disent la même chose. C'est le seul moment irréversible du point de vue d'un rôle non financier.

---

## Vérification, après le temps 3

```sql
-- 1. Les trois colonnes sensibles ne sont plus lisibles en direct.
select a.attname, has_column_privilege('authenticated','public.adhesions', a.attname, 'SELECT')
  from pg_attribute a
 where a.attrelid = 'public.adhesions'::regclass and a.attnum > 0 and not a.attisdropped
 order by a.attnum;
-- attendu : false pour litige_le, stripe_payment_intent, derniere_relance ; true ailleurs

-- 2. La politique de reglements nomme bien les deux rôles.
select policyname, cmd from pg_policies where tablename = 'reglements';
-- attendu : reglements_read_role (SELECT) + reglements_write_role (ALL)

-- 3. Les RPC restent fermées aux rôles clients.
select p.proname,
       has_function_privilege('anon', p.oid, 'execute') as anon,
       has_function_privilege('authenticated', p.oid, 'execute') as authent
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public' and p.proname = 'adhesions_finance';
-- attendu : anon = false, authent = true (c'est la fonction qui filtre par rôle)
```

### Puis, rôle par rôle

Le contrôle qui compte n'est pas SQL : c'est de se connecter et de regarder. Six comptes, six attentes.

| Rôle | Ce qu'il doit voir | Ce qu'il ne doit plus voir |
|---|---|---|
| **Président** | tout : règlements, litiges, relances, remboursement, abonnement Klubster | — |
| **Trésorier** | la trésorerie du club, les remises, les virements | **l'abonnement Klubster** : prix, état, résiliation, code promo |
| **Secrétaire** | statut, tarif, mode de paiement, dossiers, pièces, santé | règlements, « Réglé / Reste », litiges, dernière relance, remise, virements |
| **Encadrant** | sa liste, le contrôle au scan | tout ce qui précède, **y compris par URL directe** sur `/paiements/remise` et `/virements` |
| **Lecture seule** | la consultation | idem encadrant |
| **Super-admin** | la RPC doit rendre des lignes sur une organisation choisie | — |

Les tests d'aujourd'hui sont statiques : cette passe à la main est, pour l'instant, la **seule** vérification qui prouve quoi que ce soit sur le comportement réel.

### Le seul parcours non exercé

> **L'affichage du remboursement Stripe n'a pas pu être testé visuellement en production, aucune adhésion ne possédant actuellement de `stripe_payment_intent`.** La RPC et son filtrage par rôle et par organisation ont été testés directement.

Mesuré le 31/07/2026, sur toute la base : `stripe_payment_intent` non nul = **0 ligne**, `litige_le` non nul = **0 ligne**, `derniere_relance` non nul = **0 ligne**. Personne n'a encore payé par carte, aucun paiement n'a été contesté, aucune relance n'a été horodatée.

On n'a délibérément **pas** fabriqué de fausse référence Stripe pour se rassurer : elle n'aurait prouvé que l'affichage conditionnel d'un bouton, et aurait laissé dans une base réelle une référence invalide qu'un clic malheureux aurait tenté de rembourser.

À la place, `tests/remboursement-fusion.test.ts` exerce la logique sur une adhésion fictive portant un `stripe_payment_intent` — c'est-à-dire précisément ce que la migration pouvait casser : la fusion entre les colonnes de dossier, lues sur la table, et les colonnes financières, lues par la RPC.

Comptes dédiés (`+audit`, `+tresorier`, `+secretaire`…), sur un club de test, supprimés ensuite. **Jamais sur les données d'une association réelle.**

---

## Retour en arrière

**Depuis le temps 1 ou 2 :** rien à défaire. Créer une fonction ne casse rien, et le code d'avant n'en dépend pas.

**Depuis le temps 3 :** quatre instructions rétablissent l'état antérieur — le droit de lecture sur la table, puis l'ancienne politique de `reglements`.

```sql
grant select on public.adhesions to authenticated;

drop policy if exists reglements_read_role on public.reglements;
create policy reglements_read_org on public.reglements
  for select to authenticated
  using (organisation_id = current_org_id() or is_super_admin());
```

⚠️ Ce retour arrière **laisse le registre des migrations en avance sur la base** : `0026` et `0027` y figurent comme jouées alors que leurs effets sont défaits. Il faut donc, dans la foulée, écrire une migration `0028` qui acte le retour — sinon la reconstruction depuis le dépôt ne donnera plus la production.

À n'utiliser que si un écran tombe **pour un président** — c'est-à-dire si la RPC ne couvre pas un cas qu'on n'avait pas vu. Un écran vide pour un encadrant n'est pas une panne : c'est l'objet du lot.

---

## Ce que cette séquence ne couvre pas

Elle protège du décalage entre schéma et code. Elle ne remplace pas ce qui manque encore : **un test qui joue de vraies requêtes avec une session par rôle**. Les tests actuels sont statiques — ils lisent le texte des migrations et vérifient qu'il dit la même chose que la matrice TypeScript. Ils prouvent que la politique est correctement écrite, pas qu'un vrai encadrant se fait refuser par un vrai PostgREST.

Le temps 2 y supplée à la main, sur trois écrans. C'est mieux que rien et moins bien qu'une base de test en CI.
