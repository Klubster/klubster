# Lot S — rapport d'étape : fondations d'interface

Session du 5 août 2026. Branche `feat/lot-s-fondations-interface`, base `5cf82de`
(`release/klubster-commercial-v1-demo`, dont `d3a28f9` et `e14f290` sont ancêtres — vérifié
par `merge-base --is-ancestor`).

## État Git

| Élément | Valeur |
| --- | --- |
| Branche de départ | `release/klubster-commercial-v1-demo` |
| Commit de départ | `5cf82de` |
| Branche Lot S | `feat/lot-s-fondations-interface` |
| Commits | S-A design system · S-B états partagés · S-C cockpit+espace · S-D sentinelles · S-E admin/connexion/vitrine |

## Baseline confirmée sur 5cf82de (avant toute modification)

1050 tests / 46 fichiers ✔ · `next build` ✔ · `tsc --noEmit` ✔ · eslint 0 erreur
(12 warnings préexistants) · 39 migrations · `/demo` présent.

## Ce qui a été livré

**S-A — design system.** Tokens de statut corrigés pour AA (`warning` `#B8860B`→`#8A6508`,
`success` `#279B65`→`#1E7A4F`, `danger.soft` ajouté) ; `Button` réécrit sur le motif réel du
produit (mono 12px, encre, min-h 44px, variant destructif — l'ancienne version à ombre ne
correspondait à rien de ce que le produit affiche) ; `Card` sans ombre ; `StatutBadge` étendu
(adhésions + pièces + variant libre). Inventaire complet : `docs/lot-s-inventaire-interface.md`.

**S-B — états partagés.** 8 frontières `loading.tsx`/`error.tsx` (cockpit, espace,
inscription, admin), chacune aux couleurs de la maison, journalisant l'erreur et proposant
Réessayer + un retour. `EtatVide`, `Squelette`, `ErreurEcran` posés pour les migrations.

**S-C — migration cockpit + espace.** 65 occurrences d'hex de statut inline supprimées
(47 mécaniques + 18 manuelles : ternaires, LignePriorite, Point, bandeau Stripe test).
Défaut réel corrigé au passage : le Scanner posait du blanc en dur sur la couleur du club —
illisible pour un club à couleur claire — il passe par `texteSur()` (garantie ≥ 4,5:1).

**S-D — sentinelles.** 15 tests : plus d'hex inline dans les zones migrées (3 exceptions
documentées : aperçus de thème et rendus Satori), frontières présentes et conformes, tokens
AA verrouillés, composants sans ombre.

**S-E — extension.** Même migration sur la vitrine `[asso]`, l'inscription, l'admin et la
connexion. Découverte au passage d'un QUATRIÈME ocre (`#8A6A2F`) — ajouté à la liste interdite.

## Preuves (captures-lot-S/ à la racine du dépôt principal)

- 10 routes × 3 largeurs (390/768/1280) sur klubster-dev, fixtures `@example.com`,
  parcours président réel (connexion comprise) : **0 débordement horizontal mesuré**.
- Clavier : focus visible (outline solid) après tabulations sur le cockpit.
- `/demo` : **aucun hôte contacté hors localhost** pendant la navigation (mesuré au réseau).
- Cockpit mobile 390 : hiérarchie À TRAITER / À SURVEILLER intacte, tokens rendus.

## Limites honnêtes

- Pas d'appareil physique (iPhone/Android) : émulation viewport uniquement.
- `error.tsx` vérifié par sentinelles, pas déclenché en navigateur.
- Charge machine anormale pendant la session (load > 500, indépendante du projet) :
  des timeouts de tests sont possibles localement ; ils disparaissent avec
  `--maxWorkers=2` et n'existent pas en CI.

## Reste du Lot S (prochains sous-lots)

Démo et marketing encore sur hex inline (visuellement identiques aux tokens — même valeurs) ;
adoption de `Button`/`EtatVide`/`StatutBadge` dans les 42 fichiers à boutons manuels ;
espace adhérent à traiter comme un produit (S7) ; accessibilité complète (S13), responsive
9 largeurs (S14), PWA (S15), microcopy (S17). L'inventaire et les sentinelles cadrent tout.
