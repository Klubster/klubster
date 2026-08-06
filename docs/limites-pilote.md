# Limites assumées au lancement pilote

Honnêtes, datées (7 août 2026), aucune n'est un bloquant irréversible.

## Vérifications restant humaines (≈ 30 min au total)

1. **VoiceOver** — non vérifié en conditions réelles. Le dictionnaire AppleScript de VO
   répond mais son lancement est refusé à l'environnement d'automatisation (permission
   système). L'arbre d'accessibilité — ce que VO lit — est capturé et propre sur
   7 écrans. Checklist réelle prête : `docs/lot-s-accessibilite/voiceover.md` (~10 min).
2. **PWA physique** — manifest/SW audités et servis, mais aucune installation testée
   sur iPhone/Android réel. Checklist : installer depuis `/{club}/installer`, vérifier
   nom, icône du club, lancement standalone sur l'espace, mise à jour silencieuse,
   comportement en avion (l'app n'annonce AUCUN mode hors-ligne : l'échec doit rester
   un échec réseau propre).
3. **« Prêt en moins de 30 minutes »** — plausible (wizard court, certifié
   fonctionnellement), non re-chronométré depuis la refonte : chronométrer la création
   du club pilote et reformuler si l'on dépasse.
4. **Tunnel d'inscription E2E local** — l'action serveur exige la clé service
   (indisponible dans l'environnement de preuve, à dessein). Rendu, validation,
   responsive, clavier, annonces d'erreur : certifiés ; la RPC `register_adherent_full`
   est couverte par les tests et rejouée par le harnais. Un passage humain de 5 min sur
   klubster-dev (ou la clé service dev) ferme ce point.

## Choix de conception assumés (documentés ailleurs, rappelés ici)

- Lecture des pièces et questionnaires : président + secrétaire uniquement (au registre).
- Relances désactivées pour usmboxe (réglage en base, données importées).
- Pas de suite E2E Stripe avec horloges de test ; webhooks couverts par tests unitaires
  + rejeu simulé.
- 2FA du super-admin : à activer (action humaine, hors dépôt).
- Registre des traitements : Resend et Microsoft Clarity à ajouter (écart documenté au
  29/07, correction éditoriale hors code à faire dans `docs/registre-des-traitements.md`).
- 12 warnings eslint préexistants (react-hooks), inventoriés, sans rapport avec la pile.

## Hors périmètre du pilote

Lecteurs d'écran mobiles (VoiceOver iOS / TalkBack) · `prefers-reduced-motion` en
profondeur · offline réel (aucune promesse produit) · application native (refusée au
filtre 18 h).
