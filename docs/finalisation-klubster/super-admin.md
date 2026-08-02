# Attribution du super-administrateur

## La règle

**Aucun compte ne reçoit le rôle `super_admin` par une migration.** L'attribution est une
opération d'environnement, faite à la main, dans l'environnement concerné, après création
du compte.

Une base reconstruite depuis le dépôt n'a donc **aucun super-administrateur** — et c'est
l'état sain. Un rôle qui donne accès à tous les clubs, à toutes les données de santé et à
tous les règlements ne doit jamais s'attribuer tout seul parce qu'on a rejoué un fichier.

## Pourquoi ce n'est plus dans une migration

L'historique réel contenait, dans `20260709083407` :

```sql
update public.profiles set role = 'super_admin' where email = '<adresse personnelle>';
```

Deux problèmes, de nature différente.

**Confidentialité.** Le dépôt est public. Une adresse personnelle qui y entre est publiée
définitivement : elle reste dans l'historique Git même effacée par un commit ultérieur, et
elle est moissonnée. La migration restituée porte donc un marqueur à la place, sous
dérogation déclarée au manifeste — la seule du projet.

**Sécurité.** Une identité personnelle inscrite dans une migration versionnée est un
droit d'accès distribué avec le code. Toute copie du dépôt, tout environnement de
préproduction, toute base reconstruite le rejouerait. Le marqueur
`__KLUBSTER_SUPER_ADMIN_EMAIL__` ne contient pas d'`@` ; `profiles.email` étant alimentée
depuis `auth.users.email` que GoTrue valide comme une adresse, **aucune ligne ne peut
porter cette valeur**. L'`update` s'exécute sans promouvoir personne. C'est une inertie
structurelle, pas une convention à respecter.

## La procédure

1. Créer le compte normalement, par le parcours d'inscription de l'application.
2. Se connecter à l'environnement concerné — éditeur SQL Supabase, ou `psql` sur la base
   visée. Vérifier l'environnement **avant** de taper la commande : c'est le seul geste de
   ce document qui donne des droits, et il n'a pas de retour arrière automatique.
3. Attribuer le rôle en nommant le compte à cet instant, sans jamais écrire l'adresse
   dans un fichier :

   ```sql
   update public.profiles
      set role = 'super_admin'
    where id = '<uuid du compte>';
   ```

   Préférer l'identifiant à l'adresse : il ne se devine pas, et il ne dit rien sur la
   personne si la commande traîne dans un historique de terminal.

4. Vérifier, puis fermer :

   ```sql
   select id, role from public.profiles where role = 'super_admin';
   ```

   Une seule ligne attendue. Deux, c'est un incident.

**Aucun script ne doit contenir l'adresse.** Ni ici, ni dans `scripts/`, ni dans un
`.env.example`, ni dans un message de commit. `tests/donnees-personnelles.test.ts` refuse
toute adresse non explicitement autorisée dans `supabase/migrations/`, `docs/`, `scripts/`
et `tests/` — et il ne contient pas lui-même celle qu'il protège : il fonctionne par liste
blanche, donc une adresse inconnue est refusée par défaut, y compris une qui n'existe pas
encore.

## Ce qui reste à faire

L'activation de la double authentification sur ce compte est ouverte depuis les premiers
audits. Un rôle qui voit toutes les associations et toutes les données de santé mérite
mieux qu'un mot de passe seul.
