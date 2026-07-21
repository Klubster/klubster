# Klubster — code source pour relecture externe

Généré le 21 juillet 2026. Ce document contient l'intégralité du code source applicatif de Klubster, tel qu'il est en production, plus les tests et les migrations de base de données.

## Ce qu'est Klubster

Une plateforme SaaS multi-locataire pour associations et clubs sportifs français : site vitrine par club, inscriptions en ligne, dossiers d'adhérents, encaissement des cotisations, communication. Modèle économique : abonnement 9/19/29 € par mois selon l'effectif, **0 % de commission** sur les cotisations — l'argent va directement sur le compte Stripe du club.

Le produit est développé par une seule personne, non développeur de métier, président d'un club de boxe. Il est **en production** avec de vraies associations et de vraies données personnelles, et sur le point d'être commercialisé par email à froid auprès d'associations sportives.

## Architecture

- **Next.js 16.2.11** (App Router, Turbopack), **React 19**, TypeScript strict, Tailwind. Déployé sur Vercel, région `cdg1`.
- **Supabase** : Postgres, Auth, Storage. Le cloisonnement entre clubs repose **entièrement sur les politiques RLS**, appuyées sur deux fonctions `SECURITY DEFINER` : `current_org_id()` et `is_super_admin()`.
- **Stripe Connect** en charges directes (`src/lib/stripe.ts`, appels REST sans SDK) pour les cotisations, et Stripe Billing pour l'abonnement Klubster lui-même. Signature des webhooks vérifiée en HMAC maison.
- **Resend** pour les emails transactionnels (REST, sans SDK).
- Multi-locataire par le segment de route `src/app/[asso]/`, plus `src/proxy.ts` (ex-`middleware.ts`, renommé par Next 16) qui réécrit les domaines personnalisés des clubs.
- Les Server Actions Next portent toutes les écritures. `src/lib/garde.ts` centralise les contrôles de permission côté serveur.

## Ce sur quoi la relecture est attendue, par ordre d'importance

1. **Sécurité, sans complaisance.** Fuite de données entre clubs, contournement des RLS, élévation de privilège, redirection ouverte, injection, dépôt de fichiers, contrôles d'accès manquants sur une Server Action ou un Route Handler. Les données en jeu incluent des **données de santé** (art. 9 RGPD) et des identités de **mineurs**.
2. **Fiabilité de l'argent.** Paliers d'abonnement, paiement en plusieurs fois, idempotence et rejeu des webhooks, cohérence entre mode test et mode production, recalcul serveur des montants et des réductions.
3. **Ce qui casse en production sans se voir.** Erreurs avalées, `redirect()` dans un `try`, états d'échec indiscernables d'un succès, promesses d'interface non tenues.
4. **Conformité RGPD** dans le code, pas seulement dans les mentions légales.

## Points connus, déjà traités — inutile de les re-signaler

Les audits précédents ont conduit à corriger : des RPC exécutables anonymement (`EXECUTE` accordé à `PUBLIC` par défaut sur toute fonction Postgres), une garde PL/pgSQL qui s'évaluait à `NULL` et ne levait donc rien, une redirection ouverte après authentification, l'absence de contrôle d'accès sur les pièces jointes des adhérents, la vérification des fichiers déposés par signature d'octets plutôt que par extension, l'idempotence et la tolérance temporelle des webhooks Stripe, et le confinement de la mesure d'audience aux seules pages marketing.

## Points ouverts, assumés — le contexte pour ne pas les compter deux fois

- **Aucun test offensif n'a jamais été mené.** Tout ce qui précède vient de relectures de code. Un regard neuf sur les chemins d'attaque réels est précisément ce qui manque.
- **Le compte super-administrateur est une adresse Gmail personnelle** et rien ne garantit qu'une double authentification y soit active. Ce compte voit la trésorerie de tous les clubs.
- **Turnstile ne protège que le formulaire d'inscription public.** `/creer` et `/connexion` reposent uniquement sur les limites de Supabase, non testées.
- **La limitation de débit anti-abus vit en mémoire** (`src/lib/antiabus.ts`), donc par instance serverless. Elle freine un robot naïf, pas une attaque distribuée.
- **Les RLS n'ont pas été revérifiées après la montée en Next 16.**
- Deux avis `moderate` subsistent sur un `postcss` embarqué dans Next lui-même, non actionnables.
- La mesure d'audience (`src/components/site/Mesure.tsx`) est en cours d'arbitrage : le code présenté ici retire le bandeau de consentement, ce qui n'est défendable que si le dépôt de cookies est désactivé côté Microsoft Clarity. **Ce réglage n'est pas encore fait au moment de l'export.**

## Couverture de tests

130 tests unitaires (`vitest`) sur `src/lib`, volontairement limités aux fonctions pures où un bug coûte de l'argent ou laisse fuir une donnée : rôles et permissions, validation des fichiers déposés, questionnaire de santé, composition des pages, tarification et signature des webhooks, redirection après authentification. **Aucun test de bout en bout** : les parcours réels ne sont pas couverts.

## Ce qui n'est pas dans cet export

`package-lock.json` (bruit), les images et polices, les documents internes (AIPD, registre des traitements), et les variables d'environnement. Le fichier `.env.example` ne contient que des valeurs d'exemple. Les identifiants Supabase publics (URL et clé `anon`) apparaissent en dur comme valeurs de repli : **c'est volontaire et sans risque**, la clé `anon` est de toute façon exposée au navigateur et la sécurité repose sur les RLS. Toute clé secrète trouvée dans cet export serait en revanche un incident — merci de le signaler immédiatement.
