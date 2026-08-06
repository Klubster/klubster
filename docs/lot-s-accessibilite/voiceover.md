# VoiceOver — checklist du passage réel (à dérouler, ~10 min)

**Statut : NON VÉRIFIÉ.** Ce fichier passera à « vérifié » seulement après un
passage réel — soit par Mathieu, soit par pilotage autorisé de sa machine.

## Préparation
1. Serveur local : `cd /private/tmp/klb-lot-s-accessibilite && npx next start -p 3111`
2. VoiceOver : **Cmd+F5**. Navigation : **Ctrl+Option+flèches** (VO = Ctrl+Option).
3. Safari ou Chrome sur `http://localhost:3111`.

## Écrans et points d'écoute

### /connexion
- [ ] Les onglets SE CONNECTER / CRÉER UN COMPTE s'annoncent comme boutons nommés
- [ ] « EMAIL », « MOT DE PASSE » annoncés en entrant dans les champs
- [ ] Après un mauvais mot de passe : l'erreur est **lue spontanément** (role=alert)

### /club-a/inscription (klubster-dev)
- [ ] Chaque champ annonce son libellé ; les obligatoires se comprennent
- [ ] Le questionnaire de santé : chaque question lue, réponses opérables
- [ ] **Signature** : le canvas annonce « Zone de signature — vide… champ Signer au
      clavier ci-dessous » ; taper son nom dans le champ → « ✓ signé » est **lu
      spontanément** (aria-live) ; « Effacer la signature » annoncé
- [ ] Soumission incomplète : le bloc d'erreur est lu spontanément

### /club-a/cockpit (president.a@example.com)
- [ ] « À TRAITER MAINTENANT » : chaque ligne lit nombre + phrase + action en un lien
- [ ] Les statuts se comprennent au libellé seul (jamais couleur seule)

### /club-a/cockpit/adherents
- [ ] Une ligne = « Prénom Nom, cours, email, statut, montant » en un seul lien
- [ ] Recherche et filtre annoncés

### /club-a/espace (adherent.a@example.com)
- [ ] Carte : nom, saison, « Présentez ce code… » ; QR annoncé « QR de membre »
- [ ] Adhésions : cours + montant + statut lisibles ligne à ligne
- [ ] Upload : « Déposer — Certificat médical (PDF, JPG ou PNG) »

### /demo
- [ ] Bandeau « DÉMONSTRATION — CLUB FICTIF » lu en premier
- [ ] Rail : « 01 AUJOURD'HUI » … « 07 SITE » comme liens nommés

## Ce que l'audit outillé garantit déjà (arbre d'accessibilité capturé)
Les noms, rôles et états ci-dessus existent dans l'arbre d'accessibilité
(`captures/*-arbre.json`) — VoiceOver lit cet arbre. Le passage réel vérifie la
prosodie, l'ordre de lecture effectif et les annonces spontanées, que l'arbre seul
ne prouve pas.
