# Klubster — code source pour relecture externe

Généré le 22 juillet 2026 (2ᵉ export du jour, après traitement du 4ᵉ audit). Ce document contient l'intégralité du code source applicatif de Klubster, tel qu'il est en production, plus les tests et les migrations de base de données. **C'est la cinquième relecture** : les quatre précédentes ont été intégralement traitées, et cet en-tête dit précisément ce qui a changé depuis, pour ne pas re-signaler du déjà-corrigé.

## Ce qu'est Klubster

Une plateforme SaaS multi-locataire pour associations et clubs sportifs français : site vitrine par club, inscriptions en ligne, dossiers d'adhérents, encaissement des cotisations, communication, application installable (PWA). Modèle économique : abonnement 9/19/29 € par mois selon l'effectif, **0 % de commission** sur les cotisations — l'argent va directement sur le compte Stripe du club.

Le produit est développé par une seule personne, non développeur de métier, président d'un club de boxe. Il est **en production** avec de vraies associations et de vraies données personnelles, et sur le point d'être commercialisé par email à froid auprès d'associations sportives.

## Architecture

- **Next.js 16.2.11** (App Router, Turbopack), **React 19**, TypeScript strict, Tailwind. Déployé sur Vercel, région `cdg1`. CI GitHub Actions : tests, build, typecheck, lint.
- **Supabase** : Postgres, Auth, Storage. Le cloisonnement entre clubs repose sur les politiques **RLS**, appuyées sur `current_org_id()` et `is_super_admin()` (`SECURITY DEFINER`). Les migrations `0006` et `0007` versionnent désormais l'état RÉEL des RLS, fonctions et droits d'exécution (auparavant seule une version simplifiée était committée).
- **Stripe Connect** en charges directes (`src/lib/stripe.ts`, REST sans SDK) pour les cotisations, Stripe Billing pour l'abonnement Klubster. Signature des webhooks vérifiée en HMAC maison, idempotence atomique.
- **Resend** pour les emails (REST, sans SDK). Gabarit HTML léger dans `src/lib/email-gabarit.ts`.
- Multi-locataire par `src/app/[asso]/` + `src/proxy.ts` (ex-`middleware.ts`, renommé par Next 16) qui réécrit les domaines personnalisés.
- Toutes les écritures passent par des Server Actions ou des Route Handlers. `src/lib/garde.ts` centralise les contrôles de permission serveur.
- **Tâche planifiée** `src/app/api/cron/relances/route.ts` (Vercel Cron quotidien, protégée par `CRON_SECRET`, `service_role`) : relances de pièces manquantes et d'impayés, récap hebdo, fin d'essai.

## Ce sur quoi la relecture est attendue, par ordre d'importance

1. **Sécurité, sans complaisance.** Fuite de données entre clubs, contournement des RLS, élévation de privilège intra-club, redirection ouverte, injection, dépôt de fichiers, contrôles d'accès manquants sur une Server Action ou un Route Handler, exécution de la tâche cron par un tiers. Données en jeu : **santé** (art. 9 RGPD) et **mineurs**.
2. **Fiabilité de l'argent.** Paliers d'abonnement, paiement en plusieurs fois, idempotence/rejeu des webhooks, cohérence test/production, recalcul serveur des montants, remises appliquées seulement après validation.
3. **Ce qui casse en production sans se voir.** Erreurs avalées, `redirect()` dans un `try`, états d'échec indiscernables d'un succès, relances qui partiraient à tort (harcèlement), promesses d'interface non tenues.
4. **Conformité RGPD** dans le code, pas seulement dans les mentions légales.

## Corrigé depuis la relecture précédente — inutile de re-signaler

La 2ᵉ relecture (verdict : GO pilotes / NO-GO campagne tant que 4 P0 non réglés) a été **entièrement traitée**, vérifications faites dans la vraie base de production :

- **Trésorerie & écriture de la fiche club** (migration `0003`) : les 4 actions de trésorerie passent sous garde `paiements` ; `connecterDomaine`/`deconnecterDomaine` sous `exigerPresident`. La policy RLS d'écriture sur `organisations` est restreinte aux rôles président/trésorier/secrétaire, et un **trigger** réserve les colonnes sensibles (Stripe, abonnement, domaine) au président — le contexte serveur (`service_role`, `SECURITY DEFINER`) est exempté par `auth.uid() is null`. (Constat vérifié : les RPC d'argent revérifiaient déjà le rôle dans leur corps ; le trou réel était l'écriture des réglages.)
- **Questionnaire de santé** : `resultatDepuisReponses(type, brut)` compte désormais le nombre de réponses attendues (un « non » seul ne vaut plus attestation), le type et la minorité sont dérivés serveur de la date de naissance, la case d'attestation est exigée.
- **Inscription des mineurs & champs obligatoires** revalidés côté serveur ; migration `0004` : `register_adherent_full` remplit enfin la colonne `date_naissance`.
- **Remises** : plus de réduction sur un code non vide ; elle est enregistrée « à valider par le club », l'adhérent paie plein tarif.
- **Turnstile** : les jetons `timeout-or-duplicate` sont refusés, un secret invalide est refusé en production.
- **Webhook Stripe** (migration `0005`) : verrou d'idempotence atomique `claim_stripe_event` (INSERT ON CONFLICT verrouillant, bail) ; les échecs d'écriture d'abonnement lèvent désormais (500 → rejeu Stripe).
- **Fin d'essai** (`accesClub`) : un club résilié/impayé au-delà de la grâce ne prend plus de nouvelles inscriptions (lecture/export conservés) ; jamais `aucun`.
- **RLS versionnées** (migrations `0006`, `0007`).

Corrigés lors des relectures antérieures (ne pas y revenir) : RPC exécutables anonymement, garde PL/pgSQL évaluée à `NULL`, redirection ouverte, contrôle d'accès des pièces adhérents, validation des fichiers par signature d'octets, confinement de la mesure d'audience aux pages marketing, montée Next 16 (avis `high` levés), bug de redirection post-connexion vers l'assistant de création.

## Nouveau depuis la relecture précédente — à relire à neuf

- **PWA à mise à jour silencieuse** : `src/app/sw.js/route.ts` (service worker, `skipWaiting`+`clients.claim`, navigations réseau d'abord, **HTML jamais mis en cache**), `src/components/site/PWAUpdater.tsx`, version = empreinte du build. Icônes PWA au logo du club (`src/app/[asso]/icone/route.tsx`).
- **Emails automatiques** : `src/app/api/cron/relances/route.ts`, `src/lib/emails-config.ts`, `src/lib/email-gabarit.ts`, page de réglages `src/app/[asso]/cockpit/emails/`. Garde-fou anti-harcèlement porté par la table `emails_journal` (un motif jamais renvoyé 2×, au plus une relance / 7 j par adhérent). **À vérifier en priorité** : la protection de la tâche cron (`CRON_SECRET`), et qu'aucune relance ne puisse partir à tort.
- **Codes promo** : `src/app/admin/codes/` + fonctions Stripe (`creerCodePromo`, `listerCodesPromo`, `basculerCodePromo`), réservé au super-admin.
- **Guide d'installation PWA** : `src/app/[asso]/installer/`.

## Corrigé lors du 3ᵉ audit (migrations 0008–0011) — vérifié en production

- **RLS par rôle** (migration 0008) sur adherents/adhesions/cours/reglements/pieces/presences : la lecture reste large pour l'équipe, mais l'ÉCRITURE est réservée au rôle métier (reglements → président/trésorier, cours/adhérents → président/secrétaire, présences → président/encadrant) ; la LECTURE des pièces (documents sensibles) est restreinte à président/secrétaire. Cela ferme le contournement de la matrice de rôles par appel PostgREST direct.
- **Trigger de protection de `profiles.role`/`organisation_id`** (migration 0009) — défense en profondeur (l'escalade n'était en réalité pas possible, `authenticated` n'ayant l'UPDATE que sur `nom`/`prenom`).
- **Emails automatiques** : réservation ATOMIQUE avant l'envoi (index unique), arrêt du cron si une lecture échoue, relances filtrées à la saison courante et aux statuts actifs, clubs suspendus exclus.
- **Redirection ouverte** fermée dans `auth/confirm` ET `auth/callback` (via `destinationSure`).
- **PWA sur domaine propre** : `/sw.js` hors réécriture, manifest adapté à l'hôte ; pas de rechargement pendant une saisie.
- **Journal d'emails** : FK `on delete set null` + effacement à l'anonymisation (migration 0010).

## Corrigé lors du 4ᵉ audit (migrations 0012–0016) — vérifié en production, inutile de re-signaler

Verdict du 4ᵉ audit : GO pilotes / NO-GO campagne massive tant que 6 points de lancement + les P1 non traités. **Tous traités**, chaque affirmation revérifiée dans le vrai code et la base de production avant correction ; tests offensifs PostgREST rejoués.

Les P0 (migrations 0012–0013) :
- **`pieces_adherent`** : l'UPDATE `authenticated` portait sur toutes les colonnes → un adhérent pouvait déplacer sa pièce vers un autre club. Désormais grants par colonne (`statut, chemin, updated_at` seulement) + triggers rendant `organisation_id/adherent_id/cle` immuables. (Sur `adherents`, le point était un faux positif : UPDATE déjà limité par colonnes à email/nom/prénom/téléphone.)
- **RPC webhook** (`enregistrer_reglement_webhook`, `enregistrer_remboursement_webhook`) : elles étaient exécutables par tout `authenticated` **sans contrôle interne** (conçues pour la `service_role`) → un adhérent pouvait se marquer « payé » ou s'inscrire un remboursement. Révoquées à `anon`/`authenticated`/`public`.
- **Questionnaire de santé** : rendu obligatoire côté serveur quand le club l'active, signature validée (image PNG base64), et enregistré dans la MÊME transaction que l'adhésion (`register_adherent_avec_sante`, rollback si le volet santé échoue).
- **Effacement RGPD** : `anonymiser_adherent` (SQL) ne touchait ni les fichiers Storage ni le compte Auth ; l'effacement se fait maintenant en trois couches vérifiées (fichiers `pieces/…`, anonymisation SQL, suppression `auth.users` si compte non partagé).
- **Échéancier Stripe** (`planifierEcheances`) rendu rejouable : court-circuit si déjà borné, reprise d'un échéancier existant, et **lève** si le prix est introuvable (au lieu d'un `return` silencieux laissant l'abonnement sans borne). 4 tests dédiés.
- **Snapshot de référence** (migration 0013) : 21 RPC métier + politiques `storage.objects` versionnées avec leurs `GRANT`/`REVOKE` explicites — la base est reconstructible et auditable de bout en bout.

Les P1 (migrations 0014–0016) :
- **Webhook** : helper `exiger()` sur toutes les écritures critiques (abonnement Klubster, résolution d'adhésion, vérification de compte, marquage `traité`, clôture de litige) → une panne de base ne se déguise plus en « rien à faire ».
- **Outbox emails** (0014) : `emails_journal` porte statut/bail/tentatives/id-fournisseur/période ; RPC atomiques `reserver_email`/`marquer_email_envoye`/`liberer_email`. Ferme le crash-avant-envoi (bail expiré → repris) et les doublons d'emails de club (unicité `organisation_id+motif+période`). Récap limité à la saison courante.
- **Validations d'inscription** : vraie date calendaire (`estDateNaissanceValide`, `2026-99-99` refusé, pas future), mot de passe ≥ 8, adresse, mode de paiement en liste blanche, et **rollback du compte Auth** si l'adhésion échoue après `signUp`.
- **PWA** : plus de rechargement sur `visibilitychange`/`pagehide` (changer d'onglet effaçait la saisie) ; détection élargie aux `select` et `contenteditable` ; la mise à jour s'applique à la navigation suivante.
- **Lecture publique des organisations** (0015) : `anon` perd `abonnement_customer_id`, `abonnement_subscription_id`, `emails_config` (grants par colonne) ; nouvelle `getOrganisationPubliqueBySlug` (colonnes de vitrine) pour les pages publiques, le cockpit garde l'accès complet en authentifié.
- **Effectif facturable unifié** : la console admin compte désormais les **adhérents** (comme le checkout et la RPC `palier_abonnement`), plus les adhésions.
- **Rétention + rate-limit** (0016) : `purger_emails_journal` (13 mois, documenté au registre RGPD), et limitation de débit **partagée entre instances** (table `rate_limit` + RPC atomique `incrementer_rate_limit`, repli mémoire), purges branchées sur le cron quotidien.
- **RGPD — lecture des dossiers par rôle** : choix **assumé et documenté** (registre des traitements, section « Habilitations internes au club ») plutôt qu'une refonte ; l'audit l'accepte si documenté. La lecture des données de santé et des pièces reste réservée au président et au secrétaire.

## Points ouverts, assumés — le contexte pour ne pas les compter deux fois

- **Aucun test offensif automatisé E2E n'a encore été mené.** Des attaques PostgREST directes ciblées ont été rejouées (colonnes de pièces, RPC financières, escalade de rôle, outbox) et passent, mais il n'y a pas de suite E2E complète (parcours réels avec horloges de test Stripe).
- **Le compte super-administrateur est une adresse Gmail personnelle** (2FA à activer — seul point de lancement encore ouvert, action hors code).
- **Turnstile ne protège que le formulaire d'inscription** ; `/creer` et `/connexion` reposent sur les limites Supabase et, désormais, le rate-limit distribué.
- Deux avis `moderate` sur un `postcss` embarqué dans Next lui-même, non actionnables.

## Couverture de tests

143 tests unitaires (`vitest`) sur `src/lib`, volontairement limités aux fonctions pures où un bug coûte de l'argent ou laisse fuir une donnée : rôles/permissions, validation des fichiers, questionnaire de santé (dont le comptage des réponses et la validité calendaire de la date de naissance), composition des pages, tarification, mensualités, **rejouabilité de l'échéancier Stripe**, signature des webhooks, redirection après authentification. **Aucun test de bout en bout** : les parcours réels (base + horloges de test Stripe) ne sont pas couverts.

## Ce qui n'est pas dans cet export

`package-lock.json` (bruit), images et polices, documents internes (AIPD, registre des traitements), variables d'environnement. Le `.env.example` ne contient que des valeurs d'exemple. Les identifiants Supabase publics (URL et clé `anon`) apparaissent en dur comme valeurs de repli : **volontaire et sans risque**, la clé `anon` est de toute façon exposée au navigateur et la sécurité repose sur les RLS. Toute clé secrète trouvée dans cet export serait un incident — merci de le signaler immédiatement.
