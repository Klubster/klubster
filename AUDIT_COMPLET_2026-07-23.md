# Audit complet Klubster — 23 juillet 2026

Trois audits menés en parallèle avec les référentiels installés (design-taste-frontend, high-end-visual-design, redesign-existing-projects, impeccable, supabase-postgres-best-practices, stripe-best-practices, accessibility) : design/UX, backend Supabase/Stripe (avec vérification de l'état réel de la prod via MCP : advisors, index, comptages), SEO/a11y/perf (avec fetch réel de klubster.fr, /combat, /usmboxe, robots.txt, sitemap.xml).

**Verdict global** : la home et la marque sont d'une exécution rare, le backend n'a **aucun P0 sécurité-argent** (les acquis des audits 1-4 tiennent tous), le SEO technique de base est solide. Les vrais problèmes sont concentrés sur : le **funnel d'inscription adhérent**, les **vitrines clubs** (contraste, images, fonts), et des **bombes à retardement silencieuses** côté backend (plafond 1 000 lignes, relances saison 2).

---

## PLAN D'ACTION PRIORISÉ

### 🔴 P0 — corrige cette semaine

| # | Action | Effort | Pourquoi |
|---|--------|--------|----------|
| 1 | **Inscription adhérent : conserver la saisie en cas d'erreur** (`useActionState` au lieu de `redirect(?erreur=)`) + bouton avec état pending (`useFormStatus`) — `src/app/[asso]/inscription/page.tsx` + `actions.ts` | ½ j | Le formulaire 20+ champs est vidé à chaque erreur serveur (dont `compte_existant`, fréquent : parent qui inscrit un 2ᵉ enfant). Coûte des inscriptions réelles. |
| 2 | **Paginer le cron de relances et la console admin** (plafond PostgREST **1 000 lignes** : le `.limit(50000)` d'`admin.ts` est écrasé, le garde-fou `tronque` ne se déclenchera jamais) — `api/cron/relances/route.ts:110-122`, `src/lib/admin.ts:101-119` | ½ j | Au prochain club taille usmboxe : relances jamais envoyées et stats MRR fausses, **sans aucune erreur nulle part**. |
| 3 | **Migration 0017 « snapshot »** : DDL des 6 tables absentes des migrations (`reglements`, `pieces_adherent`, `questionnaires_sante`, `presences`, `audit_log`, `stripe_events`) + tous les index prod dont **`reglements_stripe_ref_uniq`** (le verrou d'idempotence monétaire !) + les **6 index FK manquants** (adhesions.adherent_id/cours_id, reglements/pieces/presences.organisation_id, questionnaires_sante.adhesion_id) | ½ j | La base n'est pas reconstructible ; un staging tournerait **sans** le verrou d'unicité des règlements. Les FK non indexées sont scannées par la RLS à chaque requête. |

### 🟠 Quick wins (< 1 h chacun, gros ratio)

| # | Action | Effort |
|---|--------|--------|
| 4 | `inkSoft: "#6f6f6b"` dans `PALETTES.blanc` (`src/lib/themes.ts:87-95`) — le texte de lecture de **toutes les vitrines** passe de 3,3:1 à AA | 1 ligne |
| 5 | `<form>` + soumission Entrée + `autoComplete` sur `/connexion` (le composant `Field` le supporte déjà, aucun appelant ne le passe) | 15 min |
| 6 | `@media (prefers-reduced-motion: reduce){ .cmb-blink,.cmb-cur{animation:none} }` sur /combat + scrim haut du hero home (nav blanche sur photo claire) | 2×2 lignes |
| 7 | **Canonical hérité erroné sur ~7 pages** : retirer `alternates: {canonical:"/"}` de `src/app/layout.tsx:25` (cgu, cgv, mentions, confidentialité, sous-traitance, connexion se déclarent duplicatas de la home) et le poser page par page | 30 min |
| 8 | Lot durcissement SQL : `(select auth.uid())` dans les 8 policies signalées par l'advisor initplan + `search_path` sur les 2 triggers de 0012 + activer la protection « mot de passe compromis » (HaveIBeenPwned, un clic) + retirer les policies de listing des buckets publics | 1 h |
| 9 | Micro-fixes : typo sélecteur cours (« Ados— 150 €/ an »), bouton `#cours` du hero vitrine conditionné à la présence de la section (comme la nav), labels `htmlFor` manquants sur `Champ` de CreerWizard | 30 min |

### 🟡 P1 — chantiers importants (avant la rentrée / la croissance)

| # | Action | Impact |
|---|--------|--------|
| 10 | **Garde-fou de contraste sur `couleur_primaire`** : helper luminance unique → texte noir/blanc auto sur les boutons, accent assombri quand il sert de texte. Réutilisé par SiteHeader, vitrine, inscription, wizard. (Signalé par 2 audits sur 3.) | Le CTA « S'INSCRIRE » d'un club au maillot jaune est aujourd'hui illisible. |
| 11 | **Auto-héberger toutes les fonts** (`next/font` pour les 6 piles de themes.ts + Chakra Petch/Press Start 2P de /combat). Le layout racine promet « aucune requête vers Google » — or chaque vitrine, /creer et /combat appellent fonts.googleapis.com. (Signalé par 2 audits.) | Cohérence RGPD avec l'argument de vente de la home + suppression du FOUT. |
| 12 | **Vitrines : `next/image` sur logos/photos** (SiteHeader, Chapitres, actualité) — uploads jusqu'à 3-5 Mo servis en `<img>` brut ; `remotePatterns` supabase.co déjà configuré | LCP des vitrines = le produit vendu, surface PWA mobile. |
| 13 | **Blinder `charge.refunded`** (`webhook/route.ts:192-194`) : supprimer le repli cumulatif `amount_refunded` (compte un cumul comme un delta au 2ᵉ remboursement partiel), refetch `?expand[]=refunds` si absent, **épingler la version d'API Stripe** dans `call()` | Trésorerie club faussée + adhésion rouverte à tort. C'est de l'argent. |
| 14 | **Relances saison 2** : l'unicité `(adherent_id, motif)` du journal bloque les relances des renouvelants (la saison suivante arrive à M+11, la purge à M+13). Intégrer la période dans la clé (colonne `periode` de 0014 déjà là). **Deadline : avant septembre 2027.** | Quasi aucune relance impayé/pièces en saison 2 sinon. |
| 15 | **Photo de hero pour les vitrines** (option dans `EditeurHero`, bandeau plein-bord + scrim ink comme la home) — un club de boxe est un brief image-led, le hero par défaut est purement typographique | Le plus gros levier de « wow » côté clients. |
| 16 | **SEO local des vitrines** : title avec ville + sport (`USM Boxe Anglaise — club de boxe à Montauban : inscriptions, planning`) — la ville est déjà en base | Requête réelle d'un adhérent = « boxe montauban ». |
| 17 | **Maillage + OG** : /combat est orpheline (aucun lien interne), /tarifs non liée depuis la home ; `og:image` absente sur /combat, /tarifs, /fonctionnalites (partages WhatsApp/LinkedIn sans vignette) | Deux pages d'acquisition à PageRank interne nul. |

### 🟢 P2 — dette et opportunités

- **Surface d'acquisition = 4 pages.** Aucune page par discipline (« logiciel gestion club de judo/danse/gym »). Le gabarit /combat + les sports déjà en base rendent une déclinaison programmatique faisable. C'est le levier n°1 sur « logiciel gestion association sportive ». À combiner avec les skills programmatic-seo/ai-seo déjà installés.
- **`equipe_ajouter`** (0013:253-271) : oracle d'énumération d'emails + rattachement silencieux d'un compte sans org. → flux d'invitation par jeton, ou réponse uniforme + notification.
- **Clé Stripe restreinte** (`rk_`) au lieu de `sk_` — le check `stripeCleCoherente()` exige `sk_` et empêcherait la migration ; à assouplir.
- **`connecterDomaine`** : attache chez Vercel avant de vérifier l'unicité en base → domaines orphelins en cas d'échec. Inverser.
- **`creerCodePromo`** non transactionnel (coupon orphelin si le code échoue) ; aucune clé d'idempotence sur les appels Stripe (à ajouter au moins sur coupons/refunds).
- **Vitrines en `force-dynamic`** : SSR + Supabase à chaque hit. Piste : cache court + `revalidateTag` depuis les server actions d'édition.
- **Sitemap vs domaines custom** : le sitemap liste `klubster.fr/{slug}` même pour les clubs à canonical custom ; et le proxy réécrit `/robots.txt` et `/sitemap.xml` des domaines custom en 404. Exceptions à ajouter.
- **`/creer` en Disallow robots.txt** : Disallow ≠ noindex ; la cible de tous les CTA peut apparaître « sans information » dans Google. Préférer meta noindex ou l'ouvrir.
- **Design système** : « SECTION nn — » à retirer des vitrines (jargon éditorial imposé aux familles ; garder le filet + `_`), CTA primaire home unifié (`bg-brand-dark` vs `bg-ink`), texte vert #279B65 porteur d'info en petit corps → `brand-dark`, `.kb-reveal` invisible sans JS (`opacity:0` sans fallback noscript), MenuMobile sans focus trap, aucun feedback `:active` sur les boutons, CockpitPreview en divs → vraie capture re-gradée, template « Rond » qui promet des formes douces que `border-radius:0 !important` interdit.
- **/combat** : libellés CTA à harmoniser, tarifs sans « premier mois offert » (incohérent avec la home), `100dvh`, gris `#4f645a` sur `#080c0a` ≈ 2,6:1.

---

## CE QUI EST SAIN (vérifié, à ne pas casser)

- **Backend** : signature webhook HMAC timing-safe + tolérance 300 s, verrou atomique par événement, cohérence livemode/mode, montants centimes exacts (`repartirMensualites` au centime), CRON_SECRET sur GET et POST, outbox à bail rejouable, double barrière garde.ts + RPC, service_role confiné, RLS par rôle en place, inscription publique revalidée serveur. Acquis des 4 audits externes : tous vérifiés tenus.
- **SEO** : title home orienté requête, JSON-LD au-dessus de la moyenne (SoftwareApplication, FAQPage, SportsClub complet avec horaires réels), sitemap dynamique, canonical vitrine → domaine custom, 404 propre, redirection www 308.
- **A11y/perf marketing** : focus-visible global, reduced-motion respecté presque partout, MenuMobile aria + Échap + retour focus, next/font auto-hébergé (racine), next/image AVIF + priority sur le LCP.
- **Design** : système typographique tenu, photos re-gradées cohérentes, commentaires de design dans le code, le pattern brouillon localStorage existe déjà dans CreerWizard (à répliquer sur l'inscription).

---

*Rapports détaillés des 3 agents disponibles sur demande (constats avec fichier:ligne). Base prod au 23/07 : 6 organisations, 312 adhérents, 2 règlements.*
