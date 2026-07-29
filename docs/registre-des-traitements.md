# Registre des activités de traitement — Klubster

**Responsable / éditeur :** Mathieu Bourdieu (entrepreneur individuel) — 652 chemin de Foumezous, 82370 Corbarieu — contact@klubster.fr — SIRET 795 109 198 00023
**Dernière mise à jour :** 29 juillet 2026
**DPO / contact RGPD :** contact@klubster.fr (désignation d'un DPO à anticiper avec la montée en charge des traitements de santé/mineurs)

> Document interne de conformité (art. 30 RGPD). À tenir à jour à chaque évolution des traitements ou des sous-traitants. À faire relire par un conseil RGPD.

Klubster intervient sous **deux qualités** :
- **Responsable de traitement** (art. 30.1) — comptes dirigeants, facturation, sécurité de la plateforme.
- **Sous-traitant** (art. 30.2) — gestion des données des adhérents pour le compte de chaque club, qui en est le responsable.

---

## Partie A — Traitements dont Klubster est responsable (art. 30.1)

### A1. Comptes des dirigeants & authentification
- **Finalité :** créer et sécuriser l'accès des présidents/dirigeants à leur espace.
- **Base légale :** exécution du contrat (CGV).
- **Personnes concernées :** dirigeants d'associations clientes.
- **Données :** nom, prénom, email, mot de passe (haché), identifiant de connexion, journaux techniques.
- **Destinataires :** Klubster ; sous-traitants techniques (Supabase, Vercel).
- **Transferts hors UE :** non (hébergement UE).
- **Durée :** durée du compte + 12 mois, puis suppression.
- **Sécurité :** mots de passe hachés (Supabase Auth), HTTPS, RLS, journalisation.

### A2. Facturation des abonnements
- **Finalité :** facturer l'abonnement. Le club ne choisit pas d'offre : le palier (9/19/29 € par mois)
  est déterminé automatiquement par l'effectif, via la RPC `palier_abonnement`. Les identifiants internes
  `starter` / `club` / `club_plus` sont des clés techniques Stripe, jamais des noms commerciaux.
- **Base légale :** obligation légale (comptable) + contrat.
- **Personnes concernées :** clubs clients / leurs représentants.
- **Données :** identité de facturation, offre, montants, historique de paiement (via Stripe).
- **Destinataires :** Klubster ; Stripe (paiement).
- **Transferts hors UE :** Stripe — garanties appropriées (clauses contractuelles types / DPF).
- **Durée :** durée légale de conservation comptable (10 ans pour les pièces).
- **Sécurité :** aucune donnée bancaire stockée par Klubster (gérée par Stripe, PCI-DSS).

### A3. Sécurité, prévention des abus, support
- **Finalité :** garantir la sécurité, diagnostiquer les incidents, répondre au support.
- **Base légale :** intérêt légitime.
- **Données :** journaux de connexion, adresses IP, métadonnées techniques, échanges de support.
- **Destinataires :** Klubster ; Cloudflare (Turnstile — vérification anti-robot du formulaire d'inscription).
- **Transferts hors UE :** Cloudflare (États-Unis) — clauses contractuelles types. Données transmises limitées
  à l'adresse IP et à des signaux techniques du navigateur, le temps de la vérification. Aucun cookie
  publicitaire, aucun profilage.
- **Durée :** 6 à 12 mois pour les journaux.

### A4. Messagerie d'assistance (chat du site et chat du cockpit)
- **Finalité :** répondre aux questions des visiteurs du site et des dirigeants de clubs depuis leur cockpit.
- **Base légale :** intérêt légitime (relation client et avant-vente) ; les données sont fournies
  spontanément par la personne qui écrit.
- **Personnes concernées :** visiteurs du site, dirigeants et équipes habilitées des clubs clients.
- **Données :** contenu du message, nom et coordonnée de contact si le visiteur les renseigne
  (facultatifs), nom du club pour le chat cockpit, identifiant de conversation, horodatage.
- **Destinataires :** Klubster ; **Telegram** (acheminement de la notification et de la réponse).
- **Transferts hors UE :** Telegram — hors Union européenne. Les messages sont conservés en base chez
  Supabase (UE) ; une copie du message (1 500 caractères maximum), du nom et de la coordonnée de contact
  éventuels transite par Telegram pour permettre la réponse. ⚠️ **Point à formaliser** : garanties de
  transfert à documenter, et information des personnes à ajouter dans `/confidentialite` et
  `/sous-traitance` (voir « Écarts identifiés » en fin de document).
- **Durée :** durée de la conversation + archivage limité ; suppression sur demande.
- **Sécurité :** aucune donnée d'adhérent, aucune pièce et aucune donnée de santé ne transite par ce canal.
  Le chat cockpit n'est accessible qu'aux membres habilités du club (le rôle adhérent en est exclu).

### A5. Mesure d'audience des pages de présentation
- **Finalité :** comprendre ce qui se lit mal ou décourage les visiteurs sur les pages de marque.
- **Base légale :** intérêt légitime. Le service fonctionne **en mode sans cookie** — rien n'est déposé
  ni lu sur le terminal, aucun identifiant ne suit le visiteur d'une visite à l'autre, aucun profil n'est
  constitué. C'est ce qui dispense de recueillir un consentement et d'afficher un bandeau.
- **Personnes concernées :** visiteurs des pages de présentation de Klubster.
- **Données :** interactions de navigation anonymes (défilement, clics, parcours), métadonnées techniques.
- **Destinataires :** **Microsoft Clarity** (Microsoft Corporation).
- **Transferts hors UE :** États-Unis — clauses contractuelles types et cadre de protection des données
  UE–États-Unis.
- **Périmètre — restriction stricte :** la mesure ne tourne que sur `/`, `/tarifs`, `/fonctionnalites`
  et `/combat` (liste blanche `PAGES_MESUREES` dans `src/components/site/Mesure.tsx`, composant monté
  uniquement dans le layout `(marketing)`). `/creer` en est volontairement exclue : c'est la seule page
  de présentation où l'on saisit un nom, un email et un mot de passe.
  **Intention : ne jamais s'appliquer aux sites des clubs, formulaires d'inscription, espaces adhérents
  ni cockpits.** Cette restriction est un engagement écrit dans la politique de confidentialité : toute
  extension de la liste blanche est une modification de traitement.
- ⚠️ **Écart technique constaté le 29/07/2026, non corrigé à ce jour** : la restriction n'est pas
  effective lors d'une navigation côté client. Voir « Écarts identifiés », point 1.
- **Durée :** définie par le paramétrage Microsoft Clarity.
- **Désactivation :** sans la variable `NEXT_PUBLIC_CLARITY_ID`, aucun traceur n'est chargé.

---

## Partie B — Traitements réalisés pour le compte des clubs (art. 30.2 — Klubster sous-traitant)

> Chaque **club** est responsable de traitement ; Klubster agit sur ses instructions (voir DPA `/sous-traitance`).

### B1. Gestion des adhérents et des inscriptions
- **Catégories de traitement :** collecte, hébergement, organisation, consultation, conservation, suppression.
- **Personnes concernées :** adhérents, représentants légaux de mineurs.
- **Données :** identité, contact, date de naissance, cours, statut de paiement, pièces justificatives, champs de formulaire définis par le club.
- **Sous-traitants ultérieurs :** Supabase/AWS (UE), Vercel, Stripe, Resend (emails de confirmation
  d'inscription et messages du club à ses adhérents), Cloudflare (Turnstile sur le formulaire public).
- **Transferts hors UE :** les dossiers, pièces, questionnaires de santé et paiements sont **stockés dans
  l'Union européenne** (Irlande) et les traitements serveur s'exécutent à Paris. Vercel, Resend et
  Cloudflare sont des sociétés américaines : les transferts correspondants sont encadrés par les clauses
  contractuelles types. Stripe sous garanties appropriées.
- **Durée :** définie par le club ; par défaut, durée de l'adhésion + archivage limité puis suppression.

### B2. Questionnaire de santé (catégorie particulière — art. 9)
- **Finalité :** attester de l'aptitude à la pratique (remplacement du certificat médical).
- **Base légale :** consentement explicite (art. 9.2.a) ; pour un mineur, consentement du titulaire de l'autorité parentale. L'intérêt légitime n'est pas une base valable pour l'art. 9.
- **Données réellement conservées :** **uniquement le résultat** (attestation négative / certificat requis), la **signature** et la **date**. **Le détail des réponses n'est ni transmis ni stocké** (minimisation).
- **Personnes concernées :** adhérents (dont mineurs) ; signature du représentant légal pour les mineurs.
- **Durée :** la saison concernée, puis suppression.
- **Mesures spécifiques :** minimisation, cloisonnement par club (RLS), chiffrement au repos et en transit, accès restreint au club, AIPD réalisée (voir `aipd-questionnaire-sante.md`).

### B3. Présence / émargement
- **Finalité :** appel et suivi de présence (scanner QR).
- **Données :** identifiant adhérent, date de présence.
- **Durée :** saison en cours.

### B4. Journal des emails automatiques
- **Finalité :** éviter les envois en double et faire respecter le plafond anti-harcèlement (une relance / 7 j).
- **Base légale :** intérêt légitime (bonne gestion des communications, protection contre le harcèlement).
- **Données :** identifiant du club, identifiant de l'adhérent, adresse destinataire, motif, statut d'envoi, horodatage.
- **Destinataires :** Klubster ; **Resend** (acheminement effectif des emails — adresse, nom et contenu
  du message uniquement).
- **Transferts hors UE :** Resend, société américaine — clauses contractuelles types.
- **Durée de conservation :** **13 mois** (une saison pleine + marge), puis purge automatique (`purger_emails_journal`, tâche quotidienne). L'adresse est par ailleurs effacée immédiatement à l'exercice du droit à l'effacement de l'adhérent.

---

## Sous-traitants ultérieurs (récapitulatif)

| Sous-traitant | Rôle | Traitements concernés | Localisation | Garanties |
|---|---|---|---|---|
| Supabase (sur AWS) | Base de données, authentification, stockage | A1, A3, A4, B1→B4 | Union européenne (Irlande, eu-west-1) | Hébergement UE, DPA Supabase |
| Vercel | Hébergement applicatif, fonctions serveur | tous | Société américaine ; fonctions forcées en Europe (Paris, `cdg1`) | Clauses contractuelles types, DPA Vercel |
| Stripe | Paiements (Connect pour les cotisations, Billing pour l'abonnement) | A2, B1 | UE (entité irlandaise) / international | Clauses contractuelles types / DPF, PCI-DSS |
| Resend | Acheminement des emails transactionnels et des messages du club à ses adhérents | A1, B1, B4 | Société américaine | Clauses contractuelles types |
| Cloudflare | Turnstile — vérification anti-robot du formulaire d'inscription public | A3, B1 | Société américaine | Clauses contractuelles types. IP et signaux techniques du navigateur uniquement, le temps de la vérification |
| Microsoft (Clarity) | Mesure d'audience des pages de présentation, **en mode sans cookie** | A5 uniquement | Société américaine | Clauses contractuelles types + cadre UE–États-Unis. **Jamais sur les espaces des clubs ni des adhérents** |
| Telegram | Acheminement des notifications et réponses de la messagerie d'assistance | A4 uniquement | Hors Union européenne | ⚠️ Garanties à formaliser — voir « Écarts identifiés » |

**Ce qu'aucun sous-traitant ci-dessus ne reçoit :** les questionnaires de santé et les pièces
justificatives ne sortent pas de Supabase (UE). Ni Clarity, ni Telegram, ni Cloudflare ne voient de
donnée d'adhérent.

## Mesures de sécurité transverses
Cloisonnement multi-tenant par `organisation_id` + Row Level Security ; fonctions privilégiées `SECURITY DEFINER` validant l'appartenance ; HTTPS ; chiffrement au repos (Supabase) ; sauvegardes ; journalisation ; procédure de notification de violation sous 72 h.

## Habilitations internes au club — modèle d'accès aux dossiers adhérents

**Décision assumée (22/07/2026, M. Bourdieu), à la suite du 4e audit de sécurité.**

Au sein d'un même club, l'équipe est composée de **bénévoles nommément habilités par le président** (fonction « équipe » du cockpit). Les rôles et leurs droits d'**écriture** sont cloisonnés en base (RLS par rôle) :

| Rôle | Écriture |
|---|---|
| Président (`admin_asso`) | Tout, y compris équipe et abonnement |
| Trésorier | Paiements, encaissements, remises |
| Secrétaire | Adhérents, dossiers, pièces, santé, messages, site |
| Encadrant | Contrôle au scan, présences |
| Lecture seule | Aucune |

Les **données sensibles réglementées** font l'objet d'un cloisonnement de **lecture** spécifique, plus strict :
- **questionnaires de santé** (art. 9) et **pièces justificatives** : lecture réservée au **président et au secrétaire** — jamais au trésorier, à l'encadrant ni au rôle lecture seule (RLS `qs_read_org`, `pieces_read_role`).

Pour les **autres champs du dossier adhérent** (identité, coordonnées, date de naissance, adresse, responsable légal, contact d'urgence, informations administratives), la **lecture est ouverte à l'ensemble de l'équipe habilitée du club**. Ce choix est **assumé et documenté** au titre de l'art. 5.1.c (minimisation) : au sein d'une association, ces informations sont nécessaires à la vie courante du club (convocations, licences, sécurité des mineurs, contact en cas d'urgence pendant l'entraînement), et l'accès est déjà limité aux seuls bénévoles que le président a explicitement habilités, cloisonné par club, journalisé, et révocable à tout moment. Une segmentation colonne-par-colonne plus fine (encadrant limité à identité + présence, trésorier à identité + situation de paiement) reste une **évolution possible** si un club le demande ou si le volume d'équipes le justifie, mais n'est pas retenue comme mesure obligatoire à ce stade.

**Base de la décision :** l'audit externe a explicitement qualifié ce point de non bloquant « si cette organisation est assumée et documentée » — ce que fait la présente section.

---

## Écarts identifiés — au 29 juillet 2026

Point de méthode : **un sous-traitant n'est réellement déclaré que s'il figure aux trois endroits** —
la page publique `/sous-traitance` (DPA opposable aux clubs), la page `/confidentialite` (information
des personnes) et le présent registre (art. 30). Un ajout à l'un des trois sans les deux autres est un
écart, pas un oubli de rédaction.

**1. La mesure d'audience ne s'arrête pas à la sortie des pages de marque — le plus urgent.**
`chargerClarity()` (`src/components/site/Mesure.tsx:58-67`) insère le script dans `document.head`, et
le composant n'a **aucune fonction de nettoyage** : démonter le composant React ne retire pas le script
déjà inséré et n'arrête pas le service. Or la page d'accueil — qui est mesurée — porte un lien
`<Link href="/usmboxe">Voir le site public d'un club →</Link>` vers la vitrine. Un visiteur
qui suit ce lien reste enregistré sur la vitrine du club, puis sur `/usmboxe/inscription` s'il y va,
c'est-à-dire sur un formulaire portant identité, date de naissance et questionnaire de santé. Le même
mécanisme rend `/creer` mesurée dès lors qu'on y arrive depuis `/`, `/tarifs` ou `/fonctionnalites`.
Le commentaire du fichier (`:11-14`) affirme l'inverse : la barrière du layout n'en est pas une.

**Reproduit en production le 29/07/2026**, navigateur, navigation côté client sans rechargement :
`/` → clic « Voir le site public d'un club » → `/usmboxe` → clic → `/usmboxe/inscription`.
À chaque étape, `document.getElementById('kb-clarity')` répond et `window.clarity` reste défini.
Le formulaire atteint expose les champs `prenom`, `nom`, `naissance`, `adresse`, `email`, `tel`.
Ce n'est donc plus une lecture de code : c'est un constat.
Trois conséquences à traiter, dans cet ordre :
- **corriger le code** (retirer le script et arrêter la mesure au démontage, ou n'autoriser Clarity
  qu'après vérification du chemin à chaque navigation) ;
- **évaluer ce qui a déjà été enregistré** dans le compte Clarity depuis la mise en production de la
  mesure : si des sessions sur des espaces de club ou sur `/creer` y figurent, qualifier l'incident
  (art. 33 : le club est responsable de traitement, Klubster sous-traitant l'informe sans délai) ;
- **ne rétablir la formulation actuelle** de `/confidentialite` et du présent registre qu'une fois la
  correction déployée et vérifiée dans un navigateur.

**2. `/combat` est mesurée mais absente de la politique de confidentialité.**
`PAGES_MESUREES` inclut `/combat` (`src/components/site/Mesure.tsx:50`), alors que
`/confidentialite` écrit « accueil, tarifs, fonctionnalités — et uniquement sur celles-ci »
(`src/app/confidentialite/page.tsx:92`). La page publique doit être alignée sur la liste réelle.
Noter aussi que le test de la liste blanche fonctionne par préfixe (`startsWith`) : toute future
sous-page de `/tarifs`, `/fonctionnalites` ou `/combat` serait mesurée sans décision explicite.

**3. Telegram n'est déclaré dans aucune des pages publiques.**
La messagerie d'assistance (A4) fait transiter par Telegram le contenu des messages (1 500 caractères
maximum), ainsi que le nom et la coordonnée de contact du visiteur lorsqu'il les renseigne, et le nom du
club pour le chat cockpit. Ce sous-traitant n'apparaît ni dans `/sous-traitance`, ni dans
`/confidentialite`, ni — avant la présente mise à jour — dans ce registre. Trois actions :
- ajouter Telegram aux deux pages publiques, en précisant les données concernées ;
- documenter les garanties de transfert hors UE applicables ;
- ou, si ces garanties ne peuvent pas être établies, remplacer l'acheminement Telegram par un canal
  couvert (l'email Resend, déjà déclaré, remplissait ce rôle auparavant).

Précision de rédaction : dire qu'« aucune donnée d'adhérent n'emprunte ce canal » relève de l'usage
attendu, **pas d'une garantie technique**. Le corps du message est transmis tel quel, sans filtrage :
rien n'empêche un dirigeant d'écrire le nom d'un adhérent dans le chat du cockpit. Ce qui est
techniquement établi : le chat cockpit est fermé au rôle adhérent, et aucun fichier, aucune pièce et
aucun questionnaire de santé ne peut être joint à ce flux.

**4. Prestataires appelés depuis le navigateur du visiteur, non déclarés.**
- **Google Fonts** — `@import url('https://fonts.googleapis.com/…')` dans un `<style>` rendu côté
  client sur `/combat` (`src/app/(marketing)/combat/CombatClient.tsx:102`). Le navigateur du visiteur
  appelle donc Google (IP + user-agent). Cela contredit le parti pris affiché ailleurs dans le code
  (`src/app/layout.tsx`, `src/lib/polices-vitrines.ts`) : polices auto-hébergées, aucune requête vers
  Google. Correction la plus simple : charger cette police par `next/font` comme les autres.
- **Google Maps** — `<iframe>` d'intégration de carte sur les vitrines de club
  (`src/app/[asso]/page.tsx`, via `embedCarte` dans `src/lib/format.ts`). Chaque visiteur d'un site de
  club — dont des adhérents et des parents — charge une ressource Google. À déclarer, ou à remplacer
  par un simple lien sortant vers la carte.

**5. Web Push : destinataire à qualifier.** Les notifications du cockpit passent par le service de push
du navigateur de l'éditeur (Google/Apple/Mozilla selon le terminal), avec le nom du club et les 140
premiers caractères du message. La charge utile est chiffrée de bout en bout (VAPID) et l'abonnement
est limité à l'éditeur. À trancher : sous-traitant à déclarer, ou simple acheminement chiffré ?

**6. Le serveur qui héberge le bot de messagerie n'est identifié nulle part.** Le contenu des
conversations transite par cette machine (`src/app/api/chat/reply/route.ts`). Hébergeur, localisation
et mesures de sécurité restent à documenter ici.

**7. Incohérences de rédaction entre les trois sources, à reprendre ensemble :**
- `/confidentialite` annonce « **trois** prestataires établis aux États-Unis » alors que la même page
  déclare aussi Microsoft ; avec Telegram et Google, le compte est faux.
- **Stripe** est présenté comme irlandais dans les deux pages publiques, sans mention de transfert,
  et comme « UE / international sous garanties » ici. Une seule formulation à retenir.
- **Microsoft Clarity** figure dans `/confidentialite` et ici, mais pas dans `/sous-traitance`.
  À arbitrer : Clarity relève de A5, où Klubster est responsable de traitement et non sous-traitant
  du club — le DPA n'est peut-être pas le bon véhicule. Si c'est le choix retenu, c'est la règle des
  trois emplacements ci-dessus qu'il faut préciser, pas la page.
- Les deux pages publiques portent encore la date du **30 juin 2026**. Rien n'y a été modifié à ce
  stade : les corrections ci-dessus restent à faire côté public.

**8. Resend, Cloudflare et Microsoft Clarity figuraient dans les pages publiques mais pas dans ce
registre.** Corrigé par la présente mise à jour (A3, A4, A5, B1, B4 et tableau récapitulatif). L'écart
avait déjà été signalé pour Resend lors d'un audit antérieur, puis corrigé sur les seules pages
publiques — d'où la règle des trois emplacements rappelée en tête de section.
