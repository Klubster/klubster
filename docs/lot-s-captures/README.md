# Preuves visuelles — Lot S, fondations

Captures des 5-6 août 2026, serveur `next build && next start` local, base **klubster-dev**
(`xumkklyinikmvfafyjxd`) — fixtures fictives uniquement (`Alice Dupont`, `Club A`,
`@example.com` / `@example.org`). Aucune donnée réelle, aucun secret, aucune donnée de santé.
Prises via Puppeteer (viewport exact) sur l'état de la branche : écrans cockpit/démo au
commit `c934259`, inchangés par S-E ; fiche, espace, inscription et admin au commit `1d1e590`.

| Fichier | Route | Largeur | Compte fictif | Ce que la capture prouve |
| --- | --- | --- | --- | --- |
| `01-cockpit-390.png` | `/club-a/cockpit` | 390 | président | Hiérarchie À TRAITER (danger) / À SURVEILLER (warning) en tokens, mobile sans casse |
| `02-cockpit-1280.png` | `/club-a/cockpit` | 1280 | président | Même écran au bureau — rail, compteurs, aucune régression après migration |
| `03-adherents-390.png` | `/club-a/cockpit/adherents` | 390 | président | Liste avec statuts Payé/En attente/En retard via `text-success/warning/danger` |
| `04-fiche-adherent-1280.png` | `/club-a/cockpit/adherents/[id]` | 1280 | président | Fiche : adhésion EN RETARD, pièce MANQUANTE, règlement — statuts en tokens |
| `05-espace-adherent-390.png` | `/club-a/espace` | 390 | adhérent | Carte de membre, QR lisible, « dossier complet » — l'espace après migration |
| `06-inscription-390.png` | `/club-a/inscription` | 390 | (public) | Tunnel d'inscription mobile après migration S-E |
| `07-admin-1280.png` | `/admin` | 1280 | super-admin | Console : compteurs, « ce qui demande une action » — tokens S-E appliqués |
| `08-demo-390.png` | `/demo` | 390 | (public) | La démo mobile, alignée sur le cockpit réel, sans requête externe (mesuré) |

Mesures associées (script `lh-tools/lot-s-preuves.mjs`) : 0 débordement horizontal sur
10 routes × 3 largeurs ; focus clavier visible (outline solid) ; `/demo` ne contacte
aucun hôte hors localhost. Preuve runtime de la frontière d'erreur : voir
`09-erreur-cockpit-390.png` et le rapport (`docs/lot-s-rapport-fondations.md`).
