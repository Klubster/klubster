# Preuves S6-S8 (6 août 2026, branche feat/lot-s-adoption-composants)

Mêmes conditions que le dossier parent : klubster-dev, fixtures fictives, Puppeteer,
`next build && next start`. 0 débordement horizontal mesuré ; `/demo` : aucun hôte externe.

| Fichier | Prouve |
| --- | --- |
| `adherents-boutons-{390,1280}.png` | ButtonLink primaire/secondaire adoptés (IMPORTER / AJOUTER), liste sur LA table des statuts |
| `adherents-filtre-vide-1280.png` | EtatVide « filtre sans résultat » avec retour — distinct du premier usage |
| `relances-390.png` | EtatVide « club à jour » : bonne nouvelle sans action |
| `espace-multi-adhesions-{390,1280}.png` | S7 : deux adhésions saison courante listées séparément, ancienne saison repliée |
| `demo-tokens-390.png` | Démo sur tokens, hiérarchie intacte, isolation mesurée |
