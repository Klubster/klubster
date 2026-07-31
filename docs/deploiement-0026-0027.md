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

### Temps 1 — EXPAND : créer la RPC, sans rien retirer

**Ne jouer que la seconde moitié de `0027`** : la fonction `adhesions_finance` et ses `grant`/`revoke execute`. **Pas** le `revoke select` ni les `grant select` par colonne.

À ce stade :

- la RPC existe et fonctionne ;
- les colonnes restent lisibles en direct ;
- **le code en production continue de marcher sans modification.**

Rien n'est protégé encore, et rien n'est cassé. C'est le point d'appui.

### Temps 2 — le code

Fusionner la PR #6, laisser Vercel déployer, puis **vérifier sur le site réel** avant d'aller plus loin :

- ouvrir une fiche d'adhérent → les blocs financiers s'affichent ;
- ouvrir `/cockpit/paiements` → la liste et les litiges s'affichent ;
- ouvrir `/cockpit/paiements/relances` → les mentions « relancé il y a N j » s'affichent.

Si l'un des trois est vide ou en erreur, **s'arrêter là** : la RPC ne rend pas ce qu'on croit, et il est encore temps de corriger sans que rien ne soit fermé.

### Temps 3 — CONTRACT : fermer

Jouer, dans cet ordre :

1. **`0026` en entier** — la politique de lecture de `reglements` ;
2. **la première moitié de `0027`** — `revoke select on adhesions from authenticated`, puis les `grant select (…)` par colonne.

C'est le seul moment irréversible du point de vue d'un rôle non financier. Il est aussi le plus court : deux instructions.

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

Puis rouvrir les trois écrans du temps 2. Ils doivent afficher **exactement la même chose qu'avant** : c'est la preuve que la RPC a bien pris le relais.

---

## Retour en arrière

**Depuis le temps 1 ou 2 :** rien à défaire. Créer une fonction ne casse rien, et le code d'avant n'en dépend pas.

**Depuis le temps 3 :** une seule instruction rétablit l'état antérieur.

```sql
grant select on public.adhesions to authenticated;
drop policy if exists reglements_read_role on public.reglements;
create policy reglements_read_org on public.reglements
  for select to authenticated
  using (organisation_id = current_org_id() or is_super_admin());
```

À n'utiliser que si un écran tombe **pour un président** — c'est-à-dire si la RPC ne couvre pas un cas qu'on n'avait pas vu. Un écran vide pour un encadrant n'est pas une panne : c'est l'objet du lot.

---

## Ce que cette séquence ne couvre pas

Elle protège du décalage entre schéma et code. Elle ne remplace pas ce qui manque encore : **un test qui joue de vraies requêtes avec une session par rôle**. Les tests actuels sont statiques — ils lisent le texte des migrations et vérifient qu'il dit la même chose que la matrice TypeScript. Ils prouvent que la politique est correctement écrite, pas qu'un vrai encadrant se fait refuser par un vrai PostgREST.

Le temps 2 y supplée à la main, sur trois écrans. C'est mieux que rien et moins bien qu'une base de test en CI.
