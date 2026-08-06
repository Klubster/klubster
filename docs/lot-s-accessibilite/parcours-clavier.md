# Parcours clavier — séquences mesurées (6 août 2026)

Chaque ligne est un arrêt de tabulation réel (touche Tab pressée par Puppeteer,
`document.activeElement` lu, visibilité du focus calculée). Séquences complètes
dans `captures/*.json`. Résumé :

## Connexion (8 tabs)
logo → onglet SE CONNECTER → onglet CRÉER UN COMPTE → email → mot de passe →
« Mot de passe oublié ? » (button) → « Créez un compte. » (button) → fin.
Ordre logique, tous nommés, focus visible partout. Les bascules de mode sont de
vrais `<button>` (changement d'état client, pas de navigation) — sémantique correcte.

## Inscription publique (29 arrêts audités)
En-tête → champs identité dans l'ordre visuel → sélection de cours → pièces →
consentements → soumission. 0 sans-nom, 0 sans-label, focus visible partout.

## Cockpit Aujourd'hui (25 arrêts)
Logo → nav rail (7 entrées numérotées, focus visible) → lignes de priorité
(entièrement cliquables : UN lien par ligne, pas d'actions ambiguës multiples) →
sections. 0 défaut après correction du code promo.

## Adhérents (20 arrêts)
Retour cockpit → IMPORTER (lien) → AJOUTER (lien) → RENOUVELER (bouton) →
recherche (labellisée) → filtre (labellisé) → CHERCHER → lignes-liens. Une ligne
de liste = un seul lien englobant — navigable sans ambiguïté.

## Espace adhérent (19 arrêts)
Retour club → déconnexion → reçu → champs infos (reliés après correction) →
uploads (nommés après correction) → installer l'app. `<details>` des saisons
précédentes : natif, opérable Entrée/Espace.

## Démo (15 arrêts)
Bandeau (RÉINITIALISER, QUITTER) → rail 7 entrées → gestes. Focus visible
(outline vert `outline-success`) partout.

## Home (25 arrêts)
Nav → CTA → sections. 0 défaut.

## Activation
Boutons : Entrée et Espace (natif `<button>`). Liens : Entrée (natif `<a>`).
Détails repliables : natif. Dialogues : Escape ferme (2/2), menu mobile restaure
le focus au déclencheur (vérifié au code + test).
