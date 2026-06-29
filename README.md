# Klubster

Plateforme multi-tenant (« le Shopify des associations ») : chaque association configure son site,
ses inscriptions, ses paiements et ses adhérents. **USM Boxe** est la 1ʳᵉ association de démonstration.

Stack : **Next.js 14 (App Router) · Supabase (Postgres + Auth + RLS) · Tailwind**.
Design : monochrome façon Notion, accent émeraude rare, Space Mono + Inter (voir `docs/DESIGN_SYSTEM.md`).

## Démarrer en local

```bash
npm install
# .env.local est déjà pré-rempli avec les clés publiques Supabase.
# Ajoutez la clé service_role (Supabase > Project Settings > API) si besoin côté serveur.
npm run dev
```

Puis ouvrez :

| Page | URL | Description |
|---|---|---|
| Accueil Klubster | `/` | Site marketing (chrome émeraude) |
| Vitrine d'un club | `/usmboxe` | **Vitrine thémable générée depuis la base** (couleur = tenant) |
| Inscription | `/usmboxe/inscription` | Parcours d'adhésion (squelette) |
| Espace adhérent | `/usmboxe/espace` | Tableau de bord adhérent (squelette) |
| Cockpit (back-office) | `/usmboxe/cockpit` | Pilotage de l'asso (squelette) |
| Onboarding < 20 min | `/creer` | Assistant de création d'asso (squelette) |
| Super-admin | `/admin` | Plateforme — toutes les assos (squelette) |

> ⚠️ La vitrine `/usmboxe` n'a **rien codé en dur sur la boxe** : tout (nom, couleur, cours,
> planning, adresse, carte) vient de la base. Le même template fonctionne pour n'importe quel sport.

## Vérification

```bash
npm run typecheck   # tsc --noEmit  → 0 erreur
npm run build       # next build    → 6 routes générées
```

## Architecture du code

```
src/
  app/
    page.tsx                 # accueil marketing Klubster
    [asso]/page.tsx          # VITRINE publique (présentation, cours, planning, tarifs, contact, carte)
    [asso]/inscription/      # parcours d'adhésion
    [asso]/espace/           # espace adhérent
    [asso]/cockpit/          # back-office asso (Cockpit)
    creer/                   # onboarding < 20 min
    admin/                   # super-admin plateforme
  components/ui/             # design system (Button, Card, StatutBadge, Layout)
  components/site/           # blocs de la vitrine (SiteHeader, PlanningGrid)
  lib/
    supabase/                # clients Supabase (server / browser)
    queries.ts               # accès données (org + cours par slug)
    format.ts                # prix, planning, liens carte
  types/db.ts                # types reflétant le schéma Supabase
supabase/migrations/         # schéma multi-tenant (référence)
```

## Prochains jalons (V1)

Inscription + **Stripe Connect** (zéro commission) → Pièces/dossier → Espace adhérent complet →
Cockpit (adhérents, paiements, config) + **emailing** + export CSV → Auth & rôles (RLS) →
Déploiement **Vercel** + domaine **klubster.fr**.
