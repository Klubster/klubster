# Prompt de démarrage — Claude Code (Klubster)

> À copier-coller comme premier message dans Claude Code, dans le dossier du projet.

---

Lis d'abord `CLAUDE.md` et tous les fichiers de `docs/` (`ARCHITECTURE`, `PRICING`, `BRAND`, `DESIGN_SYSTEM`) avant d'écrire la moindre ligne. Quand tu as fini de lire, **résume-moi en 5 lignes ce que tu as compris du produit** pour qu'on soit alignés avant de coder.

## ⚠️ À ne PAS confondre (le plus important)

**On ne construit PAS un site de club de boxe.** On construit **Klubster**, une **plateforme SaaS multi-tenant** (le « Shopify des associations ») qui permet à *n'importe quelle* association de créer et piloter son site, ses inscriptions, ses paiements et ses adhérents — toute seule, en moins de 20 minutes.

- **Klubster** = le produit (le logiciel, le site marketing, le back-office « Cockpit », l'onboarding, la base multi-tenant).
- **USM Boxe** = simplement la **1ʳᵉ association** créée sur la plateforme, qui sert à valider le tout en réel. Ce n'est **pas** le projet — c'est un *contenu de démonstration*.
- La **vitrine** d'une association (`klubster.fr/usmboxe`) est une **page générée par Klubster à partir d'un template thémable**, pas un site codé en dur pour la boxe. Le même template doit marcher pour un club de judo, de danse, de foot, etc., juste avec d'autres données.

Si à un moment tu te retrouves à coder « pour la boxe » en dur, tu t'es trompé : tout ce qui est spécifique à un club doit venir de la base de données (le tenant), pas du code.

## À quoi doit ressembler la vitrine d'une association

La page publique générée pour chaque asso doit être **proche d'un vrai site de club de sport, type le site actuel de l'USM Boxe Anglaise** : claire, rassurante, orientée « je veux m'inscrire / venir essayer ». Elle doit contenir, alimentée **depuis la base** (donc thémable et réutilisable par tout sport) :

- **En-tête** : logo + nom du club, couleur primaire du club, bouton **« S'inscrire »**.
- **Présentation** du club (texte d'accroche + description).
- **Disciplines / cours proposés** (ex. pour USM : boxe anglaise loisir, compétition, enfants… — mais piloté par les données).
- **Planning / créneaux** : tableau ou grille des cours par jour/heure, par discipline et par public (enfants, ados, adultes).
- **Tarifs / cotisations** (lisibles, par formule).
- **Infos pratiques** (encadrants, équipement, séance d'essai…).
- **Contact** (email, téléphone, formulaire ou lien).
- **« Où nous trouver »** : adresse + **carte** (map) intégrée pointant sur le lieu d'entraînement.
- **Bouton « S'inscrire »** menant vers le parcours d'adhésion.

> Si tu as besoin d'une référence visuelle concrète du rendu attendu, demande-moi l'URL du site actuel de l'USM Boxe — je te la donnerai. Reproduis-en la **structure et les sections**, pas le code.

## Objectif de cette session

Faire tourner l'app en local, puis livrer la **première tranche verticale** : une vitrine d'association réelle qui s'affiche depuis la base.

1. **Mise en route** : `npm install`, crée `.env.local` à partir de `.env.example` (demande-moi les clés Supabase/Stripe), ajoute les fichiers Next.js manquants si besoin, et fais démarrer `npm run dev` sans erreur.
2. **Base de données** : applique la migration `supabase/migrations/0001_init_multitenant.sql` sur mon projet Supabase, puis **insère USM Boxe comme 1ʳᵉ organisation** (slug `usmboxe`, `publie = true`) avec : couleur primaire `#189460`, adresse réelle (demande-la moi), **2-3 disciplines**, et **quelques créneaux de planning** — pour que `/usmboxe` affiche une vraie vitrine.
3. **Vitrine `/usmboxe`** : construis la route `[asso]` qui charge l'organisation + ses cours/créneaux/infos depuis Supabase (RLS lecture publique) et affiche **toutes les sections listées plus haut** (présentation, disciplines, planning, tarifs, infos pratiques, contact, carte « où nous trouver », bouton S'inscrire). **Rien en dur sur la boxe** : tout vient du tenant.
4. **Vérifie** : la page charge bien depuis la base, et changer la couleur/le contenu de l'asso en base change la page (preuve que c'est thémable et générique).
5. **Puis on attaque l'onboarding < 20 min** : l'assistant en étapes (choisir un **template par sport** → nom/logo/couleurs → infos → cours/tarifs/créneaux → publier) qui crée une organisation et redirige vers `/<slug>`. Commence par l'ossature des étapes + la création de l'organisation en base.

## Règles à respecter en permanence

- **Multi-tenant + RLS** : chaque ligne porte un `organisation_id`, une asso ne voit que ses données. Jamais de contenu propre à un club codé en dur.
- **Zéro commission** sur les paiements (Stripe Connect, l'argent va direct sur le compte de l'asso) ; revenu = abonnement.
- **Mobile-first**, accessible **AA**.
- **Vocabulaire Cockpit** dans le back-office : Cockpit, Équipage, Tour de contrôle, Mission.
- **Design system** (`docs/DESIGN_SYSTEM.md`) : monochrome noir & blanc façon Notion, émeraude `#0E9F6E` en accent rare, **boutons NOIRS** (jamais verts), **Space Mono** (titres/labels/chiffres) + **Inter** (corps). ⚠️ La couleur d'une **vitrine d'asso** vient du tenant (ex. USM `#189460`), pas de l'émeraude Klubster — l'émeraude est réservée au chrome Klubster (marketing + Cockpit).

**Méthode** : avance par **petites étapes**, montre-moi le résultat à chaque palier, et **demande-moi avant** toute décision structurante (schéma de base, dépendances, choix d'archi). Si quelque chose dans les docs te semble ambigu, pose la question plutôt que de deviner.
