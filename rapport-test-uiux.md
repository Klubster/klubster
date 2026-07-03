# Klubster — Test complet inscription + cockpit (3 juillet 2026)

Parcours testés en conditions réelles (Chrome, prod) : création de club via /creer (« Club Démo Klubster », template Grotesque noir, couleur #1A6FB5, cours + créneau), vitrine + mode édition + chapitre FAQ + réordonnancement, inscription adulte (chèque), inscription mineur (responsable légal, en ligne), cockpit complet : Aujourd'hui_, encaissements (acompte 100 €), scanner (recherche + présence), messagerie, actualité, formulaire.

## Ce qui marche très bien

Le wizard est fluide (club publié en ~2 minutes réelles), la saisie hex et le toggle blanc/noir sont clairs. Le thème choisi s'applique partout (vitrine, inscription, mode édition) — cohérence impeccable. La bibliothèque de chapitres est limpide, le formulaire FAQ simple, le rendu fidèle à la DA. Le questionnaire de santé adulte/mineur bascule automatiquement, le bloc responsable légal apparaît au bon moment. Aujourd'hui_ raconte vraiment l'état du club (« 2 choses méritent votre attention ») et la timeline vit (inscriptions, présence pointée, horodatées). L'acompte de 100 € : enregistré, solde recalculé, affiché sur la ligne — nickel. La fiche appel du scanner (règlement / dossier / marquer présent) est exactement ce qu'il faut un soir d'entraînement.

## Corrigé dans la foulée (commit `d138e2f`, vérifié en prod)

1. **Questionnaire de santé non verrouillé** : on pouvait « attester avoir répondu NON à tout » sans avoir répondu (testé : inscription passée avec 2/9 réponses). Désormais l'attestation et la signature n'apparaissent qu'après toutes les réponses, avec compteur « 0/9 réponses — répondez à toutes les questions pour signer ».
2. **Autofill destructeur** : Chrome écrasait l'email saisi par le tien au moment du submit → « compte déjà existant » → échec opaque. Attributs `autocomplete` posés sur tous les champs (email, given-name, tel, new-password).
3. **Email déjà utilisé mal détecté** (faux succès anti-énumération Supabase → erreur générique) : détection propre + message dédié « Un compte existe déjà avec cet email ».
4. **« En ligne (carte bancaire) » proposé sans Stripe connecté** : l'adhérent validait, aucun paiement demandé, aucune explication. L'option est maintenant masquée tant que Stripe n'est pas connecté, et la page merci signale un paiement en ligne non finalisé.
5. **Libellé contradictoire** sur Aujourd'hui_ (« Tous les paiements sont à jour » + « 2 dossiers en attente ») → « Aucune cotisation en retard » quand des dossiers restent.
6. Champ acompte vidé après encaissement (évitait un double encaissement au re-clic).
7. Liens retour harmonisés « ← Aujourd'hui » (scanner, messagerie, actualité, formulaire disaient « Cockpit »).
8. Mode édition : après déplacement/ajout d'un chapitre, la page revient sur la section touchée (ancre) au lieu du haut de page.
9. Accroche par défaut à la création : le hero affiche désormais le nom du club (fini « Une association ouverte à toutes et à tous » qui effaçait le nom).

## À traiter en priorité (non-code ou chantiers)

1. **SMTP Supabase — bloquant avant tout lancement.** Le SMTP intégré limite à ~2 emails/heure : la 3e inscription de la matinée a échoué pour ça. Un forum des associations = des dizaines d'inscriptions/heure. Action : brancher un SMTP custom (Resend…) dans Supabase Auth → Settings → SMTP.
2. **Perte de saisie en cas d'erreur d'inscription.** Le formulaire recharge et perd questionnaire + signature. Chantier : soumission côté client avec conservation d'état (ou messages d'erreur inline sans rechargement).
3. **Angle mort : paiements en ligne abandonnés.** Une adhésion « en ligne » non finalisée compte dans « dossiers à terminer » mais n'apparaît pas dans Encaissements (filtré chèque/espèces) → incohérence 2 vs 1. Proposition : les lister dans Encaissements avec badge « en ligne — non finalisé ».
4. **Scanner vs acomptes.** La fiche appel dit « Non réglé » pour quelqu'un qui a versé 100/210 € — vexant au bord du ring. Adapter `verifier_adherent` pour renvoyer le solde : « Acompte versé — reste 110 € ».
5. **Stripe 3× à finaliser** : re-tester le checkout carte test après la fenêtre de rate-limit ; vérifier dans le dashboard Stripe que le webhook écoute `invoice.payment_succeeded` (échéances 2-3).

## Améliorations moyen terme

Récapitulatif à l'étape 06 du wizard (template, couleur, cours choisis) avant publication. Édition d'un chapitre existant (aujourd'hui : supprimer/recréer). Prénom du profil dans le bonjour d'Aujourd'hui_ (« Bonjour, test » si le profil s'appelle « test » — prévoir la modification du prénom quelque part). Confirmation visuelle après ajout de chapitre (l'ancre aide déjà). Inputs heure du wizard : cliquer au milieu sélectionne les minutes (piège natif, mineur).

## État après tests / nettoyage

Ton profil est revenu admin du club « test ». Le club démo reste publié pour que tu l'explores : klubster.vercel.app/clubdemoklubster (Emma : chèque, acompte 100 €, présente ; Lucas : mineur, en ligne non finalisé). Dis-moi quand tu veux que je le dépublie et purge ses données + les comptes bourdieu.mathieu+demo*@gmail.com. Le paiement 3× est resté activé sur ton club « test ». Note : créer un club via /creer rattache le créateur à ce club (mono-club par compte) — c'est pour ça que j'ai dû te remettre sur « test ».
