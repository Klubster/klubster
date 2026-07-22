# Klubster — code source pour relecture externe

Généré le 22 juillet 2026. Ce document contient l'intégralité du code source applicatif de Klubster, tel qu'il est en production, plus les tests et les migrations de base de données. **C'est la troisième relecture** : les deux précédentes ont été intégralement traitées, et cet en-tête dit précisément ce qui a changé depuis, pour ne pas re-signaler du déjà-corrigé.

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

## Points ouverts, assumés — le contexte pour ne pas les compter deux fois

- **Aucun test offensif n'a jamais été mené.** Tout vient de relectures de code. Un regard sur les chemins d'attaque réels est ce qui manque le plus.
- **Le compte super-administrateur est une adresse Gmail personnelle** (2FA à confirmer). Ce compte voit la trésorerie de tous les clubs.
- **Turnstile ne protège que le formulaire d'inscription public.** `/creer` et `/connexion` reposent sur les limites de Supabase.
- **La limitation de débit anti-abus vit en mémoire** (`src/lib/antiabus.ts`), donc par instance serverless.
- **`getOrganisationBySlug` fait `select("*")`** : les identifiants Stripe opérationnels (`acct_`/`cus_`/`sub_`, non secrets) sortent en lecture publique. À restreindre à une liste de colonnes ou une vue.
- **Fichiers Storage orphelins** possibles au remplacement d'une pièce.
- Deux avis `moderate` sur un `postcss` embarqué dans Next lui-même, non actionnables.

## Couverture de tests

133 tests unitaires (`vitest`) sur `src/lib`, volontairement limités aux fonctions pures où un bug coûte de l'argent ou laisse fuir une donnée : rôles/permissions, validation des fichiers, questionnaire de santé (dont le comptage des réponses), composition des pages, tarification, mensualités, signature des webhooks, redirection après authentification. **Aucun test de bout en bout** : les parcours réels (base + horloges de test Stripe) ne sont pas couverts.

## Ce qui n'est pas dans cet export

`package-lock.json` (bruit), images et polices, documents internes (AIPD, registre des traitements), variables d'environnement. Le `.env.example` ne contient que des valeurs d'exemple. Les identifiants Supabase publics (URL et clé `anon`) apparaissent en dur comme valeurs de repli : **volontaire et sans risque**, la clé `anon` est de toute façon exposée au navigateur et la sécurité repose sur les RLS. Toute clé secrète trouvée dans cet export serait un incident — merci de le signaler immédiatement.
