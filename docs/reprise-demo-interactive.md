# Reprise — démonstration interactive `/demo`

Document de passation, écrit le **31/07/2026 à 23h40**. À lire en entier avant d'écrire
une ligne. Il remplace la conversation qui l'a produit : tout ce qui suit a été vérifié
dans le code réel ou dans une chaîne de vérification lue jusqu'au bout.

---

## 1. Où en est la branche

```
branche : feat/demo-interactive
SHA     : 04ce0b8
avance  : 18 commits sur main
fusion  : AUCUNE — ne rien fusionner sans accord explicite de Mathieu
```

Dernière chaîne complète, lue intégralement :

| Étape | Résultat |
|---|---|
| `npm test` | `TEST_EXIT=0` — **519 tests**, 22 fichiers |
| `npm run build` | `BUILD_EXIT=0` — toutes les routes `/demo/*` prérendues statiques |
| `npm run typecheck` | `TC_EXIT=0` |
| `npm run lint` | `LINT_EXIT=0` — 11 avertissements, **tous pré-existants**, aucun dans `demo` |

Les 11 avertissements portent sur `CombatClient`, `HeroFight`, `CreerWizard`,
`FormBuilder`, `QuestionnaireSante`, `GuideInstallation`, `Citation`, `PushSetup`,
`Reveal`. Ne pas les compter comme une régression.

---

## 2. Le piège d'environnement, à connaître avant tout

`NODE_ENV=production` traîne dans l'environnement du terminal local (pas dans le dépôt,
pas dans la CI). Sous ce réglage, React charge sa version de production, **où `React.act`
n'existe pas** : 38 tests d'interface tombent avec `TypeError: React.act is not a function`
alors que le code est parfaitement sain.

```bash
NODE_ENV=test npm test        # toujours préfixer
NODE_ENV=test npx vitest run tests/demo-paiements.test.tsx
```

Le dépôt n'a **pas** été modifié pour contourner ça : la CI n'est pas concernée, et
bricoler un script pour une variable propre à une machine serait pire que le mal.

Note pratique : `npm run build` dépasse le délai des appels de terminal. Le lancer en
arrière-plan vers un fichier de log et interroger le log :

```bash
nohup bash -c 'npm run build > /tmp/kb.log 2>&1; echo "EXIT=$?" >> /tmp/kb.log' &
grep -E "EXIT=|demo/" /tmp/kb.log
```

---

## 3. Ce qui est fait — lots 1 à 3

### Lot 1 — Import et export (`2cf2491`)

Route `/demo/adherents/import`, calée sur `src/components/site/ImportAdherents.tsx`.

Deux règles du produit reprises telles quelles, parce qu'elles ressemblent à des oublis :

- **toutes les lignes partent au réducteur**, y compris les incomplètes. Le commentaire
  du composant réel l'explique : les filtrer ici les ferait disparaître du compte-rendu,
  et le visiteur lirait « 4 importés, 1 ignoré » sur un fichier de 6 lignes ;
- **un email illisible crée l'adhérent SANS email**, il ne le rejette pas
  (`email && emailValide(email) ? email : null`).

Le nombre créé est **lu dans l'état après coup**, jamais recalculé dans l'écran :
recopier la règle de doublon du réducteur signerait une divergence future.

Le fichier d'exemple (`CSV_EXEMPLE`) est volontairement imparfait : colonnes
« Adresse email », « Portable », « Activité », un doublon exact, une adresse malformée,
une ligne sans prénom, un cours inconnu du club. Résultat attendu et testé :
**5 créés, 2 ignorés sur 7**, dont Élodie Charpentier sans email et sans adhésion.

L'export CSV, jusque-là **totalement non testé**, l'est maintenant : BOM, 10 colonnes,
aucune donnée de santé, adresses toutes en `@example.com`, tri par nom.

### Lot 2 — Contrôle terrain (`cfaa677`)

Route `/demo/controle`. `verifierAdherentDemo` dans `src/lib/demo/selecteurs.ts`.

La règle métier reproduit la RPC `verifier_adherent` (migration `0013`, lignes 505-511) :

- `cours` et `regle` sortent de la **même** adhésion, la plus récente. Pas d'un « au
  moins une payée ». Quelqu'un qui a renouvelé sans payer est « Non réglé », même si
  l'an dernier était soldé ;
- sans aucune adhésion, `coalesce(…, false)` → « Non réglé », pas « À jour » ;
- le compte de pièces ignore le caractère obligatoire.

**Ajout propre à la démonstration** (à ne pas présenter comme une reproduction
littérale) : un départage par identifiant après `created_at`, pour que le rendu soit
déterministe. La RPC réelle n'a pas cet ordre total — c'est consigné dans
`docs/defauts-a-corriger.md`.

`chercherPourControle` garde les règles **propres à cet écran**, différentes de celles de
la liste : deux caractères minimum, douze résultats au plus, nettoyage anti-injection
avant le `ilike`.

**Décision validée par Mathieu : ne pas ouvrir la caméra.** Le bouton
`SIMULER UN SCAN →` fait tourner quatre cartes — à jour, non réglé, dossier incomplet,
puis une carte d'un autre club, seul chemin vers « Adhérent introuvable. ». Le rythme est
annoncé sous le bouton. La recherche par nom reste disponible en permanence.

À retenir des données : **trois personnes sont déjà présentes** (`a01`, `a11`, `a22`).
Un cockpit ouvert à 19 h a déjà du monde dans la salle.

### Lot 3 — Paiements (`04ce0b8`)

Routes `/demo/paiements`, `/demo/paiements/relances`, `/demo/paiements/remise`.

**Le piège de périmètre, à ne jamais lisser :**

- `aEncaisser` ne liste que les **chèques et espèces**
  (`.in("mode_paiement", ["cheque","especes"])`) ;
- `impayes` ne filtre **aucun** mode.

Une cotisation en ligne impayée est donc absente du premier écran et présente sur le
second. Un test dédié le garde.

Le reste, repris tel quel :

- sans montant saisi, `ENCAISSER` solde la ligne ; avec un montant, c'est un acompte et
  le statut ne bascule pas ;
- `SOLDE TOTAL` porte sur **toutes** les lignes, jamais sur la sélection ;
- le bloc « encaissé par moyen » est un **net** : les remboursements ont leur propre
  ligne, en négatif ;
- le champ **« Nature » n'existe QUE sur la fiche adhérent**. L'écran encaissements
  écrit `note = null`, y compris en mode « Autre » — vérifié dans `PaiementsClient`, qui
  appelle `enregistrerReglement` sans quatrième argument ;
- la remise **coche tout au départ** (« on remet tout, on décoche les exceptions ») et
  marque les chèques « remis » **avant** d'afficher le bordereau.

Le bordereau ne demande **ni banque, ni numéro de chèque, ni date d'émission, ni
tireur** : ces colonnes n'existent pas dans `reglements`, et le club n'a pas cette
information sous la main au moment où il prépare sa remise.

Ajout au réducteur : action `relance/simuler`, qui estampille `derniere_relance`
(colonne réelle, lue par l'écran via `adhesions_finance`). Rien ne part. Le `mailto:` de
l'écran encaissements n'est **pas** repris : ouvrir la messagerie d'un visiteur sur un
site public n'est pas une démonstration.

---

## 4. Ce qui reste — lots 4 à 11

Aucun n'est commencé. Les entrées de rail `INSCRIPTIONS`, `MESSAGES`, `ACTUALITÉS` et
`SITE` mènent encore à du vide.

Les sections 5 et 6 ci-dessous contiennent la **spécification déjà relevée dans le code
réel** pour les lots 4 et 5 : ne pas la refaire, la vérifier par sondage.

| Lot | Objet | État |
|---|---|---|
| 4 | Messages | spec relevée, rien de codé |
| 5 | Actualités | spec relevée, rien de codé |
| 6 | Site | à relever |
| 7 | Cours et tarifs | à relever |
| 8 | Isolation architecturale | à écrire |
| 9 | Responsive et accessibilité | à faire |
| 10 | Parcours sur preview Vercel | à faire |
| 11 | Rapport final en 12 points | à écrire |

---

## 5. Spécification relevée — Messages (lot 4)

Sources : `src/app/[asso]/cockpit/communication/` (`page.tsx`, `Communication.tsx`,
`Historique.tsx`, `actions.ts`, `[id]/page.tsx`), `src/lib/campagnes.ts`,
`supabase/migrations/0024_campagnes_messages.sql` et `0025_campagnes_rls_par_role_et_purge.sql`.

**Textes** — en-tête `← AUJOURD'HUI` / `MESSAGERIE_` ; kicker `MESSAGERIE — {nom}_` ;
h1 `Écrire à vos adhérents.` ; labels `DESTINATAIRES`, `OBJET`, `MESSAGE` ; placeholder
de l'objet `Reprise des cours le 4 septembre` ; le textarea n'a **aucun** placeholder ;
compteur `{n} destinataire(s) avec un email`.

**Groupes, dans l'ordre exact du select :**

| `value` | Libellé affiché | Libellé archivé |
|---|---|---|
| `tous` | Tous les adhérents | identique |
| `parents` | Parents (adhérents mineurs) | **Responsables légaux des mineurs** |
| `incomplet` | Dossiers incomplets | identique |
| — | `──────────` (option désactivée, si des cours existent) | — |
| `{cours.id}` | `{cours.nom}` | `{cours.nom}` |

**Destinataires** : `.filter(a => a.email)` — les adhérents sans email sont exclus, ne
sont pas comptés, n'apparaissent nulle part. Dédoublonnage. `mineur` = date de naissance
postérieure à aujourd'hui − 18 ans ; nulle ⇒ non mineur. Le club de yoga n'a **aucun**
mineur : le groupe « Parents » rend zéro destinataire et l'envoi se désactive tout seul.
C'est la vérité de ce club, à ne pas maquiller.

**Bouton d'envoi** désactivé tant que
`emails.length > 0 && objet.trim() && message.trim()` n'est pas vrai. Objet tronqué à
150 caractères côté serveur, message à 10 000.

**Historique** — titre `MESSAGES ENVOYÉS_`, 25 dernières, tri décroissant. Trois niveaux
par ligne : objet + statut ; `{groupe} · {n} destinataire(s) · {date} · {auteur}` ;
`{n} accepté(s)` puis, seulement si > 0, ` · {n} distribué(s)`, ` · {n} retardé(s)`,
` · {n} échec(s)`, ` · {n} plainte(s)`.

Statuts de campagne : `preparation` → `En préparation` ; `en_cours` → `Envoi en cours` ;
`envoye` → `Envoi terminé` ; `partiel` → `Partiellement envoyé` ; `echec` → `Échec`.

**Mention obligatoire à conserver mot pour mot** (le commentaire du fichier interdit de
la retirer) :

> « Accepté » signifie que l'envoi a été pris en charge ; « distribué », que le serveur de
> messagerie du destinataire l'a accepté. Ni l'un ni l'autre ne garantit que le message a
> été lu, ni qu'il est arrivé dans la boîte principale. Klubster ne mesure ni les
> ouvertures ni les clics.

**Ce que le produit n'a pas, vérifié** : aucune ouverture, aucun clic (décision écrite du
30/07/2026, `docs/audit-messages-2026-07-30.md`), aucune planification, aucune pièce
jointe sur le chemin campagne, aucun modèle, aucune statistique agrégée.

---

## 6. Spécification relevée — Actualités (lot 5)

Sources : `src/app/[asso]/cockpit/actualite/page.tsx` et `actions.ts`,
`supabase/migrations/0019_actualites.sql`, vitrine `src/app/[asso]/page.tsx`.

**Textes** — en-tête `← AUJOURD'HUI` / `ATELIER · ACTUALITÉS_` ; kicker
`LA VIE DU CLUB — {nom}_` ; h1 `Vos actualités.` ; chapô : « Chaque actualité a sa page
sur votre site. La plus récente s'affiche « À la une » tout en haut de votre vitrine, et
les trois dernières dans le chapitre « La vie du club ». »

**Formulaire** : `TITRE` (max 120), `TEXTE` (textarea 5 lignes, tronqué à 5000 côté
serveur), `DATE DE PUBLICATION` (par défaut aujourd'hui), `IMAGE (OPTIONNELLE)` avec
l'aide « JPG ou PNG, format paysage conseillé. ». Bouton `PUBLIER →`.

**Liste** : `DÉJÀ PUBLIÉES_`, rendue seulement si non vide — **aucun état vide**. Par
ligne : date, titre, `VOIR LA PAGE →`, bouton `Supprimer`.

**Schéma réel** : `id`, `organisation_id`, `titre`, `texte`, `image_url`, `publie_le`,
`created_at`. **Ni statut, ni brouillon, ni `updated_at`, ni auteur.**

**Deux gestes seulement**, et le code tranche en clair (`page.tsx` ligne 120) :

```
{/* Pas d'édition en v1 : supprimer puis republier fait le travail. */}
```

Donc : pas d'édition, pas de brouillon, pas de catégorie, pas de planification, pas de
réordonnancement. Publier rend l'actualité immédiatement visible.

**Vitrine** : `getActualites(org.id)` avec **limite 3 par défaut**, tri `publie_le desc`
puis `created_at desc`. Deux emplacements : le bandeau « À LA UNE_ » (la plus récente) et
la section « La vie du club » (`Dernières actualités.`, grille de 3, 2 ou 1 colonne).
La section est explicitement **retirée de la navigation** du site.

---

## 7. Règles de travail à ne pas relâcher

**Interdictions absolues sous `/demo`** : Supabase, Server Actions, routes API, `fetch`,
Stripe, Resend, Storage, cookies, `localStorage`, `sessionStorage`, IndexedDB,
authentification, données réelles. Tous les emails fictifs restent en `@example.com`.

**Vocabulaire des gestes** : le dernier geste d'un parcours porte **toujours** le mot
`SIMULER`. Pas « Envoyer », pas « Encaisser », pas « Publier ».

**Contraste** (décision de Mathieu, 31/07) : garder `CLUB.couleur` (`#6B7F5E`) pour les
éléments identitaires **non textuels** ; utiliser `#1E7A4F` pour les petits textes de
statut ; pour un bouton, une variante assombrie de la couleur du tenant. **Ne pas
reproduire volontairement une non-conformité d'accessibilité par fidélité.** Le défaut du
produit réel est consigné dans `docs/defauts-a-corriger.md` et se corrigera dans une PR
séparée. Le lot 9 doit repasser sur `/demo/controle`, qui utilise encore `CLUB.couleur`
pour « ✓ PRÉSENT AUJOURD'HUI » et pour le fond du bouton de présence.

**Méthode par lot** : retrouver les routes réelles → lire les composants → lire les
Server Actions → lire les RPC et migrations → reproduire uniquement ce qui existe →
écrire les tests sur les vrais écrans de `/demo` → **réintroduire temporairement les
principaux défauts pour prouver que les tests tombent** → restaurer → chaîne complète →
commit vert → lot suivant.

**Ne jamais annoncer vert** avant d'avoir lu le résultat final des quatre étapes.

---

## 8. Conventions de test déjà en place

Fichiers `.tsx` avec `// @vitest-environment happy-dom` en première ligne. Le défaut
reste `node`.

```tsx
// Sonde : lire l'état réel, ne jamais recalculer ce que le code produit
let vu: EtatDemo | null = null;
function Sonde() {
  const { etat } = useDemo();
  useEffect(() => { vu = etat; }, [etat]);
  return null;
}

// Monter le layout UNE fois ; le démonter remonterait le provider
const monter = (ecran) => render(<DemoLayout>{ecran}<Sonde /></DemoLayout>);

// BoutonSimuler attend 450 ms : vérifier à 449 (rien) puis à 450 (mutation exacte)
const avancer = (ms) => act(() => void vi.advanceTimersByTime(ms));

// Les <select> et <input> se changent par le setter natif du prototype,
// sinon React n'écoute rien
```

Pièges déjà payés dans ces tests :

- `a[href^="/demo/adherents/"]` attrape aussi les boutons d'en-tête — 27 lignes au lieu
  de 25 ;
- `eur()` produit des espaces fines insécables : comparer sur `replace(/\D/g, "")` ;
- chercher un mot dans `document.body.textContent` attrape les phrases d'aide — pour
  prouver qu'un champ n'existe pas, inspecter les `input/select/textarea` ;
- les données du club **n'ont aucun impayé sans email** : fabriquer le cas plutôt que
  supposer.

---

## 9. Ce qu'il ne faut pas oublier de vérifier au lot 10

Sur la preview Vercel, une seule session d'état, puis à 390 px : aucune erreur console,
aucune erreur d'hydratation, **aucun appel réseau** vers Supabase, Stripe ou Resend,
aucune persistance locale. Le build ne remplace pas cette vérification.
