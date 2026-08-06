# Lot S — inventaire des motifs d'interface (S1)

Mesuré sur `5cf82de` (`release/klubster-commercial-v1-demo`), le 5 août 2026, par grep sur
l'arbre git — chaque chiffre est reproductible. 63 écrans (`page.tsx`), 46 fichiers de tests,
1050 tests verts au départ.

## Les trois constats de la reprise, confirmés sur cette branche

1. **`src/components/ui/` (Button, Card, StatutBadge, Layout) : zéro import** dans tout `src/`.
2. **Aucun `loading.tsx`, aucun `error.tsx`** ; seul `src/app/not-found.tsx` existe.
3. **19 écrans cockpit contre 2 pour l'espace adhérent.**

## Inventaire par motif

| Motif | Implémentations | Routes | Divergences | Composant candidat | Risque | Priorité |
| ----- | --------------- | ------ | ----------- | ------------------ | ------ | -------- |
| Bouton primaire/secondaire | 42 fichiers réécrivent `bg-ink`/`border-ink` à la main, ~30 variantes de classe distinctes | cockpit, espace, inscription, admin, démo | padding 4/5/6, texte 12/13px, `min-h-[44px]` présent ou absent, `w-full sm:w-auto` inconstant | `ui/Button` réécrit (voir S2) | Moyen — mécanique mais massif | 1 |
| Couleurs de statut | 50 fichiers posent `#B23B3B`/`#1E7A4F`/`#8A6508` en `style={{}}` inline (98+39+29 occurrences) | 23 fichiers `[asso]`, 11 démo, 4 site, 3 admin | `warning` token = `#B8860B` (sous AA) mais écrans = `#8A6508` ; `success` token inutilisé | tokens Tailwind corrigés + classes `text-danger/success/warning` | Faible — substitution 1:1 | 1 |
| Badge de statut | pastille `kb-dot` recodée dans 4 fichiers hors ui/ ; libellés+couleurs ternaires inline dans les listes | adhérents, paiements, démo | libellés parfois différents pour le même statut | `ui/StatutBadge` étendu (pièces, présence) | Faible | 2 |
| État vide | 29 fichiers, phrase « Aucun… » à chaque fois différente, sans action associée | partout | ton, ponctuation, présence ou non d'un lien d'action | `ui/EtatVide` (message + action optionnelle) | Faible | 2 |
| Chargement | **0** `loading.tsx` — navigation serveur sans signal | partout | — | `loading.tsx` par groupe + `ui/Squelette` | Faible | 1 |
| Erreur | **0** `error.tsx` — écran générique Next hors marque | partout | — | `error.tsx` par groupe (client, `reset()`) | Faible | 1 |
| En-tête de page | 6 variantes de `<h1>` dans le seul cockpit | cockpit | tailles 2xl/3xl/4xl, tracking présent ou non | non — harmonisation par classe, pas d'abstraction | Faible | 3 |
| Tableau | 5 fichiers `<table>`, le reste en listes | cockpit, admin | — | non — déjà peu nombreux | Faible | 3 |
| Formulaire | 22 fichiers `<form>`, champs stylés à la main | inscription, cockpit, espace | focus ring inconstant | champ partagé — hors périmètre de cette passe | Moyen | 3 |
| Modale | 2 implémentations (`fixed inset-0`) | cockpit | — | non — trop peu pour abstraire | Faible | 3 |

## S2 — sort des quatre composants existants

Aucun des quatre n'est importé ; deux contredisent la DA réelle du produit.

- **`Button` — réécrire.** La version actuelle pose `text-sm font-medium shadow-sm` :
  le produit réel n'a **aucune ombre** (grep : 0 `shadow-*` dans `src/app`) et ses boutons
  sont **Space Mono 12-13px** (`mono text-[12px]`). Brancher ce Button tel quel changerait
  l'apparence de 42 fichiers. La réécriture reprend le motif dominant réel :
  primaire `bg-ink text-paper hover:bg-ink/90`, secondaire `border border-ink hover:bg-ink
  hover:text-paper`, discret `text-ink-soft hover:text-ink`, destructif `border-danger
  text-danger hover:bg-danger hover:text-paper`, tous `mono`, cible tactile `min-h-[44px]`
  par défaut (pages terrain), focus visible conservé.
- **`Card` — corriger puis conserver.** Retirer `shadow-sm hover:shadow-md` (même raison) ;
  garder `border border-line bg-surface`, le motif réel des écrans.
- **`StatutBadge` — étendre puis conserver.** L'API (Record statut → pastille + texte) est
  bonne ; il manque les statuts de pièce (`manquante`/`fournie`/`par_email`) et un variant
  neutre. Les couleurs passent par les tokens corrigés.
- **`Layout` (Container/Section/SurtitreMono) — conserver tel quel.** Correspond au site
  marketing ; le cockpit a son propre rythme, ne pas le forcer dessus.

## Tokens — corrections décidées

| Token | Avant | Après | Pourquoi |
| ----- | ----- | ----- | -------- |
| `warning` | `#B8860B` | `#8A6508` | Les écrans utilisent déjà `#8A6508` (29 occurrences) ; `#B8860B` sur papier ≈ 2,9:1, sous le seuil AA — les 9 `text-warning` existants sont aujourd'hui illisibles au sens WCAG |
| `success` | `#279B65` | `#1E7A4F` | Jamais utilisé en l'état ; les écrans posent `#1E7A4F` (39 occurrences) car `#279B65` sur papier ≈ 3,1:1, sous AA pour du texte. `brand` reste `#279B65` (accent graphique) |
| `danger` | `#B23B3B` | inchangé | Déjà aligné avec les 98 occurrences inline |
| `danger.soft` | — | `#FBEDED` | Fond des encarts d'erreur, aujourd'hui inline (4 occurrences) |

## Périmètre de migration de cette passe (S4)

Cockpit accueil, adhérents (liste + fiche), cours, paiements, messages, espace adhérent —
les routes où un bénévole passe son temps. La démo suit les mêmes composants (elle importe
déjà `calculerPriorites` ; les sentinelles `demo-sentinelles.test.ts` gardent l'alignement).
Le reste des écrans migrera par lots suivants ; une sentinelle empêche toute nouvelle
occurrence inline des trois hex de statut dans les zones migrées.
