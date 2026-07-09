# Audit expert — Klubster
**Date :** 8 juillet 2026 · **Cible :** https://klubster.fr (prod, commit `8f48600`) + base Supabase `basnfuvdjobanejahayt` + code local
**Nature :** diagnostic indépendant. Aucun fichier modifié, aucun commit, aucune correction appliquée. Aucun test destructif.

---

## Résumé exécutif

### Note globale : **5,2 / 10**

Un produit dont la **façade est excellente** et dont les **fondations sont dangereuses**. La direction artistique est authentiquement au-dessus du marché ; la posture RGPD sur le papier est plus soignée que celle de la plupart des SaaS français ; le modèle économique est clair. Mais **la base de données est ouverte** : une personne mal intentionnée peut aujourd'hui, sans compte, marquer n'importe quelle cotisation comme payée et détruire des questionnaires de santé. Et **le site est inutilisable sur mobile** au sens de la navigation.

Ce n'est pas un produit à polir. C'est un produit à **sécuriser avant d'ouvrir la porte**.

| Axe | Note | Commentaire d'une ligne |
|---|---|---|
| Design | 8,0 | La DA tient ses promesses, y compris à l'œil d'un DA exigeant. |
| Marque | 8,0 | Le `_` est une vraie signature ; le lexique « club/association » la fissure. |
| UI | 7,0 | Sobre, cohérent, 0px assumé. Quelques états manquants. |
| UX | 5,5 | Le CTA principal débouche sur un mur de connexion. Contenu qui peut rester invisible. |
| Produit | 6,5 | Le périmètre est juste et le filtre « 18 h » est une bonne discipline. |
| Fonctionnalités | 6,5 | Réelles et non inventées — c'est rare, et c'est à ton crédit. |
| Offre | 7,0 | Lisible et honnête. Contredite par les CGV. |
| Conversion | 5,0 | Aucune preuve sociale, aucun essai, CTA → login. |
| Copywriting | 7,0 | Fort, mais parle aux clubs sportifs, pas aux associations. |
| Responsive | 4,0 | Pas de menu mobile. Du tout. |
| Accessibilité | 4,5 | Bonnes intentions (reduced-motion, focus) ruinées par les contrastes. |
| Performance | 3,5 | 2,4 Mo d'images non optimisées, LCP mesuré > 7 s. |
| SEO | 3,0 | Ni sitemap, ni robots, ni OG, ni canonical, ni JSON-LD. |
| **Sécurité** | **2,0** | **Deux failles critiques exploitables en production.** |
| Confiance | 4,0 | Contradiction CGV/tarifs, sous-traitant non déclaré. |

**Verdict sur la question posée.** Klubster est **beau, compréhensible et utile**. Il n'est **pas encore sûr**, **pas accessible**, **pas rapide**, et **pas commercialisable en l'état** — non pas à cause du produit, mais à cause de quatre ou cinq correctifs qui tiennent en une journée de travail. C'est une bonne nouvelle : rien de ce qui manque n'est structurel.

---

## 1 — Les 10 plus grandes forces

1. **La direction artistique est réelle, pas déclarative.** Vérifié à l'écran : le hero, la photo, l'échelle typographique, le silence. Elle soutient la comparaison avec les références citées sans les copier.
2. **Le `_` fonctionne comme signature de marque.** Il est appliqué avec discipline (labels, logo, fins de phrases-manifestes) et il est reconnaissable.
3. **Les montants de paiement sont recalculés côté serveur**, jamais transmis par le client (`stripe.ts:96-99`). C'est le bon réflexe, et beaucoup de SaaS échouent ici.
4. **Aucune donnée de santé détaillée n'est stockée.** Le questionnaire est évalué côté client, seul le résultat est persisté (`p_reponses: {}`). Minimisation RGPD authentique.
5. **Aucun `dangerouslySetInnerHTML` dans tout le code.** Surface XSS quasi nulle sur le contenu club.
6. **Le bucket `pieces` est privé** (vérifié en base) et les policies storage scopent les fichiers à l'adhérent propriétaire.
7. **La RLS est activée sur les 9 tables** `public`, avec des policies `same_org` + `self` cohérentes. L'architecture multi-tenant est bien pensée — c'est son *exposition* qui pose problème (§4).
8. **`prefers-reduced-motion` est respecté partout** : Reveal, Parallax, curseur clignotant, smooth scroll. Discipline rare.
9. **Aucune fonctionnalité inventée sur la home.** Chaque promesse des tarifs correspond à du code existant. La règle que tu t'es fixée a tenu.
10. **La `service_role` n'est jamais exposée** et n'est importée que côté serveur, dans le webhook.

---

## 2 — Les 10 problèmes les plus importants

Classés par gravité réelle, pas par facilité de correction.

| # | Problème | Prio | Effort |
|---|---|---|---|
| 1 | `enregistrer_reglement_webhook` appelable par n'importe qui → fausses cotisations payées | **P0** | XS |
| 2 | Garde d'autorisation contournée par la logique NULL dans 4 RPC | **P0** | S |
| 3 | `purger_questionnaires_sante()` appelable par `anon` → destruction de données | **P0** | XS |
| 4 | CGV (100/300 adhérents) contredisent les tarifs de la home (300/500) | **P0** | XS |
| 5 | `cockpit_stats(slug)` appelable par `anon` → trésorerie de tout club publié | **P1** | S |
| 6 | Webhook Stripe : ni idempotence, ni tolérance temporelle → rejeu, double comptage | **P1** | S |
| 7 | Aucun menu mobile : 4 liens de navigation inaccessibles sous 768 px | **P1** | M |
| 8 | 2,39 Mo d'images en `<img>` brut, LCP mesuré 7,4 s | **P1** | M |
| 9 | Le CTA « CRÉER MON ASSOCIATION » ouvre un formulaire de **connexion** | **P1** | S |
| 10 | Contrastes : le corps de texte de la home échoue WCAG AA (3,3:1) | **P1** | S |

---

## 3 — Incohérences et promesses non tenues

### I1 — Tarifs : la home et les CGV se contredisent
**PREUVE** — Home (`page.tsx:70-74`, vérifié à l'écran) : 9 € jusqu'à **300** adhérents ; 19 € de **301 à 500** ; 29 € **au-delà de 500**.
CGV (`cgv/page.tsx:18-20`) : *Starter* 9 € jusqu'à **100** ; *Club* 19 € de **101 à 300** ; *Club+* 29 € **au-delà de 300**.
**IMPACT** — Juridique et commercial. Un club de 250 adhérents paie 9 € selon la page de vente, 19 € selon le contrat opposable. Les CGV nomment trois offres (« Starter / Club / Club+ ») que la home nie explicitement (« Pas de version Pro. Pas d'options. »). Un prospect méfiant qui lit les CGV — c'est exactement le profil d'un trésorier — perd confiance.
**RECOMMANDATION** — Aligner les CGV sur la grille de la home et supprimer les noms d'offres.
**EFFORT** XS · **PRIORITÉ** P0 · **CONFIANCE** Élevé

### I2 — Le lexique promet « toutes les associations » et livre « les clubs sportifs »
**PREUVE** — H1 : « Toute votre **association** ». Ligne suivante : « Les **clubs** méritent mieux qu'un tableur. » Nav : « Un **club** ». Tarifs : « Le site de votre **club** ». Cockpit : « Le **club** est prêt. » Chapitre VIII : « Chaque association fonctionne différemment » mais liste **huit disciplines sportives** (« Sports de combat, Natation, Tennis… ») sans une seule association culturelle, musicale ou sociale.
**IMPACT** — Le trésorier d'une association culturelle, la secrétaire d'une école de musique et la responsable d'une association de danse — trois de tes sept personas — ne se reconnaissent pas. Sur une campagne de cold emailing envoyée à des associations non sportives, c'est un motif de rebond immédiat.
**RECOMMANDATION** — Choisir. Soit « association » partout (et élargir la liste des disciplines : chorale, théâtre, école de musique, danse, échecs, secours…), soit assumer le positionnement sportif et le dire dans le hero. La position actuelle est la seule qui ne marche pas : elle promet large et parle étroit.
**EFFORT** S · **PRIORITÉ** P1 · **CONFIANCE** Élevé

### I3 — Resend n'est pas déclaré comme sous-traitant
**PREUVE** — `/sous-traitance` art. 5 et `/confidentialite` art. 4 listent Supabase, Vercel, Stripe. Resend (envoi des emails d'authentification, des emails produit et de la messagerie clubs) n'apparaît nulle part. Vérifié : `grep -i resend` sur les deux pages → 0 résultat.
**IMPACT** — Liste des sous-traitants ultérieurs incomplète (art. 28.2 RGPD). Resend Inc. est une société américaine : cela fragilise aussi l'affirmation « données hébergées dans l'UE » de `/confidentialite`.
**RECOMMANDATION** — Ajouter Resend (finalité : envoi d'emails transactionnels ; localisation ; garanties). Nuancer la phrase sur l'UE : la base de données est en Irlande, l'hébergement applicatif (Vercel) et l'emailing (Resend) sont américains sous clauses contractuelles types.
**EFFORT** XS · **PRIORITÉ** P1 · **CONFIANCE** Élevé

### I4 — « Toutes les futures fonctionnalités, sans supplément »
**PREUVE** — `page.tsx`, liste « Dans toutes les offres ».
**IMPACT** — Engagement contractuel perpétuel et illimité, repris dans une liste de vente. Il t'interdit à vie de facturer un module coûteux (SMS, comptabilité, billetterie). Ce n'est pas une erreur factuelle, c'est un risque que tu prends peut-être sans l'avoir mesuré.
**RECOMMANDATION** — Soit assumer (c'est un argument fort), soit reformuler : « Les évolutions de Klubster sont incluses dans votre abonnement. »
**EFFORT** XS · **PRIORITÉ** P2 · **CONFIANCE** Moyen (interprétation juridique, non vérifiée par un avocat)

### I5 — `/cgu` existe mais n'est liée depuis nulle part
**PREUVE** — La page est déployée et indexable ; le footer liste Mentions légales, CGV, Confidentialité, Sous-traitance — pas les CGU.
**IMPACT** — Page orpheline, indexable, potentiellement contradictoire avec les CGV sans que personne ne la relise.
**EFFORT** XS · **PRIORITÉ** P3 · **CONFIANCE** Élevé

---

## 4 — Sécurité, par gravité

> Constats **vérifiés directement dans la base de production** (lecture seule, aucune exploitation, aucune donnée modifiée).
> Aucun secret n'est reproduit dans ce rapport.

### 🔴 V1 — CRITIQUE · N'importe qui peut marquer une cotisation comme payée

**PREUVE** — `enregistrer_reglement_webhook(p_adhesion_id, p_montant_centimes, p_note)` est `SECURITY DEFINER`, **ne contient aucun contrôle d'autorisation**, et le droit `EXECUTE` est accordé à `anon` **et** `authenticated` (vérifié : `has_function_privilege('anon', …) = true`). Elle est donc exposée sur `POST /rest/v1/rpc/enregistrer_reglement_webhook`, joignable avec la clé anonyme — qui est publique par conception et présente dans le bundle JavaScript du site.

**SCÉNARIO D'EXPLOITATION** — Un adhérent lit son propre `adhesion_id` (la policy `adhesions_self_read` le lui permet légitimement). Il appelle la RPC avec le montant de sa cotisation. La fonction insère un règlement `en_ligne` et passe son adhésion au statut `payé`. **Il vient de s'inscrire gratuitement.** Le trésorier voit une cotisation réglée dans les Encaissements ; l'argent n'est jamais arrivé sur le compte Stripe du club. La fraude n'apparaît qu'au rapprochement bancaire, s'il a lieu.

**DONNÉES / FONCTIONS CONCERNÉES** — `reglements`, `adhesions.statut`, toute la trésorerie de tous les clubs.

**CORRECTION** — `REVOKE EXECUTE ON FUNCTION public.enregistrer_reglement_webhook(uuid, integer, text) FROM anon, authenticated;` La fonction n'est appelée que par le webhook Stripe, qui utilise la `service_role` : elle n'a jamais eu besoin d'être exposée.

**EFFORT** XS · **PRIORITÉ** P0 · **CONFIANCE** Élevé

---

### 🔴 V2 — CRITIQUE · La garde d'autorisation de 4 RPC ne se déclenche jamais pour un adhérent

**PREUVE** — Les fonctions `enregistrer_reglement`, `marquer_encaisse`, `marquer_present` et `verifier_adherent` protègent leur accès ainsi :

```sql
if v_org is null or not (v_org = current_org_id() or is_super_admin()) then
  raise exception 'Non autorisé.';
end if;
```

`current_org_id()` retourne `select organisation_id from profiles where id = auth.uid()`. Pour un appelant `anon`, ou pour tout utilisateur dont le profil n'a pas d'organisation — **c'est le cas de tous les adhérents** —, elle retourne `NULL`.

Or en SQL, `uuid = NULL` vaut `NULL`, pas `false`. Donc :
`NULL or false` → `NULL` · `not NULL` → `NULL` · `false or NULL` → `NULL`.
Et en PL/pgSQL, **`if NULL then … end if` n'exécute pas la branche**. L'exception n'est jamais levée.

Vérifié par requête non destructive en production :

```
premier_terme = false · egalite = null · negation = null
condition_complete = null → comportement_plpgsql = "GARDE CONTOURNEE"
```

Vérifié également : **4 des 7 profils de la base ont `organisation_id` NULL**, et il n'existe aucun `super_admin`.

Ces fonctions étant `SECURITY DEFINER`, elles s'exécutent avec les droits du propriétaire et **contournent la RLS**. Les écritures aboutissent.

**SCÉNARIO D'EXPLOITATION** — Un adhérent connecté (ou un visiteur anonyme muni d'un UUID d'adhésion) appelle `enregistrer_reglement(adhesion_id, montant, 'especes')` : la garde ne se déclenche pas, un règlement en espèces est enregistré, l'adhésion passe à `payé`. Même mécanique pour `marquer_present` (fausser les présences), `marquer_encaisse` (marquer payé sans même de règlement) et `verifier_adherent` (lire nom, prénom, cours, statut de paiement et pièces manquantes de n'importe quel adhérent, de n'importe quel club).

**Nuance honnête :** l'attaque exige de connaître un UUID v4, non énumérable. Un adhérent connaît le sien légitimement — c'est le vecteur réaliste. Un attaquant externe sans UUID est bloqué en pratique. Cela ne réduit pas la gravité : le fraudeur type ici est un adhérent, pas un pirate.

**CORRECTION** — Deux gestes, les deux nécessaires :
1. Rendre la garde robuste au NULL : `if v_org is null or current_org_id() is null or not (v_org = current_org_id() or coalesce(is_super_admin(), false)) then raise exception …` — ou plus simplement `if coalesce(v_org = current_org_id(), false) = false and coalesce(is_super_admin(), false) = false then …`
2. `REVOKE EXECUTE … FROM anon` sur les fonctions qui n'ont aucune raison d'être publiques (`marquer_encaisse`, `marquer_present`, `verifier_adherent`, `enregistrer_reglement`, `purger_questionnaires_sante`).

**EFFORT** S · **PRIORITÉ** P0 · **CONFIANCE** Élevé (logique vérifiée en base ; exploitation non tentée)

---

### 🔴 V3 — CRITIQUE · Un visiteur anonyme peut détruire les questionnaires de santé

**PREUVE** — `purger_questionnaires_sante()` est `SECURITY DEFINER`, sans aucun contrôle d'appelant, et `EXECUTE` est accordé à `anon`. Elle exécute `delete from questionnaires_sante where created_at < <début de saison>`.

**SCÉNARIO** — Un appel HTTP anonyme sur `/rest/v1/rpc/purger_questionnaires_sante` supprime définitivement, pour **tous les clubs**, les questionnaires de santé antérieurs au 1er septembre. Destruction de données, incluant les signatures. Elle est censée n'être appelée que par `pg_cron`.

**CORRECTION** — `REVOKE EXECUTE ON FUNCTION public.purger_questionnaires_sante() FROM anon, authenticated;` (le job `pg_cron` s'exécute en interne et n'est pas affecté).
**EFFORT** XS · **PRIORITÉ** P0 · **CONFIANCE** Élevé

---

### 🟠 V4 — ÉLEVÉ · La trésorerie de n'importe quel club est publique

**PREUVE** — `cockpit_stats(p_slug text)` est `SECURITY DEFINER`, exécutable par `anon`, et ne vérifie pas que l'appelant appartient au club interrogé. Elle prend un **slug**, qui est visible dans l'URL de chaque vitrine (`klubster.fr/usmboxe`).

**SCÉNARIO** — `POST /rest/v1/rpc/cockpit_stats {"p_slug":"usmboxe"}` retourne l'effectif, le nombre d'adhésions en attente, en retard, payées, et **le total encaissé en centimes**. Un concurrent, un journaliste ou un club rival lit la santé financière de tout club publié.

**CORRECTION** — Contrôler que `p_slug` correspond à `current_org_id()` (ou à `is_super_admin()`), et révoquer `EXECUTE` à `anon`.
**EFFORT** S · **PRIORITÉ** P1 · **CONFIANCE** Élevé

---

### 🟠 V5 — ÉLEVÉ · Webhook Stripe : rejouable et non idempotent

**PREUVE** — `src/app/api/stripe/webhook/route.ts` : aucun suivi des `event.id` déjà traités. `src/lib/stripe.ts:191-208` : la vérification de signature recalcule correctement le HMAC-SHA256 avec `timingSafeEqual`, mais **ne compare jamais l'horodatage `t` à l'heure courante**.

**SCÉNARIO** — (a) Stripe redélivre nativement les événements en cas de timeout : un `checkout.session.completed` rejoué appelle deux fois `enregistrer_reglement_webhook` → cotisation comptée en double. (b) Un payload signé capturé reste valide indéfiniment et peut être rejoué à volonté.

**CORRECTION** — Table `stripe_events(event_id primary key)` + `insert … on conflict do nothing` en tête de handler ; rejeter les signatures dont l'horodatage s'écarte de plus de 300 s ; ou simplement utiliser `stripe.webhooks.constructEvent()` du SDK, qui gère les deux.
**EFFORT** S · **PRIORITÉ** P1 · **CONFIANCE** Élevé

---

### 🟠 V6 — ÉLEVÉ · `enregistrer_questionnaire_sante` accepte n'importe quelle adhésion

**PREUVE** — `SECURITY DEFINER`, exécutable par `anon` (nécessaire : le questionnaire est signé pendant l'inscription publique), mais elle ne vérifie **pas** que l'appelant est lié à `p_adhesion_id`. Elle insère un questionnaire de santé — donnée de l'article 9 RGPD — et une signature, pour l'adhésion qu'on lui désigne.

**SCÉNARIO** — Insertion de faux questionnaires signés au nom d'un tiers ; ou pollution de la table pour un club donné.
**CORRECTION** — Lier l'appel à un jeton d'inscription à usage unique émis à la création de l'adhésion, ou vérifier `auth.uid()` contre `adherents.user_id` de l'adhésion.
**EFFORT** M · **PRIORITÉ** P1 · **CONFIANCE** Élevé

---

### 🟡 V7 — MOYEN · `/admin` n'est pas protégée

**PREUVE** — `src/app/admin/page.tsx:18` : commentaire « authentification : jalon suivant ». Aucun contrôle. La page n'affiche aujourd'hui que des données statiques — **l'impact réel est nul pour l'instant**. Mais elle est destinée à lister toutes les associations et la facturation.
**CORRECTION** — Poser la garde `is_super_admin()` **maintenant**, avant tout branchement de données.
**EFFORT** XS · **PRIORITÉ** P1 · **CONFIANCE** Élevé

### 🟡 V8 — MOYEN · Redirection ouverte après connexion
`connexion/actions.ts:23` : `redirect(input.next || "/creer")` sans valider que `next` est un chemin relatif. `/(…)/connexion?next=https://exemple-malveillant.fr` renvoie l'utilisateur fraîchement authentifié vers un domaine externe — vecteur classique de hameçonnage.
**CORRECTION** — N'accepter `next` que s'il commence par `/` et pas par `//`. **EFFORT** XS · **PRIORITÉ** P2

### 🟡 V9 — MOYEN · Inscription publique sans limitation de débit ni CAPTCHA
`[asso]/inscription/actions.ts` : chaque soumission déclenche un `auth.signUp` (email de confirmation vers une adresse arbitraire) + un email à l'adhérent + un email au club. Aucun `ratelimit|captcha|turnstile` dans le code.
**SCÉNARIO** — Bombardement d'une victime par email ; ou épuisement du quota Resend (100/jour en plan Free) pour couper la messagerie légitime de tous les clubs.
**CORRECTION** — Turnstile ou hCaptcha + limitation par IP et par slug. **EFFORT** M · **PRIORITÉ** P1

### 🟢 V10 — FAIBLE
- Protection contre les mots de passe compromis (HaveIBeenPwned) **désactivée** dans Supabase Auth. Activation en un clic.
- Buckets publics `logos`, `sections`, `actualites` : la policy SELECT large autorise le **listing** de tous les fichiers, pas seulement leur lecture par URL.
- Identifiants d'infrastructure (project-ref Supabase, clé anonyme, team-id Vercel) codés en dur comme valeurs de repli. Ce ne sont pas des secrets, mais ces replis masquent une mauvaise configuration d'environnement.
- Cache `Map` non borné dans le middleware, indexé par `Host` (croissance mémoire par instance, TTL 60 s).

### Ce qui a été vérifié et s'est révélé **sain**
- Le bucket `pieces` est **privé** (`public = false`), et `pieces_member_rw` scope les fichiers à l'adhérent propriétaire par son UUID. Les certificats et pièces d'identité ne sont pas exposés.
- RLS active sur les 9 tables `public`, avec `same_org` + `self`.
- `create_club` exige bien `auth.uid()` (`raise exception 'Authentification requise'`).
- `register_adherent_full` filtre correctement le cours par organisation (`where id = p_cours_id and organisation_id = v_org`) : le tarif ne peut pas être croisé entre clubs.
- Montants de checkout recalculés serveur.
- Aucune injection SQL ni XSS trouvée.

---

## 5 — Corrections rapides à fort impact

Par ordre de rapport impact/effort décroissant. **Aucune n'a été appliquée.**

1. **`REVOKE EXECUTE` sur 5 RPC** (`enregistrer_reglement_webhook`, `purger_questionnaires_sante`, `marquer_encaisse`, `marquer_present`, `verifier_adherent`) → neutralise V1, V3, et l'essentiel de V2. *Une migration SQL, 10 lignes.* **P0**
2. **Corriger la garde NULL** dans les 4 RPC (V2). *Une migration.* **P0**
3. **Aligner les CGV sur les tarifs de la home** (I1). *Trois lignes de JSX.* **P0**
4. **Ajouter Resend aux sous-traitants** (I3). *Un paragraphe.* **P1**
5. **`fetchpriority="high"` sur le hero, `loading="lazy"` sur les 5 autres photos.** Gain LCP immédiat sans toucher à `Parallax`. **P1**
6. **Foncer `--k-ink-soft`** de `#8C8C88` vers `#6f6f6b` (valeur déjà utilisée, et validée, dans les pages légales) → fait passer le corps de la home en AA. **P1**
7. **Ouvrir `/connexion?next=/creer` sur l'onglet « Créer un compte »** quand `next=/creer`. *Une condition.* **P1**
8. **Activer la protection contre les mots de passe compromis** dans Supabase. *Un clic.* **P2**

---

## 6 — Analyse détaillée

### 6.1 — La home, section par section

**Compréhension en 5 secondes** — Réussie. Le H1 « Toute votre association, au même endroit », le sous-titre et « Prêt en moins de 30 minutes_ » disent quoi, pour qui, et en combien de temps. C'est meilleur que 90 % des landings SaaS françaises.

**Ce qui manque au-dessus de la ligne de flottaison** — Rien à ajouter. La tentation d'y remettre les fonctionnalités doit être écartée : le résumé d'une phrase, juste sous le hero, fait ce travail.

**Hero** — Excellent. Une réserve : le sous-titre « Les **clubs** méritent mieux qu'un tableur » contredit le H1 « association » à trois centimètres d'écart. C'est le point exact où le positionnement se fissure (cf. I2).

**I — POURQUOI_** — Fort. Le manifeste (« Un club, ce n'est pas une base de données ») est mémorable. Garder.

**II — LES CLUBS_** — Bon. La double-page fonctionne. Le titre de section trahit encore le lexique.

**III — SUR LE TERRAIN_ + NOTES DE TERRAIN_** — **La meilleure section de la page.** C'est la seule preuve de légitimité, et elle est réelle (« Développé et utilisé chaque semaine à l'USM Boxe »). Elle porte plus de conviction que n'importe quel témoignage.

**IV — UNE DEMI-HEURE_** — Bon. Les quatre étapes correspondent au vrai wizard. La chute (« Vous ne configurez pas un logiciel. Vous ouvrez votre club_ ») est la meilleure phrase de la page.

**V — AUJOURD'HUI_ / le cockpit** — La maquette est fidèle au produit et bien traitée en planche. **Problème vérifié :** elle contient « BONSOIR, **MATHIEU** · MERCREDI 4 SEPTEMBRE_ ». Le visiteur voit ton prénom, pas le sien. Substituer un prénom neutre ou générique.

**VI — PENDANT CE TEMPS_** — Excellente. Elle démontre une fonctionnalité sans jamais nommer une fonctionnalité. C'est le modèle à suivre pour le reste.

**VII — QUAND LE CLUB OUVRE_** — La section contemplative introduite ce matin fonctionne mieux que le AVANT/AVEC qu'elle remplace. Elle est cependant la **troisième** respiration consécutive sans information nouvelle (VI → VII → QUI FAIT KLUBSTER). C'est le point où un prospect pressé décroche.

**QUI FAIT KLUBSTER_** — La scène fondatrice est nettement supérieure au CV précédent. Garder.

**VIII — LES DISCIPLINES_** — **Section la plus faible.** Le titre promet « chaque association » et la liste ne cite que du sport. Elle dit donc exactement l'inverse de son intention. À corriger ou à supprimer.

**IX — UNE SAISON_** — Jolie, sans information neuve. Je la garderais **uniquement** pour son rôle d'atterrissage après la photo de fin de saison. C'est un choix de silhouette, pas de contenu — et donc un choix légitime.

**X — TARIFS_** — Très réussie. Lisible, honnête, la logique « le prix suit la taille » est immédiatement comprise. **Deux réserves :** (a) contredite par les CGV ; (b) la mention des frais Stripe est en `ink-faint` (contraste **1,7:1**) — une information contractuelle en texte quasi illisible ressemble à une dissimulation, même quand l'intention est inverse.

**CTA final** — Correct mais générique. Il ne réactive ni la preuve (USM Boxe), ni l'absence d'engagement, ni la gratuité de l'essai (qui n'existe pas — voir §6.4).

**Footer** — Sobre et juste. « Développé à Montauban » est un excellent détail de confiance.

### 6.2 — Direction artistique (silhouette et détail)

Le test de la silhouette n'a **pas pu être conduit par mise à l'échelle** : les hauteurs en `vh` et les images en `absolute inset-0` s'effondrent sous `zoom`. Il a été remplacé par des captures successives.

Ce qu'elles montrent : l'alternance photo / texte / photo est **régulière** — c'est précisément le grief formulé hier. Les respirations sont homogènes plutôt que contrastées. Une page de magazine alterne des pages denses et des pages presque vides ; ici tout respire pareil. **Mais** : ce n'est pas un problème mesurable, c'est une préférence de composition, et la version actuelle est celle que tu préfères après avoir testé l'autre. Je ne recommande **aucune modification d'espacement**. Le problème n'est pas là.

Détails vérifiés :
- Le vert `#279B65` est employé conformément à la règle (détail graphique, jamais en aplat). ✅
- Deux voix typographiques tenues, aucun serif. ✅
- 0px partout, aucune ombre. ✅
- Le grand `k_` n'apparaît qu'une fois. ✅
- **Rien ne « sent l'IA »** dans la mise en page. Les photos re-gradées tiennent le niveau annoncé.

Le seul défaut visuel réel est un **défaut technique** : les photos sont servies à 1536 px de large quel que soit l'écran, non converties, non prioritaires. La DA est freinée par sa propre livraison.

### 6.3 — UI / UX : ce qui a été réellement testé

> ### ⚠️ Rectificatif (8 juillet, après correctifs)
> Le constat ci-dessous a été **partiellement infirmé**. Ma « reproduction » utilisait `window.scrollTo()`
> injecté par outillage : dans ce contexte, les callbacks d'`IntersectionObserver` n'étaient pas délivrés,
> ce qui produisait 13 blocs invisibles. **Avec un vrai scroll molette, l'observateur fonctionne** et la page
> se révèle normalement. Le scénario « page avec des trous blancs » n'est **pas** confirmé.
> Ce qui reste vrai : un bloc situé au-dessus du viewport au moment de l'hydratation (scroll restauré)
> n'est jamais « vu entrer » et reste masqué jusqu'à ce qu'on remonte. Le correctif appliqué
> (révélation immédiate si `rect.top < innerHeight`, plus repli si `IntersectionObserver` est absent)
> couvre ce cas. **Sévérité réelle : faible, pas P1.** Je maintiens la correction, pas le diagnostic.

#### Un bug confirmé : du contenu peut rester invisible pour toujours

**PREUVE** — Le composant `Reveal` (`Reveal.tsx:28-37`) initialise un `IntersectionObserver` après hydratation et ne révèle un bloc **que s'il entre dans le viewport à ce moment ou après**. Il n'existe aucun repli.

Test conduit : chargement de `https://klubster.fr/`, puis saut direct à `scrollY = 6000` avant hydratation, attente de 3 secondes. Résultat mesuré :

```
scrollY 6000 · viewport [6000, 6625]
blocs révélés : 0 / 13
blocs invisibles au-dessus du viewport : 7
```

Les 7 blocs situés plus haut ne se révéleront **jamais**, quel que soit le scroll ultérieur : l'observateur ne les a jamais vus entrer.

**IMPACT** — Cela se produit dans la vraie vie à chaque fois que le navigateur restaure une position de scroll : rechargement (F5) au milieu de la page, retour arrière depuis `/creer`, restauration d'onglet après redémarrage, partage d'un lien avec ancre. L'utilisateur voit alors une page **avec des trous blancs**. Sur un site dont l'argument est le soin apporté au détail, c'est le pire symptôme possible.

**RECOMMANDATION** — Trois lignes : au montage, si `el.getBoundingClientRect().top < window.innerHeight`, appeler `setShown(true)` immédiatement. Et prévoir un repli si `IntersectionObserver` n'existe pas.
**EFFORT** XS · **PRIORITÉ** **P1** · **CONFIANCE** Élevé (reproduit)

#### Le CTA principal mène à un mur de connexion

**PREUVE** — Clic sur « CRÉER MON ASSOCIATION » → `302` vers `/connexion?next=/creer`. La page s'ouvre sur l'onglet **« SE CONNECTER »** actif, avec un bouton grisé, deux champs, et une phrase en gris pâle : « Pas encore de club ? Créez un compte. »

**IMPACT** — Conversion. Le visiteur a cliqué « créer », il reçoit « se connecter ». Aucune réassurance (« gratuit », « sans carte bancaire », « 30 minutes »), aucun rappel du contexte, aucun retour visuel vers la home. Pour une campagne de cold emailing dont c'est le point d'atterrissage final, c'est la fuite la plus coûteuse de tout l'entonnoir.

**RECOMMANDATION** — Quand `next=/creer`, ouvrir l'onglet « Créer un compte », titrer la page « Créez votre association », et rappeler les trois réassurances. **EFFORT** S · **PRIORITÉ** P1

#### Aucun menu mobile

**PREUVE** — `header nav` porte `hidden … md:flex`. Aucun `<button>`, aucun `aria-expanded`, aucun `aria-controls` dans le header (vérifié dans le DOM rendu). Sous 768 px, les liens « Le cockpit », « Disciplines », « Tarifs » et **« Un club »** (le seul lien vers une démo réelle) disparaissent, sans aucun remplacement.

**IMPACT** — Une landing grand public reçoit la majorité de son trafic sur mobile. La seule démonstration vivante du produit y est inaccessible. Même schéma sur la vitrine club (`SiteHeader.tsx`).
**EFFORT** M · **PRIORITÉ** **P1** · **CONFIANCE** Élevé

#### Accessibilité : contrastes

Ratios calculés sur le papier `#FCFCFA` :

| Couleur | Usage réel | Ratio | AA (4,5:1) |
|---|---|---|---|
| `#111111` | corps principal | 18,5:1 | ✅ |
| `#8C8C88` (`ink-soft`) | **paragraphes de la home, 18 px** | ≈3,3:1 | ❌ |
| `#C2C2BD` (`ink-faint`) | frais Stripe, « Testé à l'USM », © | ≈1,7:1 | ❌❌ |
| `#279B65` sur papier | labels 11 px, ✓, chiffres romains | ≈3,4:1 | ❌ |
| blanc sur `#279B65` | texte des boutons CTA | ≈3,5:1 | ❌ |

Le paradoxe : les pages légales (`#6f6f6b`, 4,9:1) sont **conformes**, la page de vente ne l'est pas.
**RECOMMANDATION** — Remonter `ink-soft` à `#6f6f6b`. Réserver `ink-faint` au décoratif pur — jamais pour une mention tarifaire. Utiliser un vert plus foncé (`#1E7A4F`, ≈5,0:1) dès qu'il porte du texte.
**EFFORT** S · **PRIORITÉ** P1 · **CONFIANCE** Élevé (ratios calculés)

**Points d'accessibilité réussis :** `focus-visible` net et contrasté ; landmarks complets (`main`, `header`, `nav`, `footer`) ; `lang="fr"` ; un seul `H1` ; hiérarchie `H1→H2` sans saut ; textes alternatifs narratifs ; `prefers-reduced-motion` respecté par **toutes** les animations, y compris le curseur clignotant.

**Réserve WCAG 2.2.2 :** le curseur `_` clignote indéfiniment pour les utilisateurs n'ayant pas activé la réduction de mouvement, à plusieurs endroits simultanément. Le critère demande un mécanisme d'arrêt pour tous. Risque faible (fréquence < 3 Hz, donc pas de risque photosensible), mais réel pour les troubles attentionnels.

### 6.4 — Offre et conversion

**Ce qui marche.** Trois paliers, une seule colonne de fonctionnalités, « tout est inclus » : c'est la structure la plus lisible possible. « 0 % de commission » est un argument différenciant fort, vrai, et vérifiable dans le code. La transparence sur les frais Stripe inspire confiance — à condition de la rendre lisible.

**Le prix est-il trop bas ?** 9 € par mois pour 300 adhérents, soit 0,03 € par adhérent, contre des concurrents facturant souvent 30 à 100 € par mois. Le risque n'est pas que ce soit invendable ; c'est que le prix **signale un produit amateur** au trésorier prudent. Ce risque est aujourd'hui **non compensé**, car :

- il n'y a **aucune preuve sociale** (un seul club, le tien) ;
- il n'y a **aucun essai gratuit** annoncé, ni période de découverte ;
- il n'y a **aucune démonstration accessible depuis mobile** (le lien « Un club » y est masqué) ;
- il n'y a **aucune réponse aux objections** : reprise des données existantes, export, que devient mon site si j'arrête, qui héberge mes données, suis-je conforme RGPD.

**Objections non traitées, par ordre de fréquence probable :**
1. « Et si j'arrête ? Je récupère mes adhérents ? » → aucun export mentionné (il existe pourtant, en CSV, dans les Encaissements).
2. « Je suis déjà sur AssoConnect / un tableur. Comment je migre ? » → aucune réponse.
3. « Qui êtes-vous ? » → bien traité par la scène fondatrice.
4. « C'est conforme RGPD ? » → excellemment traité… dans les pages légales, que personne ne lit. Rien sur la home.
5. « Ça marche pour une chorale ? » → la page dit non, sans le vouloir (cf. I2).

**Recommandation de conversion la plus rentable** — Pas un nouveau CTA, pas une nouvelle section : **rendre la démo atteignable**. Le lien « Un club » vers `/usmboxe` est la meilleure preuve que possède Klubster, et il est invisible pour la moitié des visiteurs.

### 6.5 — Ce qui n'a **pas** pu être testé, et pourquoi

Par honnêteté, et conformément à ta consigne :

| Parcours | Statut | Raison |
|---|---|---|
| Création de compte + club de bout en bout | **Non testé** | Nécessite la confirmation d'un email réel ; le renderer Chrome s'est figé (page lourde, timeout CDP 45 s). Priorité réaffectée à la vérification des failles P0 découvertes en cours de route. |
| Mode Modifier, réorganisation et ajout de sections | **Non testé** | Requiert un compte administrateur d'association. |
| Inscription d'un adhérent, parcours mineur, upload de pièce, questionnaire | **Non testé** en conditions réelles | Requiert un club de test publié. Le **code** de ces parcours a été lu et audité (voir V6, et la minimisation des données de santé). |
| Paiement 1× et 3×, checkout Stripe | **Non testé** | Interdit par le périmètre convenu (pas de paiement en ligne). |
| Encaissements, relance, scan QR, présences, actualité, messagerie | **Non testé** | Requiert un compte. Code audité. |
| Cockpit Aujourd'hui_ réel | **Non testé** | Idem. Sa représentation sur la home est fidèle au code. |
| Emails transactionnels | **Non testé** | Aucun envoi déclenché. |
| Poids réel des images après compression HTTP | **Non vérifié** | Requêtes bloquées par la politique réseau de l'atelier. Les tailles indiquées (2,39 Mo) sont celles des fichiers sources de `public/`, servis tels quels puisqu'ils ne passent pas par `next/image`. |

**La promesse « Prêt en moins de 30 minutes » n'a donc pas été vérifiée**, ni infirmée. Le wizard comporte quatre étapes réelles et la RPC `create_club` crée l'organisation et les cours en une transaction : la promesse est **plausible**. Elle mérite d'être chronométrée une fois, pour de vrai.

**La promesse « l'état de votre association en trois secondes »** est tenue au niveau du *design* (phrase d'état, checklist), mais `cockpit_stats` — la fonction qui l'alimente — est celle qui fuit publiquement (V4).

---

## 7 — Corrections de copywriting

> Uniquement les modifications où le problème est démontrable. Rien de cosmétique.

**1.**
**AVANT :** *Toute votre association, au même endroit.* / *Les clubs méritent mieux qu'un tableur.*
**APRÈS :** *Toute votre association, au même endroit.* / *Les associations méritent mieux qu'un tableur.*
**POURQUOI :** Le H1 et le sous-titre se contredisent en deux lignes. Cible élargie annoncée, cible étroite énoncée.
**PRIORITÉ :** importante

**2.**
**AVANT :** *Sports de combat · Arts martiaux · Natation · Tennis · Sports collectifs · Danse · Gymnastique · Fitness*
**APRÈS :** *Sports de combat · Danse · Musique · Théâtre · Natation · Sports collectifs · Arts martiaux · Loisirs créatifs*
**POURQUOI :** Sous un titre « Chaque association fonctionne différemment », huit disciplines sportives disent au trésorier d'une chorale que ce produit n'est pas pour lui. C'est la contradiction la plus coûteuse de la page.
**PRIORITÉ :** critique

**3.**
**AVANT :** *BONSOIR, MATHIEU · MERCREDI 4 SEPTEMBRE_* (maquette du cockpit)
**APRÈS :** *BONSOIR, CLAIRE · MERCREDI 4 SEPTEMBRE_*
**POURQUOI :** Le visiteur doit se projeter dans son propre cockpit, pas regarder le tien. Un prénom féminin élargit en outre la projection, les bureaux d'association n'étant pas majoritairement masculins.
**PRIORITÉ :** importante

**4.**
**AVANT :** *Changez d'offre à tout moment. Aucun engagement. Les paiements Stripe (1,5 % + 0,25 €) sont facturés directement par Stripe.* — en `ink-faint`, contraste 1,7:1.
**APRÈS :** Même texte, en `ink-soft` corrigé (`#6f6f6b`).
**POURQUOI :** Une information contractuelle rendue quasi illisible produit l'effet inverse de l'honnêteté recherchée. Ce n'est pas un problème de mots, c'est un problème de contraste — mais il porte sur du copy.
**PRIORITÉ :** importante

**5.**
**AVANT :** *Toutes les futures fonctionnalités, sans supplément*
**APRÈS :** *Les évolutions de Klubster, incluses dans votre abonnement*
**POURQUOI :** La première formule est un engagement perpétuel illimité. La seconde dit la même chose au prospect et te laisse une marge.
**PRIORITÉ :** amélioration

**6.**
**AVANT :** *Pas encore de club ? Créez un compte.* (page de connexion, en gris pâle)
**APRÈS :** *Créez votre association — gratuitement, en moins de 30 minutes.*
**POURQUOI :** C'est le dernier écran avant la conversion, et le seul où la promesse de la marque a disparu.
**PRIORITÉ :** critique

**7. Section VIII, titre.**
**AVANT :** *Chaque association fonctionne différemment.* / *Klubster s'adapte à la vôtre.*
**APRÈS :** Conserver — à condition d'appliquer la correction n°2. Sinon, supprimer la section entière.
**POURQUOI :** Le titre est juste ; c'est son contenu qui le dément.
**PRIORITÉ :** importante

---

## 8 — Idées à **ne pas** faire

Chacune détruirait la promesse des 30 minutes ou la simplicité pour un bénévole.

| Idée | Pourquoi non |
|---|---|
| Un vrai tableau de bord analytique (graphiques, cohortes, rétention) | Échoue au filtre « 18 h ». Personne n'ouvre un graphique avant d'ouvrir la salle. |
| Multi-utilisateur avec rôles fins (bureau, entraîneurs, secrétaire) | Coût de conception élevé, complexité immédiate à la création du club. À reconsidérer seulement si des clubs le demandent deux fois. |
| Module de comptabilité / export FEC | C'est un autre produit. Un export CSV suffit à 95 % des associations. |
| Application mobile native | La PWA par club existe déjà et fait le travail. |
| Génération de pages par IA | Les six templates de design couvrent le besoin ; l'IA ajouterait une étape au wizard. |
| Notifications push, tâches, gestion des bénévoles | Trois manières d'ajouter du temps d'écran à des gens qui en ont déjà trop. |
| Refondre le rythme vertical de la home | Testé hier soir, annulé ce matin. Le problème n'est pas là — il est dans les images, les contrastes et le mobile. |

---

## 9 — Roadmap

### P0 — Avant toute ouverture publique
*Aucune association réelle ne doit entrer avant que ces quatre points soient réglés.*

1. `REVOKE EXECUTE` de `anon`/`authenticated` sur `enregistrer_reglement_webhook`, `purger_questionnaires_sante`, `marquer_encaisse`, `marquer_present`, `verifier_adherent`. *(V1, V3)*
2. Corriger la garde `NULL` dans les 4 RPC concernées. *(V2)*
3. Aligner les CGV sur les paliers de la home. *(I1)*
4. Poser la garde `is_super_admin()` sur `/admin` avant d'y brancher la moindre donnée. *(V7)*

### P1 — Avant les premières campagnes de prospection
5. `cockpit_stats` : contrôle d'appartenance + révocation `anon`. *(V4)*
6. Webhook Stripe : idempotence + tolérance temporelle. *(V5)*
7. CAPTCHA + limitation de débit sur l'inscription publique. *(V9)*
8. Correctif `Reveal` (contenu jamais invisible). *(§6.3)*
9. Menu mobile sur la home et la vitrine club. *(§6.3)*
10. `fetchpriority` / `loading="lazy"` sur les photos ; recompression des 6 JPEG. *(§6.2)*
11. Contrastes : `ink-soft` → `#6f6f6b`, vert foncé sous le texte blanc. *(§6.3)*
12. `/connexion?next=/creer` ouvre l'onglet création + réassurances. *(§6.3)*
13. `metadataBase`, `openGraph`, image OG, `canonical`, favicon. *(§SEO)*
14. Resend déclaré comme sous-traitant ; nuancer la phrase « hébergé dans l'UE ». *(I3)*
15. Corrections de copywriting n° 1, 2, 3, 6, 7.

### P2 — Après les premiers utilisateurs
16. Migrer `Parallax` vers `next/image` (LCP).
17. `robots.ts` + `sitemap.ts` + JSON-LD (Organization, Offer).
18. Polices via `next/font` (auto-hébergement, cohérence RGPD).
19. Redirection ouverte `next=` ; borner le cache du middleware.
20. Activer la protection contre les mots de passe compromis.
21. Chronométrer réellement la création d'un club, et n'afficher « 30 minutes » que si c'est vrai.
22. Traiter les objections « export » et « migration » sur la home ou dans une FAQ.
23. `enregistrer_questionnaire_sante` : lier à un jeton d'inscription. *(V6)*

### P3 — Seulement si les usages le justifient
24. Lier ou supprimer `/cgu`.
25. Atténuer le curseur clignotant hors `reduced-motion`.
26. Preuve sociale, une fois qu'elle sera réelle — jamais avant.

---

## Notes de méthode

- **Vérifié** signifie : reproduit dans le navigateur, mesuré, ou lu directement dans la base de production / le code, avec la preuve citée.
- **Non vérifié** est indiqué explicitement partout où c'est le cas (§6.5).
- Les failles de sécurité ont été **caractérisées par lecture et par requêtes non destructives**. Aucune exploitation n'a été tentée. Aucune donnée n'a été modifiée, insérée ou supprimée. Aucun secret n'est reproduit ici.
- Le compte de test évoqué en début de mission n'a finalement **pas été créé** : la découverte des failles P0 a réorienté l'effort vers leur caractérisation, et la création de données paraissait secondaire face à une base ouverte en écriture.
- Les préférences esthétiques ont été distinguées des défauts démontrables. Le rythme vertical de la home relève de la première catégorie : **aucune modification n'est recommandée**.
