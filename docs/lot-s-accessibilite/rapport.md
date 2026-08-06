# Lot S13 — accessibilité profonde : rapport

Branche `feat/lot-s-accessibilite-profonde` (base `dd07b34`), 6 août 2026.
Mesures Puppeteer sur build de production, klubster-dev, fixtures fictives.

## Statuts par vérification

| Vérification | Statut | Preuve |
| --- | --- | --- |
| Ordre de tabulation logique (7 écrans : home, connexion, inscription, démo, cockpit, adhérents, espace) | ✅ vérifié au clavier (outillé) | `captures/*.json` (séquences complètes) |
| Focus visible sur chaque arrêt de tabulation | ✅ vérifié — **0 focus invisible / 149 arrêts** | idem |
| Aucun piège clavier | ✅ vérifié | idem |
| Boutons/liens nommés | ✅ vérifié — **0 contrôle sans nom** sur les 7 écrans | idem |
| Champs reliés à leur libellé | ✅ corrigé puis vérifié — 4 défauts trouvés et corrigés (voir Défauts) | idem |
| Images utiles avec alt / décoratives ignorées | ✅ vérifié — 0 `img` sans alt | idem |
| Erreurs annoncées (`role="alert"`) | ✅ corrigé — inscription, connexion ; équipe déjà en `role="status"` | tests `lot-s-accessibilite.test.tsx` |
| Dialogues nommés, modaux, Escape, restauration focus | ✅ vérifié au code + tests — les 2 dialogues (menu mobile, simulation démo) étaient déjà conformes | tests |
| Signature du questionnaire de santé | ✅ **corrigée** — voir section dédiée | tests + code |
| Uploads | ✅ corrigé — input fichier nommé avec action réelle + formats (« Remplacer — Certificat médical (PDF, JPG ou PNG) ») | code espace |
| Arbre d'accessibilité (ce que reçoit une assistance) | ✅ capturé pour les 7 écrans | `captures/*-arbre.json` |
| Tableaux financiers | ✅ vérifié — le produit privilégie les listes structurées ; les 5 `<table>` restants ont des en-têtes | inventaire |
| Zoom 200 % | ✅ équivalent couvert — 45/45 sans débordement à 320-430 px (zoom 200 % sur 13″ ≈ 640-720 px logiques, couvert par la grille) | preuves S9-S11 |
| **VoiceOver** | ⏳ **non vérifié — en attente de Mathieu** (checklist fournie : `voiceover.md`). Ne sera marqué vérifié qu'après un passage réel. | — |
| PWA physique (S15) | ❌ limite assumée — aucun appareil accessible depuis l'environnement | — |

## Défauts trouvés et corrigés

| # | Écran | Défaut | Correction |
| --- | --- | --- | --- |
| 1 | Questionnaire de santé | Signature canvas pointer-only : aucune alternative clavier, canvas sans nom, état non annoncé | Champ « Signer au clavier » qui **trace le nom dans le même canvas et produit le même PNG** (règle métier inchangée : image + signataire + date, réponses jamais stockées) ; `role="img"` + label d'état ; statut en `aria-live` ; « effacer » nommé |
| 2 | Inscription publique | Bloc d'erreurs serveur muet pour un lecteur d'écran | Enveloppé dans `role="alert"` |
| 3 | Connexion | Échec/succès muets | `role="alert"` / `role="status"` |
| 4 | Espace adhérent | `email`, `téléphone` : label voisin non relié ; input fichier sans nom | `htmlFor`/`id` ; `aria-label` avec action réelle + formats |
| 5 | Cockpit | Code promo : placeholder seul | `aria-label` |
| 6 | /combat | Intro plein écran : div cliquable muet | `role="button"` + `tabIndex` + Enter/Espace + nom |

## Vérifié automatiquement vs manuellement

- **Outillé (Puppeteer)** : tabulation réelle touche par touche, calcul de visibilité du
  focus (outline/boxShadow calculés), noms accessibles, associations label/champ,
  arbre d'accessibilité. Ce n'est **pas** une simple inspection statique du DOM : le
  clavier est réellement pressé et le focus réellement mesuré.
- **Au code + tests** : dialogues, alertes, signature (11 tests comportementaux).
- **Non vérifié** : VoiceOver (en attente), PWA physique.

## Limites assumées

VoiceOver en attente d'un passage réel (checklist prête) ; lecteur d'écran mobile
(VoiceOver iOS / TalkBack) hors périmètre de cette passe ; `prefers-reduced-motion`
non audité en profondeur (les animations du produit sont rares et discrètes).

## S14 — responsive cockpit/espace aux 9 largeurs (après S13)

8 routes (cockpit, adhérents, fiche, cours, paiements, messages, espace, inscription)
× 9 largeurs (320→1920) : **un seul défaut trouvé** — la fiche adhérent débordait de
+54 px à 320 (largeur intrinsèque du sélecteur d'adhésion, « Boxe adultes A — reste
240,00 € »). Corrigé (`max-w-full` + `min-w-0`), re-mesuré : **72/72 sans débordement**.
Captures bornes dans `captures/`.
