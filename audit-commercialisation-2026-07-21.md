# AUDIT FINAL AVANT COMMERCIALISATION — KLUBSTER

**Date :** 21 juillet 2026 · **Périmètre :** klubster.fr (prod) + code source complet · **Méthode :** audit code (2 passes exhaustives), test visiteur à froid, test utilisateur réel de bout en bout (compte « Club Test Audit Klubster », bourdieu.mathieu+audit@gmail.com), audit UX/design/copy/commercial/confiance, tests fonctionnels. **Aucune modification effectuée.**

> Compte test créé pendant l'audit (à supprimer après lecture) : club `clubtestauditklubster`, président `bourdieu.mathieu+audit@gmail.com`, adhérent fictif « Theo Testeur Audit » (`bourdieu.mathieu+adherent@gmail.com`), 1 règlement chèque de 100 € enregistré. Aucun paiement réel, aucun abonnement souscrit.

---

## 1. VERDICT EXÉCUTIF

**🟠 PRESQUE PRÊT — corrections prioritaires nécessaires.**

- **Klubster est-il prêt à être commercialisé ?** Le produit, lui, est prêt : le cœur (création de club en 5 minutes, site public instantané, inscriptions en ligne, dossiers, encaissements, relances, messagerie, emails transactionnels) fonctionne réellement — je l'ai vérifié de bout en bout en conditions réelles. Ce qui n'est pas prêt, ce sont **trois détails de surface qui détruisent précisément ce que le cold emailing doit construire : la confiance.**
- **Peut-on lancer une campagne maintenant ?** Non, pas aujourd'hui. Oui, dans 1 à 2 jours, après correction des 3 P0 ci-dessous (aucun n'est un chantier).
- **Note globale : 76/100.**
- **Principal point fort :** la cohérence promesse → produit. La landing promet « prêt en moins de 30 minutes » ; le test réel a mis un club en ligne, site public compris, en ~9 minutes — incident de confirmation d'email inclus (~5 minutes sans lui). C'est rare, et c'est un argument commercial vérifiable.
- **Principal risque :** un visiteur méfiant issu d'un cold email qui clique « Un club » (la démo) tombe sur une FAQ « dfsdfsdf / sdfsdfsdf », puis lit en bas des CGV « Modèle de référence à faire valider par un conseil juridique avant publication ». Deux signaux « produit pas fini » sur les deux pages les plus consultées par quelqu'un qui vérifie avant de s'inscrire.
- **Principal frein à la conversion :** le moment le plus fragile du funnel — la confirmation d'email — aboutit sur `/connexion?erreur=confirmation` **sans aucun message**, et le brouillon du wizard est perdu malgré la promesse « votre brouillon est conservé ».
- **Meilleur rapport impact/effort :** supprimer le bandeau « modèle de référence » des 5 pages légales (30 minutes de travail, gain de confiance immédiat sur le point de contrôle n°1 des trésoriers et secrétaires).

---

## 2. SCORECARD GÉNÉRALE

| Domaine | Note /100 | Niveau | Commentaire |
|---|---|---|---|
| Proposition de valeur | 88 | Excellent | « Toute votre association, au même endroit » + « 0 % commission » + « prêt en 30 min » : claire, différenciante, prouvée par le produit. |
| Compréhension immédiate | 85 | Très bon | Hero compris en 5 s. Ce que Klubster remplace est explicite (tableur, chèques, WhatsApp). |
| Copywriting | 90 | Excellent | Niveau rare pour un SaaS français : concret, sobre, sans jargon, ton constant. Voir §11 pour les rares retouches. |
| Conversion | 72 | Bon | CTA omniprésents et cohérents, mais funnel post-clic fragilisé (confirmation silencieuse, brouillon perdu). |
| Crédibilité | 62 | Insuffisant | Bandeau légal « à faire valider », FAQ de test sur la vitrine démo, preuve sociale mono-club. |
| Design | 82 | Très bon | DA éditoriale singulière et tenue. Réserve : photos d'illustration au rendu IA (yoga surtout) en tension avec la promesse documentaire. |
| Cohérence visuelle | 85 | Très bon | Système typographique (Inter + Space Mono + `_`) appliqué partout, landing → cockpit → emails. |
| UX | 78 | Bon | Parcours principaux fluides, états vides soignés. Frictions localisées (voir §12). |
| Ergonomie | 76 | Bon | Cockpit lisible, actions rapides bien nommées. Cibles tactiles < 44 px sur les pages denses. |
| Onboarding | 80 | Très bon | Wizard en 6-7 étapes exemplaire + « Premiers pas » dans le cockpit. Pénalisé par la perte de brouillon. |
| Time to value | 85 | Excellent | Compte → club publié + site en ligne : ~5 min mesurées. Email de bienvenue avec les 3 adresses : très bon. |
| Mobile | 70 | Correct | Audit code : rien de cassé, tout dégrade proprement. Mais nav cockpit horizontale peu découvrable, safe-areas PWA iOS absentes. (Écrans mobiles non vérifiés visuellement — limite de l'environnement de test.) |
| Accessibilité | 65 | Moyen | Burger 44 px, Échap, aria-hidden OK ; mais labels 9-10 px généralisés, focus non audité systématiquement, contrastes des labels gris clair à vérifier. |
| Qualité fonctionnelle | 82 | Très bon | Tout ce qui a été testé fonctionne. Réserves : erreurs React #418/423/425 (hydration) sur la home, session président perdue après test du formulaire public, notification d'inscription non envoyée sans email club. |
| Confiance | 60 | Insuffisant | Pages légales complètes et sérieuses… invalidées par leur propre bandeau. Pas de témoignage tiers, pas de page contact/à propos. |
| Préparation commerciale | 70 | Bon | Tarifs limpides, essai sans CB, résiliation en un clic. Manque : page tarifs dédiée (ancre seulement), FAQ complète, mesure analytique. |
| Potentiel cold emailing | 75 | Bon | Le couple /combat (ciblée, tutoiement, mémorable) + home est une vraie machine de campagne — une fois les P0 corrigés. |

---

## 3. CE QUI FONCTIONNE DÉJÀ TRÈS BIEN (à protéger)

1. **Le produit tient sa promesse temporelle.** Test réel : wizard /creer → club publié, site public en ligne, email de bienvenue avec les 3 adresses (site, cockpit, lien d'inscription) en ~5 minutes. Aucun concurrent du segment ne peut le contester facilement.
2. **Le funnel d'inscription adhérent est complet et professionnel.** Formulaire public pré-rempli selon le type d'asso (urgence, autorisation photo, Pass'Sport −70 €, pièces à fournir, compte adhérent, choix chèque/espèces quand Stripe n'est pas connecté), Turnstile anti-bot, page « Bienvenue, Theo » avec les étapes suivantes, emails immédiats à l'adhérent. L'inscription est apparue dans le cockpit instantanément, le règlement partiel de 100 € par chèque s'est enregistré en un clic avec historique daté.
3. **Le copywriting.** « Un club, ce n'est pas une base de données », « Vous ne configurez pas un logiciel. Vous ouvrez votre association », les 3 objections traitées en FAQ (tableur → import, partir → export, données → UE). Ton humain constant jusque dans les emails de relance (« Si c'est déjà fait, merci de ne pas tenir compte de ce message »).
4. **La transparence tarifaire.** 9/19/29 € selon l'effectif calculé automatiquement, premier mois sans CB, frais Stripe explicités (1,5 % + 0,25 €), 0 % de commission répété et vrai (Connect charges directes — vérifié dans le code). C'est un désarmeur d'objection massif face à HelloAsso/AssoConnect.
5. **La cohérence design de bout en bout** : landing, wizard, cockpit, site des clubs, espace adhérent, emails — même langage (kickers mono, `_`, vert #279B65 en accent, 0px radius). Le cockpit « Le club est prêt. » avec ses « Premiers pas » est un modèle d'onboarding.
6. **La sécurité et le RGPD réels** (audit code) : webhooks Stripe signés + idempotents + contrôle de propriété du compte connecté, mutations toutes filtrées par organisation, anti-énumération, uploads validés par octets, données de santé minimisées (résultat seul), export sans données santé, anonymisation depuis la fiche. Le DPA et la politique de confidentialité sont d'un niveau au-dessus du marché.
7. **La landing /combat** : positionnement de niche mémorable, exécution soignée (sprites animés réels, prefers-reduced-motion respecté), tutoiement assumé et cohérent avec la cible. Excellente arme de cold emailing segmenté.
8. **Les emails transactionnels** : arrivés en < 10 s, HTML sobre aux couleurs de la marque, reply-to du club, wording soigné.

---

## 4. PROBLÈMES BLOQUANTS (P0)

### P0-1 · Bandeau « Modèle de référence à faire valider par un conseil juridique avant publication » visible en production
- **Où :** toutes les pages légales (`/mentions-legales`, `/cgv`, `/confidentialite`, vérifié à l'écran ; le bandeau est dans `LegalShell`/pages de `src/app/{mentions-legales,cgu,cgv,confidentialite,sous-traitance}/`).
- **Preuve :** capture du 21/07, encadré vert en tête de chaque page.
- **Impact :** le trésorier ou le secrétaire — les profils qui vérifient le légal avant d'engager l'association — lit noir sur blanc que les CGV qu'on lui demande d'accepter (case obligatoire à l'étape Publier) ne sont pas validées. C'est aussi un aveu exploitable en cas de litige.
- **Correction :** retirer le bandeau des 5 pages ; en parallèle, faire réellement valider les textes (le contenu est déjà solide — je ne me prononce pas juridiquement, c'est à un juriste de le faire).
- **Validation :** aucune occurrence de « modèle de référence » sur les 5 URLs publiques.

### P0-2 · Texte de test « dfsdfsdf » sur la vitrine USM Boxe, liée en nav principale comme démo
- **Où :** `klubster.fr/usmboxe`, section « SECTION 07 — LES QUESTION QUE VOUS VOU SPOSEZ_ » (double faute dans le titre du chapitre) avec deux entrées « dfsdfsdf / sdfsdfsdf » et « sdfsdfsdf / sdfsdfsdsdfsdff ».
- **Impact :** c'est LA page que la nav « Un club » propose comme preuve. Un visiteur méfiant y va précisément pour juger le sérieux. Effet immédiat « produit pas fini », qui contamine la promesse « testé en conditions réelles à l'USM Boxe ».
- **Correction :** remplacer par 3-4 vraies questions du club (certificat médical, essai gratuit, âge minimum, paiement en plusieurs fois) — 15 minutes dans le cockpit USM Boxe, aucune ligne de code.
- **Validation :** relire `/usmboxe` intégralement (c'est une vitrine de démonstration : zéro placeholder toléré).

### P0-3 · Confirmation d'email : échec silencieux + brouillon du wizard perdu
- **Où :** parcours testé en réel : wizard → « CRÉER MON COMPTE » → email reçu → clic « CONFIRMER MON EMAIL » → atterrissage sur `/connexion?erreur=confirmation` **sans aucun message à l'écran**, formulaire vierge (autofill du navigateur aidant, il affichait même les identifiants d'un autre compte). Après connexion manuelle : retour à `/creer`… **au step 1, brouillon vide** — nom du club, template, cours : tout était à re-saisir, alors que l'écran précédent promettait « votre brouillon est conservé ».
- **Nuance factuelle :** le compte était bien activé (la connexion manuelle a fonctionné du premier coup). C'est donc un problème d'orchestration/redirection (PKCE + `/auth/callback`) et de persistance du brouillon, pas d'activation.
- **Impact :** c'est l'instant le plus fragile du funnel cold email. Un bénévole qui a investi 4 étapes de wizard, reçoit « erreur » implicite + formulaire vide + re-saisie complète : taux d'abandon potentiellement massif, et invisible dans vos stats (le compte existe, le club ne sera jamais publié). À noter : le cas « ouvre l'email sur son téléphone alors que le brouillon est dans le localStorage de l'ordinateur » produira structurellement la même perte — le message promet plus que ce que localStorage peut tenir.
- **Correction :** (a) afficher un message explicite pour `?erreur=confirmation` sur `/connexion` (« Votre email est confirmé / le lien a expiré — connectez-vous ») ; (b) diagnostiquer l'échec d'échange PKCE dans `/auth/callback` (le lien `verify` Supabase aboutissait en erreur dans le même navigateur) ; (c) sauvegarder le brouillon côté serveur au moment de la création du compte (il y a déjà un compte authentifiable à cet instant), ou au minimum re-tester la persistance localStorage sur ce chemin ; (d) reformuler la promesse si la persistance reste locale (« depuis cet appareil »).
- **Validation :** re-dérouler le parcours complet avec un email neuf : clic sur le lien de l'email → retour au wizard avec brouillon intact, ou message clair et parcours de reprise en 1 clic.

---

## 5. PROBLÈMES MAJEURS (P1)

1. **Notification « Nouvelle inscription » jamais reçue par le club sans email de contact.** Test réel : club créé sans email (étape Infos optionnelle sautée) → l'inscription de Theo n'a généré aucun email au président (vérifié en boîte). Le président ne découvre les inscriptions qu'en ouvrant le cockpit. *Correction :* fallback sur l'email du compte président quand `organisations.email` est vide (`inscription/actions.ts`), et/ou rendre l'email club pré-rempli avec celui du compte dans le wizard.
2. **Session président perdue après test du formulaire public.** Après avoir soumis l'inscription adhérent (création du compte Theo) dans le même navigateur, la navigation cockpit suivante a renvoyé sur `/connexion` — la session président a été remplacée/invalidée. Or « je teste mon propre formulaire » est le premier réflexe d'un nouveau président. *Correction :* ne pas créer de session pour le compte adhérent quand une session admin existe (ou la restaurer), ou avertir explicitement.
3. ~~**Erreurs React en console sur la home en prod** (#425, #418, #423).~~ **FAUX POSITIF — retiré le 21/07/2026 après vérification.** Les 7 exceptions étaient toutes horodatées à la même seconde (`09:40:33`) et provenaient de `www.klubster.fr` : un tampon de console figé, capturé lors de la toute première visite de l'audit. Après vidage du tampon et rechargement sur l'origine canonique, la home, `/fonctionnalites` et `/cgv` ne produisent **aucune erreur**. Les composants clients de la home (`Reveal`, `Citation`, `Parallax`) ont par ailleurs été relus : leur état initial est identique côté serveur et client, aucune divergence d'hydratation possible. Aucune correction n'était nécessaire.
4. **Section « OÙ NOUS TROUVER_ » affichée vide sur le site public** quand ni adresse ni contact ne sont renseignés (vérifié sur le club test : titre de section sans aucun contenu). *Correction :* masquer le chapitre si aucune donnée (comme c'est déjà fait pour d'autres sections).
5. **Photos d'illustration au rendu IA.** La salle de yoga (home + /fonctionnalites) a un rendu CGI lisse caractéristique ; le contexte produit exige « photographie documentaire… ambiance humaine sans imagerie générique ». Le brief interdit précisément l'impression « produit généré par IA » — c'est la section du site où ce risque existe. *Correction :* remplacer en priorité la photo yoga (et auditer les autres à l'œil : vestiaire et piscine passent mieux) par de vraies photos re-gradées, même imparfaites — l'USM Boxe est un gisement crédible et gratuit.
6. **Pas de page `/tarifs` dédiée.** La nav « Tarifs » pointe l'ancre de la home — acceptable — mais pour une campagne, une URL tarifs propre (canonical, OG dédié, réponse directe aux emails « combien ça coûte ») convertit mieux et se partage. *Correction :* page mince reprenant la section III + FAQ tarifaire + CTA.
7. **Preuve sociale mono-club.** « 312 adhérents gérés cette saison » (chiffre en dur dans `page.tsx`, commenté « à rafraîchir ») + un seul club nommé, celui du fondateur. Honnête et bien raconté, mais un trésorier prudent le remarquera. *Correction court terme :* préparer 2-3 clubs pilotes (le code promo PREM26 existe déjà pour ça) et ajouter leurs logos/verbatims dès que possible ; en attendant, assumer explicitement « produit jeune, premier mois offert, export en un clic » comme contre-poids (déjà partiellement fait).
8. **Aucune mesure analytique.** Aucun tracking (pas de pageview, pas d'événement signup/publication/abonnement) constaté dans le code ni le réseau. Lancer une campagne sans mesurer clic → compte → publication → abonnement revient à piloter à l'aveugle. *Correction :* un outil léger conforme RGPD sans bandeau (Plausible/Matomo en exemption CNIL) + 4 événements serveur.
9. **`/combat` orpheline techniquement** : ni sitemap, ni canonical, ni OG dédié (partages sociaux dégradés), pas de bloc légal dans son footer réduit — vérifier que la cible cold email « combat » y atterrit avec des UTM et peut naviguer vers les CGV.

---

## 6. AMÉLIORATIONS IMPORTANTES (P2 fonctionnels)

1. **Expéditeur des emails** : `inscriptions@klubster.fr` sans nom d'affichage. Mettre « Klubster » (et « {Nom du club} via Klubster » pour les emails aux adhérents) améliore l'ouverture et la confiance.
2. **Lien de confirmation** affiché sur `basnfuvdjobanejahayt.supabase.co` : configurer un domaine d'auth custom (`auth.klubster.fr`) pour que le clic reste sous la marque.
3. **Multi-club impossible** (un compte = une organisation, `profiles.organisation_id` scalaire) : un dirigeant d'un club omnisports ou un prestataire multi-clubs ne peut pas gérer deux structures. À cadrer avant que le support ne le découvre en production.
4. **Page /admin (super-admin) = maquette statique** (tableau en dur « USM Boxe Anglaise », aucune requête). Sans conséquence client (404 pour les non-super-admin, vérifié), mais vous n'avez aucun outil de pilotage plateforme pour suivre la campagne (liste des clubs créés, statuts d'abonnement). Le minimum : une vraie liste des organisations.
5. **Schéma/RLS/RPC absents du repo** (une seule migration de référence, le reste vit dans Supabase prod). Risque de reprise/audit sécurité impossible depuis le code, et pas de reproductibilité. Exporter le schéma et versionner les migrations avant de grossir.
6. **Notification d'échec — cas « compte existe déjà »** dans le wizard : tester le parcours « j'ai déjà un compte » avec brouillon (non couvert par ce test).
7. **Empty state du planning public** (« Le planning sera bientôt disponible ») : proposer plutôt un CTA admin « Ajoutez vos créneaux » en mode édition ; pour le visiteur, masquer la section si aucun créneau (même logique que P1-4).
8. **Safe-areas iOS en PWA installée** (`viewport-fit=cover` + `env(safe-area-inset-*)` absents, avec `statusBarStyle: black-translucent`) : l'écran carte de membre — le `start_url` du manifest — passe sous l'encoche une fois installé.

---

## 7. FINITIONS PREMIUM

1. Cibles tactiles < 44 px : boutons ENCAISSER/relances (`PaiementsClient.tsx`, ~30-32 px), « × » créneau (`CoursEditeur.tsx`), rail nav cockpit (34 px) — passer à `py-3` minimum sur les pages « terrain ».
2. Rail de navigation cockpit mobile sans affordance de scroll : ajouter un dégradé de bord ou une flèche.
3. Libellés 9 px (étapes du wizard, badges) : 10-11 px minimum.
4. Uniformiser le title de partage social (l'OG title reste celui du layout alors que la home a un title SEO différent — choix documenté, mais vérifier le rendu des partages).
5. Ajouter un vrai favicon/OG check sur /combat + un `<link rel=canonical>`.
6. Le hero du site d'un club neuf est nu (nom + 2 boutons sur fond blanc) : proposer une accroche par défaut (« Inscriptions ouvertes pour la saison 2026-2027 ») tant que l'admin n'a rien écrit.
7. Réutiliser la mécanique « chapitres prêts à l'emploi » comme argument sur la landing (elle existe : mot du président, FAQ, galerie… — c'est un différenciateur peu mis en avant).
8. Page « À propos / Contact » légère (l'histoire du fondateur y gagnerait une URL dédiée, utile aussi en signature de cold email).

---

## 8. RAPPORT DU TEST UTILISATEUR (réalisé en réel le 21/07/2026)

**Parcours et chronométrage** (desktop, compte neuf) :

| Étape | Résultat | Temps cumulé approx. | Émotion probable |
|---|---|---|---|
| Arrivée home → compréhension | Promesse comprise dès le hero | 10 s | Intérêt |
| Home → clic « Créer mon association » | Wizard clair, 7 étapes annoncées | 1 min | Confiance |
| Étapes template/nom/couleur/infos/cours | Fluides, slug auto (`klubster.fr/clubtestauditklubster`), tout optionnel sauf le nom | 3 min | Maîtrise, plaisir (aperçus immédiats) |
| Création du compte | Message clair, email reçu en < 10 s | 4 min | Confiance |
| **Clic lien de confirmation** | **/connexion?erreur=confirmation, aucun message, brouillon perdu** | 5 min | **Confusion → frustration ; point d'abandon n°1** |
| Re-connexion + re-saisie du wizard | Tout à refaire (nom, template, cours) | 8 min | Agacement (surmonté ici parce qu'audit) |
| Publier (CGV+DPA) → cockpit | « Le club est prêt. » + Premiers pas 6 étapes + bandeau « votre club est en ligne » | 9 min | Satisfaction nette — le « moment aha » |
| Visite du site public | En ligne immédiatement, propre ; section « Où nous trouver » vide affichée | 10 min | Fierté (légèrement écornée) |
| Inscription adhérent test (formulaire public) | Complet : urgence, Pass'Sport, pièces, compte, chèque/espèces, Turnstile | 13 min | Impression de sérieux |
| Cockpit : adhérent apparu, fiche, règlement 100 € chèque | Instantané, historique daté, statuts clairs | 15 min | Confiance forte — 2e moment de valeur |
| Retour cockpit après test du formulaire | **Session président perdue → re-login** | 15 min | Confusion |
| Paiements, messagerie, scanner, équipe, domaine, identité | Tous fonctionnels, textes impeccables | 20 min | Maîtrise |

**Le « moment aha »** (« je comprends ce que Klubster m'apporte ») survient à la publication : bandeau « ✓ Votre club est en ligne » + email de bienvenue avec les 3 adresses. Il arrive vite et il est fort. Tout ce qui le précède doit donc être sans accroc — d'où la criticité du P0-3 qui se dresse juste avant.

**Emails reçus pendant le test :** confirmation compte (< 10 s), « Club Test Audit Klubster est en ligne », confirmation compte adhérent, « Votre inscription — Club Test Audit Klubster ». Tous propres, cohérents, aux couleurs de la marque. **Email jamais reçu :** notification « Nouvelle inscription » au club (P1-1).

---

## 9. AUDIT PAGE PAR PAGE (synthèse)

| Page | Objectif | État | Problèmes | Priorité |
|---|---|---|---|---|
| Home `/` | Convaincre + CTA | Très bonne (design 8,5/10, lisibilité 9/10, confiance 7/10, singularité 9/10) | Photos IA (yoga), preuve sociale mono-club, erreurs hydration console | P1 |
| `/fonctionnalites` | Détail preuve | Très bonne — maquettes produit crédibles (FormBuilder, fiche Théo Nguyên) | RAS majeur | P2 |
| `/combat` | Landing niche | Excellente exécution | Hors sitemap, pas d'OG/canonical, footer légal réduit | P1 (si utilisée en campagne) |
| `/usmboxe` (démo de fait) | Preuve sociale | Bonne structure, vrai contenu (cours, planning, carte, contact) | **FAQ « dfsdfsdf » + titre fautif** | **P0** |
| `/creer` (wizard) | Conversion | Excellente (progression, aperçus, optionnel partout) | Perte de brouillon post-confirmation (P0-3) ; « × » créneau minuscule | P0/P2 |
| `/connexion` | Auth | Correcte, messages d'erreur traduits | **Cas `?erreur=confirmation` muet** | **P0** |
| Pages légales ×5 | Confiance | Contenu riche et sérieux | **Bandeau « modèle de référence »** | **P0** |
| Cockpit Aujourd'hui | Home produit | Excellente (Premiers pas, état du club, actions rapides) | Rail mobile peu découvrable | P2 |
| Cockpit Adhérents + fiche | Gestion | Très bonne (recherche, filtres, saison, RGPD sur fiche) | Zone cliquable de la ligne peu évidente (le clic sur le nom n'a pas navigué au 1er essai) | P2 |
| Cockpit Paiements | Encaissements | Très bonne (remise de chèques, relances, export) | Densité mobile, cibles tactiles | P2 |
| Cockpit Cours / Formulaire / Équipe / Identité / Domaine / Messages / Scanner | Config & terrain | Fonctionnels, textes remarquables (rôles expliqués en une ligne chacun) | RAS majeur | — |
| Site public club neuf | Vitrine | Propre, en ligne immédiatement | Section « Où nous trouver » vide affichée ; hero nu | P1/P2 |
| Inscription publique + `/merci` | Conversion adhérent | Excellente | RAS | — |
| 404 | Filet | Propre, CTA retour | RAS | — |
| `/admin` | Pilotage plateforme | 404 public (bien) ; maquette en interne | Pas d'outil de suivi campagne | P2 |

---

## 10. AUDIT PARCOURS PAR PARCOURS

1. **Cold email → landing** : promesse à tenir dans l'objet/le corps de l'email = celle du hero (« au même endroit », « 0 % commission », « 30 minutes »). Cohérent. Risque : atterrissage /combat sans OG ni analytics.
2. **Landing → création de compte** : friction minimale (wizard avant compte — excellent choix : l'investissement précède l'engagement). Risque unique mais majeur : P0-3.
3. **Compte → première valeur** : publication = moment fort, immédiat. RAS.
4. **Première valeur → activation** : « Premiers pas » guide bien (formulaire, équipe, Stripe, site, domaine, import). Manque le retour de boucle : sans email club, les inscriptions n'alertent personne (P1-1).
5. **Activation → paiement** : bloc abonnement clair (« premier mois offert — sans carte bancaire », code promo, factures/résiliation via portail Stripe). Le palier se recalcule sur l'effectif : personne ne choisit un « plan », zéro friction décisionnelle. Très bon.
6. **Adhérent : lien public → inscription → espace** : complet, testé, sans accroc (avec chèque/espèces en l'absence de Stripe — cohérent).

---

## 11. RECOMMANDATIONS DE COPYWRITING

Le niveau est déjà excellent ; recommandations volontairement chirurgicales.

| Emplacement | Texte actuel | Problème | Proposition | Impact |
|---|---|---|---|---|
| `/connexion?erreur=confirmation` | *(rien)* | Échec silencieux au pire moment | « Votre email est confirmé (ou le lien a expiré). Connectez-vous pour reprendre là où vous en étiez. » | Récupération d'abandons — le plus fort levier texte du site |
| Wizard, étape Compte | « votre brouillon est conservé » | Promesse non tenue dans le parcours testé | Après correction technique : « votre brouillon est conservé sur cet appareil » (si localStorage) ou garder tel quel (si serveur) | Confiance |
| USM Boxe, FAQ | « LES QUESTION QUE VOUS VOU SPOSEZ » + dfsdfsdf | Placeholder + faute sur la vitrine démo | « Les questions que vous vous posez » + 3 vraies Q/R | Crédibilité (P0) |
| Pages légales | « Modèle de référence à faire valider… » | Auto-invalidation publique | Supprimer | Crédibilité (P0) |
| Home, section fondateur | « 312 adhérents gérés cette saison » | Chiffre en dur, bientôt périmé (nouvelle saison) | Le brancher sur la donnée réelle ou le dater (« saison 2025-2026 ») | Honnêteté vérifiable |
| Emails | Expéditeur brut `inscriptions@klubster.fr` | Impersonnel en boîte de réception | Nom d'affichage « Klubster » / « {Club} via Klubster » | Ouverture, confiance |
| Site club neuf, hero | *(nom seul)* | Vitrine nue au moment du partage | Accroche par défaut modifiable (« Les inscriptions ouvrent bientôt. ») | Qualité perçue des sites générés |
| Nav publique | « Un club » | Libellé peu explicite pour un visiteur froid | « Voir un club » ou « Exemple de club » | Taux de clic vers la preuve |

**Questions du référentiel (Phase 6) sans réponse claire sur le site aujourd'hui :** « Qui est derrière Klubster ? » (réponse riche mais uniquement en bas de home — une page À propos aiderait), « Puis-je voir une démonstration ? » (la démo est « Un club », non nommée comme telle), « Combien de temps vais-je gagner ? » (implicite, jamais chiffré — un « ~4 h par semaine de secrétariat en moins » sourcé USM Boxe serait puissant), « Y a-t-il des frais cachés ? » (répondu, mais uniquement en petites lignes tarifs — mérite une ligne FAQ). Les 15 autres questions du référentiel trouvent une réponse claire — ratio remarquable.

---

## 12. RECOMMANDATIONS DESIGN & UX (détaillées)

| # | Emplacement | Problème | Principe | Correction | Priorité / Difficulté / Impact |
|---|---|---|---|---|---|
| D1 | Home & /fonctionnalites, photos | Rendu IA lisse (yoga) contredit la DA documentaire | Cohérence promesse/preuve | Vraies photos re-gradées (USM Boxe) | P1 / faible / fort |
| D2 | Site public club | Section vide « Où nous trouver_ » | Ne jamais montrer un état vide au public | Masquer si aucune donnée | P1 / faible / moyen |
| D3 | `/connexion` | Erreur silencieuse (`?erreur=confirmation`) | Feedback systématique | Bandeau d'état | P0 / faible / fort |
| D4 | Cockpit mobile | Rail nav horizontal sans affordance | Découvrabilité | Dégradé de bord / chevron | P2 / faible / moyen |
| D5 | Paiements, Cours | Cibles < 44 px | Fitts / tactile terrain | `py-3` min sur actions | P2 / faible / moyen |
| D6 | Wizard | Libellés d'étapes 9 px | Lisibilité mobile | 10-11 px | P2 / faible / faible |
| D7 | Liste adhérents | Ligne dont la zone cliquable est ambiguë (clic nom sans effet au 1er essai) | Affordance | Toute la ligne cliquable + hover | P2 / faible / moyen |
| D8 | PWA iOS | Pas de safe-areas avec status bar translucide | Robustesse installée | `viewport-fit=cover` + insets | P2 / moyen / moyen |
| ~~D9~~ | ~~Home~~ | ~~Hydration errors React~~ | **Annulé — faux positif, voir §5.3** | — | — |
| D10 | `/combat` | Pas de canonical/OG/sitemap | SEO & partage | Ajouter métadonnées | P1(campagne) / faible / moyen |

**À conserver explicitement** (ne pas « moderniser ») : radius 0, duo Inter/Space Mono, kickers `_`, photos re-gradées chaudes, structure chapitres I-VII, la retenue générale. C'est ce qui distingue Klubster d'un template SaaS — toute rondeur ajoutée diluerait la marque.

---

## 13. MATRICE IMPACT / EFFORT

**Quick wins (impact élevé, effort faible)** : P0-1 bandeau légal · P0-2 FAQ USM Boxe · message `?erreur=confirmation` · fallback email notification inscription · masquer section vide site public · nom d'affichage emails · libellé « Voir un club » · page /tarifs mince · métadonnées /combat.

**Priorités structurantes (impact élevé, effort moyen+)** : P0-3 persistance du brouillon + diagnostic PKCE · session président préservée après inscription test · analytics conformes + événements funnel · remplacement des photos IA · hydration errors · vrais clubs pilotes (preuve sociale).

**Améliorations secondaires (impact moyen, effort faible)** : cibles tactiles · rail cockpit mobile · accroche par défaut site neuf · 9 px → 11 px · page À propos.

**À reporter (impact faible ou effort élevé, hors campagne)** : multi-club par compte · vrai back-office /admin complet · versionnage du schéma (important mais invisible du client — à planifier, pas bloquant campagne) · safe-areas PWA.

---

## 14. PLAN D'ACTION AVANT COLD EMAILING

### P0 — Obligatoire avant le moindre envoi (~1 jour)

| ID | Problème | Action | Impact | Effort | Pages | Critère de validation |
|---|---|---|---|---|---|---|
| P0-1 | Bandeau « modèle de référence » | Supprimer sur les 5 pages légales | Confiance | 30 min | légales | Zéro occurrence en prod |
| P0-2 | FAQ dfsdfsdf | Vraies Q/R + titre corrigé dans le cockpit USM Boxe | Crédibilité démo | 15 min | /usmboxe | Relecture complète de la vitrine |
| P0-3 | Confirmation silencieuse + brouillon perdu | Message erreur/succès sur /connexion + fix callback + brouillon serveur (ou promesse reformulée) | Conversion funnel | 0,5-1 j | /connexion, /creer, /auth/callback | Parcours complet re-testé avec email neuf, brouillon intact |

### P1 — Avant une campagne importante (~1 semaine)

| ID | Problème | Action | Impact | Effort |
|---|---|---|---|---|
| P1-1 | Notification inscription absente sans email club | Fallback email président | Activation | 1 h |
| P1-2 | Session président écrasée | Préserver la session admin lors d'une inscription test | UX critique | 0,5 j |
| P1-3 | Zéro analytics | Plausible/Matomo + 4 événements (clic, compte, publication, abonnement) | Pilotage campagne | 0,5 j |
| P1-4 | Photos IA | Remplacer yoga (min.) par vraies photos | Crédibilité | 0,5 j |
| ~~P1-5~~ | ~~Hydration errors home~~ | **Annulé — faux positif, voir §5.3** | — | — |
| P1-6 | Section vide site public | Masquer chapitre sans données | Qualité perçue | 1 h |
| P1-7 | /tarifs dédiée + métadonnées /combat | Créer/compléter | Conversion campagne | 0,5 j |
| P1-8 | Preuve sociale | 2-3 clubs pilotes via PREM26, verbatims | Confiance | continu |

### P2 — Finitions premium (fil de l'eau)
Expéditeurs nommés · domaine auth custom · cibles tactiles · rail mobile · accroche par défaut · page À propos · safe-areas PWA · back-office admin réel · schéma versionné · politique multi-club.

---

## 15. SIMULATION COMMERCIALE FINALE

**« Si j'étais président d'une association et que je découvrais Klubster via un cold email, créerais-je un compte aujourd'hui ? »**

**Réponse : oui, probablement — si je ne vais pas vérifier les coins.** Probabilité estimée dans l'état actuel : **~25-30 %** de création de compte pour un visiteur réellement en recherche (référence marché : landing très au-dessus de la moyenne, mais crédibilité perforée par P0-1/P0-2) ; **~10-15 %** pour un visiteur méfiant qui inspecte la démo et le légal. Après correction des P0 : **~35-45 %** pour le premier profil. La probabilité de *publication* du club (vraie activation) est aujourd'hui plafonnée par P0-3.

Par profil (Phase 7) :
- **Président club sportif 80 adhérents** : le cœur de cible parfait. Convaincu par « 30 minutes », 9 €, 0 % commission. Bloqué éventuellement par « encore un outil » → l'essai sans CB lève le frein. Achat : élevé.
- **Trésorier 250 adhérents** : convaincu par la remise de chèques, les relances chiffrées, l'export. C'est LUI qui lira les CGV → P0-1 le concerne directement. Achat : moyen-élevé après P0.
- **Secrétaire bénévole peu technophile** : le wizard est à sa portée (testé : aucune compétence requise). Risque : l'accroc de confirmation la perd définitivement. Achat : moyen, très sensible au P0-3.
- **Dirigeant multi-outillé (AssoConnect/HelloAsso + Excel)** : sensible au 0 % commission vs HelloAsso « pourboire » et à l'export libre. Objection : ancienneté/pérennité de Klubster, migration → l'import CSV mappé répond en partie. Achat : moyen.
- **Responsable asso non sportive (théâtre, musique)** : le produit couvre (type « culturelle », chapitres génériques) mais tout le storytelling est sportif. Achat : faible-moyen — cible à adresser plus tard avec une landing dédiée, pas dans la première campagne.

**Élément décisif** universel : la démonstration par la preuve (« créez, c'est en ligne dans 30 minutes, premier mois offert, repartez avec vos données »). **Amélioration qui augmenterait le plus la probabilité :** corriger P0-3 puis afficher 2-3 clubs réels non liés au fondateur.

---

## 16. CHECKLIST GO / NO-GO

- [ ] **Produit** : cœur fonctionnel vérifié ✅ (fait, ce jour) — reste P0-3
- [ ] **Fonctionnalités** : pas de feature affichée non disponible ✅ (une seule promesse conditionnelle : domaine custom, actif en prod)
- [ ] **UX** : funnel création sans accroc ❌ (P0-3)
- [ ] **Mobile** : rien de cassé (audit code) ✅ / vérification visuelle sur vrai device ❌ à faire (10 min sur téléphone : home, wizard, cockpit, inscription)
- [ ] **Design** : cohérent ✅ — photo yoga à remplacer (P1)
- [ ] **Copywriting** : prêt ✅
- [ ] **Confiance** : bandeau légal retiré ❌ · démo nettoyée ❌ · validation juriste réelle ⏳
- [ ] **Onboarding** : Premiers pas ✅ · brouillon fiable ❌
- [ ] **Conversion** : page tarifs dédiée ⏳ · CTA ✅
- [ ] **Support** : contact@klubster.fr opérationnel ⏳ (vérifier que la boîte est relevée quotidiennement pendant la campagne)
- [ ] **Conformité** : pages complètes ✅ · validation juridique externe ⏳ (je ne me prononce pas juridiquement)
- [ ] **Mesure analytique** : ❌ (P1-3)
- [ ] **Préparation commerciale** : séquences Emelia prêtes ⏳ · clubs pilotes ⏳ · back-office de suivi ❌
- [ ] **Nettoyage** : supprimer le club test `clubtestauditklubster` + les 2 comptes `+audit` / `+adherent` ❗

---

## DÉCISION FINALE

**NO-GO TEMPORAIRE** — de très courte durée, et c'est une bonne nouvelle.

Le produit est réellement prêt : je l'ai utilisé de bout en bout comme un président d'association et il tient sa promesse mieux que sa propre page d'accueil ne le laisse espérer. Mais les trois défauts bloquants frappent exactement les trois points qu'un destinataire de cold email vérifie avant de faire confiance à une marque inconnue : la démo (dfsdfsdf), le légal (« à faire valider »), et le premier engagement (confirmation d'email muette + travail perdu). Envoyer 1 000 visiteurs qualifiés aujourd'hui, c'est en brûler une partie sur des défauts corrigeables en une journée — et ces contacts-là ne reviendront pas. Corrigez P0-1, P0-2, P0-3, re-testez le funnel avec un email neuf, puis lancez un **GO LIMITÉ** (200-300 envois, analytics en place) pour calibrer avant l'échelle. Rien dans cet audit ne justifie une refonte : le travail restant est du polissage, pas de la construction.

---

*Audit réalisé sans aucune modification du code, de la base ou des contenus. Données de test clairement identifiées, à supprimer après lecture (voir checklist).*
