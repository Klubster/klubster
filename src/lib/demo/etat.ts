/**
 * L'état de la simulation, et les seules transformations qu'on peut lui faire subir.
 *
 * POURQUOI UN RÉDUCTEUR, ET PAS DES `useState` ÉPARPILLÉS
 * Parce que la promesse « rien n'est enregistré » doit être vérifiable d'un coup d'œil.
 * Tout ce qui peut arriver aux données tient dans une seule fonction, qu'on peut lire en
 * entier.
 *
 * CE RÉDUCTEUR EST *CONÇU* COMME UNE FONCTION PURE — CE N'EST PAS UNE GARANTIE DE NATURE
 * Rien dans le langage ne l'empêche de muter un tableau imbriqué, de modifier une
 * constante importée, ou d'appeler quelque chose qui a un effet de bord. La pureté est
 * ici une INTENTION, tenue par trois règles et vérifiée par des tests :
 *   1. chaque branche renvoie un objet neuf, jamais `etat` modifié ;
 *   2. aucune méthode mutante (`push`, `splice`, affectation dans un objet existant) ;
 *   3. `tests/demo-etat.test.ts` prouve qu'une action ne touche ni l'ancien état, ni les
 *      constantes de `donnees.ts`.
 * C'est la troisième règle qui compte : les deux premières sont des habitudes, la
 * dernière est une preuve.
 *
 * POURQUOI AUCUNE PERSISTANCE
 * Ni `localStorage`, ni `sessionStorage`, ni cookie, ni IndexedDB. Un rechargement
 * ramène la démonstration à son état initial : c'est ce qui la rend inépuisable pour le
 * visiteur suivant, et ce qui garantit qu'aucune trace de sa visite ne subsiste sur sa
 * machine. Une démonstration qui se souviendrait aurait besoin d'une bannière de
 * consentement — pour rien.
 *
 * LE TEMPS ET LES IDENTIFIANTS, TOUS DEUX DÉTERMINISTES
 * Aucun `Date.now()`, aucun `Math.random()`. Les dates viennent de la constante
 * `AUJOURDHUI`, les identifiants d'un compteur qui vit DANS l'état. Deux raisons : le
 * rendu serveur et le rendu client doivent produire la même chose, sinon React remplace
 * tout l'arbre au premier affichage ; et deux visiteurs qui font les mêmes gestes
 * doivent voir la même chose, sans quoi une capture d'écran ne prouve rien.
 */

import {
  ACTUALITES_INITIALES, ADHERENTS_INITIAUX, ADHESIONS_INITIALES,
  AUJOURDHUI, CAMPAGNES_INITIALES, CLUB, COURS_INITIAUX, FORM_CONFIG_INITIALE,
  PAGE_CONFIG_INITIALE, PIECES_INITIALES, PRESENCES_INITIALES, QUESTIONNAIRES_INITIAUX,
  REGLEMENTS_INITIAUX, eur,
} from "./donnees";
import type {
  ActualiteDemo, AdherentDemo, AdhesionDemo, AutorisationDemo, CampagneDemo, ChampDemo,
  CoursDemo, Creneau, FormConfigDemo, ModeReglement, PageConfigDemo, PieceDemo,
  PieceFormDemo, PresenceDemo, QuestionnaireDemo, ReglementDemo, RemiseChequesDemo,
  RemiseFormDemo, StatutDestinataire,
} from "./types";

export type EtatDemo = {
  adherents: AdherentDemo[];
  adhesions: AdhesionDemo[];
  reglements: ReglementDemo[];
  pieces: PieceDemo[];
  questionnaires: QuestionnaireDemo[];
  cours: CoursDemo[];
  campagnes: CampagneDemo[];
  actualites: ActualiteDemo[];
  presences: PresenceDemo[];
  remises: RemiseChequesDemo[];
  form: FormConfigDemo;
  site: PageConfigDemo;
  compteur: number;
  /** Dernière confirmation de simulation, affichée puis effacée. */
  confirmation: string | null;
};

/**
 * FABRIQUE de l'état initial — et non une constante partagée.
 *
 * POURQUOI CE N'EST PAS UN DÉTAIL
 * Un `export const ETAT_INITIAL = { adherents: ADHERENTS_INITIAUX, … }` partagerait ses
 * tableaux avec les constantes de `donnees.ts`. Trois conséquences, toutes mauvaises :
 *
 *   1. une seule mutation accidentelle, n'importe où, corromprait la source pour toute
 *      la durée de vie de l'onglet — et la réinitialisation rendrait alors l'état
 *      corrompu, en croyant rendre l'original ;
 *   2. `reinitialiser` renverrait le MÊME objet que l'état courant si l'on n'a encore
 *      rien fait. React compare par identité : il n'aurait rien re-rendu ;
 *   3. deux instances d'état — deux providers montés dans un même test, ou deux appels
 *      successifs — partageraient les mêmes références.
 *
 * (Ce troisième point ne concerne PAS deux onglets de navigateur : chacun a son propre
 * tas mémoire et sa propre copie du module. C'est bien le partage de références au sein
 * d'un même environnement qui pose problème.)
 *
 * La fabrique recrée toutes les structures imbriquées à chaque appel. Le coût est de
 * quelques microsecondes ; le bénéfice est qu'il n'existe plus une seule référence
 * partagée entre l'état vivant et les données de départ.
 */
export function creerEtatDemoInitial(): EtatDemo {
  return {
    // Chaque objet est recopié, pas seulement le tableau : un `[...ADHERENTS]` aurait
    // laissé les fiches elles-mêmes partagées avec le module.
    adherents: ADHERENTS_INITIAUX.map((a) => ({ ...a, infos: { ...a.infos } })),
    adhesions: ADHESIONS_INITIALES.map((a) => ({ ...a })),
    reglements: REGLEMENTS_INITIAUX.map((r) => ({ ...r })),
    pieces: PIECES_INITIALES.map((p) => ({ ...p })),
    questionnaires: QUESTIONNAIRES_INITIAUX.map((q) => ({ ...q })),
    cours: COURS_INITIAUX.map((c) => ({ ...c, creneaux: c.creneaux.map((k) => ({ ...k })) })),
    campagnes: CAMPAGNES_INITIALES.map((c) => ({
      ...c,
      destinataires: c.destinataires.map((d) => ({ ...d })),
    })),
    actualites: ACTUALITES_INITIALES.map((a) => ({ ...a })),
    presences: PRESENCES_INITIALES.map((p) => ({ ...p })),
    remises: [],
    form: {
      pages: FORM_CONFIG_INITIALE.pages.map((p) => ({ ...p, champs: p.champs.map((c) => ({ ...c })) })),
      pieces: FORM_CONFIG_INITIALE.pieces.map((p) => ({ ...p })),
      remises: FORM_CONFIG_INITIALE.remises.map((r) => ({ ...r })),
      autorisations: FORM_CONFIG_INITIALE.autorisations.map((a) => ({ ...a })),
      sante: FORM_CONFIG_INITIALE.sante,
    },
    site: {
      ordre: [...PAGE_CONFIG_INITIALE.ordre],
      masquees: [...PAGE_CONFIG_INITIALE.masquees],
      custom: PAGE_CONFIG_INITIALE.custom.map((c) => ({ ...c })),
    },
    compteur: 0,
    confirmation: null,
  };
}

export type ActionDemo =
  | { type: "reinitialiser" }
  | { type: "confirmation/effacer" }
  | { type: "adherent/modifier"; id: string; prenom: string; nom: string; email: string; telephone: string }
  | { type: "adherent/ajouter"; prenom: string; nom: string; email: string; telephone: string; coursId: string; mode: string }
  | { type: "adherent/importer"; lignes: { prenom: string; nom: string; email: string; telephone: string; coursId: string | null }[] }
  | { type: "adherent/anonymiser"; id: string }
  | { type: "saison/renouveler" }
  | { type: "reglement/ajouter"; adhesionId: string; montantCentimes: number; mode: ModeReglement; note: string | null }
  | { type: "remboursement/simuler"; adhesionId: string; montantCentimes: number | null }
  | { type: "piece/basculer"; id: string }
  | { type: "cheques/remettre"; ids: string[] }
  | { type: "presence/marquer"; adherentId: string }
  | { type: "campagne/ajouter"; objet: string; corps: string; groupeLibelle: string; emails: string[] }
  | { type: "campagne/avancer"; id: string }
  | { type: "cours/ajouter"; nom: string; tarifCentimes: number }
  | { type: "cours/modifier"; id: string; nom: string; publicCible: string; tarifCentimes: number; placesMax: number | null; creneaux: Creneau[] }
  | { type: "cours/supprimer"; id: string }
  | { type: "listeAttente/promouvoir"; adhesionId: string }
  | { type: "actualite/publier"; titre: string; texte: string; publieLe: string; aUneImage: boolean }
  | { type: "actualite/supprimer"; id: string }
  | { type: "form/page-ajouter" }
  | { type: "form/page-renommer"; id: string; titre: string }
  | { type: "form/page-deplacer"; id: string; sens: -1 | 1 }
  | { type: "form/page-supprimer"; id: string }
  | { type: "form/champ-ajouter"; pageId: string }
  | { type: "form/champ-modifier"; pageId: string; champId: string; champ: Partial<ChampDemo> }
  | { type: "form/champ-deplacer"; pageId: string; champId: string; sens: -1 | 1 }
  | { type: "form/champ-supprimer"; pageId: string; champId: string }
  | { type: "form/piece-ajouter" }
  | { type: "form/piece-modifier"; id: string; piece: Partial<PieceFormDemo> }
  | { type: "form/piece-deplacer"; id: string; sens: -1 | 1 }
  | { type: "form/piece-supprimer"; id: string }
  | { type: "form/remise-ajouter" }
  | { type: "form/remise-modifier"; id: string; remise: Partial<RemiseFormDemo> }
  | { type: "form/remise-supprimer"; id: string }
  | { type: "form/autorisation-ajouter" }
  | { type: "form/autorisation-modifier"; id: string; autorisation: Partial<AutorisationDemo> }
  | { type: "form/autorisation-supprimer"; id: string }
  | { type: "form/sante"; actif: boolean }
  | { type: "form/appliquer" }
  | { type: "site/deplacer"; cle: string; sens: -1 | 1 }
  | { type: "site/retirer"; cle: string }
  | { type: "site/reafficher"; cle: string }
  | { type: "site/chapitre-ajouter"; typeChapitre: string; titre: string; texte: string }
  | { type: "site/chapitre-supprimer"; id: string }
  | { type: "site/appliquer" };

/** Échange deux voisins. Même sémantique que le `move()` du vrai atelier. */
function deplacer<T>(arr: T[], i: number, sens: -1 | 1): T[] {
  const j = i + sens;
  if (i < 0 || j < 0 || j >= arr.length) return arr;
  const copie = [...arr];
  [copie[i], copie[j]] = [copie[j], copie[i]];
  return copie;
}

export function totalRegle(etat: EtatDemo, adhesionId: string): number {
  return etat.reglements.filter((r) => r.adhesion_id === adhesionId).reduce((s, r) => s + r.montant_centimes, 0);
}

export function resteDu(etat: EtatDemo, a: AdhesionDemo): number {
  return Math.max(a.montant_centimes - totalRegle(etat, a.id), 0);
}

export function reducteurDemo(etat: EtatDemo, action: ActionDemo): EtatDemo {
  const n = etat.compteur + 1;
  const id = (prefixe: string) => `${prefixe}-sim${n}`;

  switch (action.type) {
    case "reinitialiser":
      // La fabrique, pas une constante : on veut des références NEUVES, sinon un état
      // déjà corrompu se réinitialiserait sur lui-même sans que rien ne bouge.
      return creerEtatDemoInitial();

    case "confirmation/effacer":
      return { ...etat, confirmation: null };

    // ——— Adhérents ———————————————————————————————————————————————————————————

    case "adherent/modifier":
      return {
        ...etat,
        adherents: etat.adherents.map((a) =>
          a.id === action.id
            ? {
                ...a,
                // Mêmes troncatures que le serveur réel : 80 / 80 / 160 / 30.
                prenom: action.prenom.slice(0, 80),
                nom: action.nom.slice(0, 80),
                email: action.email.slice(0, 160) || null,
                telephone: action.telephone.slice(0, 30) || null,
              }
            : a
        ),
        confirmation: "Fiche modifiée dans la simulation. Aucune donnée n’a été enregistrée.",
      };

    case "adherent/ajouter": {
      const cours = etat.cours.find((c) => c.id === action.coursId);
      const adherentId = id("a");
      const nouvel: AdherentDemo = {
        id: adherentId,
        prenom: action.prenom.slice(0, 80),
        nom: action.nom.slice(0, 80),
        email: action.email.slice(0, 160) || null,
        telephone: action.telephone.slice(0, 30) || null,
        created_at: AUJOURDHUI,
        infos: {},
      };
      // Le tarif est relu depuis le cours, JAMAIS pris dans le formulaire — même règle
      // que la Server Action réelle. Et c'est LE TARIF, sans supplément : aucun forfait
      // d'adhésion n'existe dans Klubster.
      //
      // SANS COURS, PAS D'ADHÉSION. `ajouterAdherent` enveloppe toute la création dans
      // `if (coursId)`. Un adhérent créé sans cours existe donc bel et bien, avec zéro
      // adhésion — c'est le cas « Sans adhésion » de la liste, et il faut pouvoir
      // l'atteindre.
      const adhesions = cours
        ? [
            ...etat.adhesions,
            {
              id: id("ad"),
              adherent_id: adherentId,
              cours_id: cours.id,
              saison: CLUB.saison,
              statut: "en_attente" as const,
              montant_centimes: cours.tarif_centimes,
              mode_paiement: action.mode,
              created_at: AUJOURDHUI,
              stripe_payment_intent: null,
            },
          ]
        : etat.adhesions;
      // AUCUNE PIÈCE N'EST CRÉÉE ICI, et c'est vérifié en base : sur les vingt-et-une
      // RPC du projet, `register_adherent_full` est la SEULE à écrire dans
      // `pieces_adherent`, et aucun trigger ne le fait (relevé le 31/07/2026).
      //
      // Autrement dit : les pièces naissent de l'INSCRIPTION EN LIGNE, où l'adhérent
      // s'engage à les fournir. Une fiche saisie au forum des associations par un
      // bénévole n'en crée pas — le club sait déjà ce qu'il a reçu.
      //
      // J'en créais systématiquement. Conséquence : ajouter quelqu'un faisait monter les
      // « pièces attendues » et les dossiers incomplets du hub, alors que le même geste
      // dans Klubster ne les touche pas.
      return {
        ...etat,
        adherents: [...etat.adherents, nouvel],
        adhesions,
        compteur: n,
        confirmation: `${nouvel.prenom} ${nouvel.nom} a été ajouté à la simulation. Aucune donnée n’a été enregistrée.`,
      };
    }

    case "adherent/importer": {
      // Les doublons sont ignorés, comme à l'import réel : même email, ou mêmes prénom
      // et nom. Le décompte des ignorés est ce que l'écran de résultat annonce.
      const existants = new Set(
        etat.adherents.flatMap((a) => [a.email?.toLowerCase() ?? "", `${a.prenom}|${a.nom}`.toLowerCase()])
      );
      // Pas de pièces non plus ici : `inserer_adherents_adhesions` ne mentionne même pas
      // `pieces_adherent` — vérifié sur le corps de la fonction en production. Son nom
      // le dit d'ailleurs : adhérents ET adhésions, rien de plus.
      const nouveaux: AdherentDemo[] = [];
      const nouvellesAdhesions: AdhesionDemo[] = [];
      let compteur = n;

      for (const l of action.lignes) {
        const cleEmail = l.email.toLowerCase();
        const cleNom = `${l.prenom}|${l.nom}`.toLowerCase();
        if (!l.prenom || !l.nom) continue;
        if ((cleEmail && existants.has(cleEmail)) || existants.has(cleNom)) continue;
        if (cleEmail) existants.add(cleEmail);
        existants.add(cleNom);

        const aid = `a-imp${compteur}`;
        compteur += 1;
        nouveaux.push({
          id: aid,
          prenom: l.prenom.slice(0, 80),
          nom: l.nom.slice(0, 80),
          email: l.email.slice(0, 160) || null,
          telephone: l.telephone.slice(0, 30) || null,
          created_at: AUJOURDHUI,
          infos: {},
        });
        const cours = etat.cours.find((c) => c.id === l.coursId);
        if (cours) {
          nouvellesAdhesions.push({
            id: `ad-imp${compteur}`,
            adherent_id: aid,
            cours_id: cours.id,
            saison: CLUB.saison,
            statut: "en_attente",
            montant_centimes: cours.tarif_centimes,
            mode_paiement: null,
            created_at: AUJOURDHUI,
            stripe_payment_intent: null,
          });
        }
      }

      const ignores = action.lignes.length - nouveaux.length;
      return {
        ...etat,
        adherents: [...etat.adherents, ...nouveaux],
        adhesions: [...etat.adhesions, ...nouvellesAdhesions],
        compteur,
        confirmation:
          `${nouveaux.length} adhérent${nouveaux.length > 1 ? "s" : ""} importé${nouveaux.length > 1 ? "s" : ""} dans la simulation` +
          (ignores > 0 ? `, ${ignores} ligne${ignores > 1 ? "s" : ""} ignorée${ignores > 1 ? "s" : ""}.` : ".") +
          " Aucune donnée n’a été enregistrée.",
      };
    }

    case "adherent/anonymiser": {
      // Comme le produit : on efface l'identité, on GARDE les écritures comptables.
      // Les règlements restent, l'adhésion reste, seul le nom disparaît.
      return {
        ...etat,
        adherents: etat.adherents.map((a) =>
          a.id === action.id
            ? { ...a, prenom: "Adhérent", nom: "anonymisé", email: null, telephone: null, infos: {}, anonymise: true }
            : a
        ),
        questionnaires: etat.questionnaires.filter((q) => q.adherent_id !== action.id),
        confirmation:
          "Anonymisation simulée. Les écritures comptables sont conservées, comme l’exige la loi. Rechargez ou réinitialisez pour revenir en arrière.",
      };
    }

    case "saison/renouveler": {
      // « Recrée une adhésion "en attente" pour chaque adhérent qui n'en a pas encore
      // cette saison, avec son dernier cours. »
      //
      // IDEMPOTENT, et c'est tout l'intérêt : un président clique deux fois par
      // prudence. La RPC réelle ne crée rien pour qui a déjà une adhésion de la saison
      // courante. Un second clic doit donc annoncer zéro, pas doubler l'effectif.
      const saison = CLUB.saison;
      const dejaCetteSaison = new Set(
        etat.adhesions.filter((a) => a.saison === saison).map((a) => a.adherent_id)
      );

      let compteur = n;
      const nouvelles: AdhesionDemo[] = [];
      for (const adherent of etat.adherents) {
        if (dejaCetteSaison.has(adherent.id)) continue;
        // Le DERNIER cours de la personne, pas un cours au hasard : c'est ce que dit
        // le libellé, et c'est ce qui rend le geste utilisable sans relecture.
        const derniere = etat.adhesions
          .filter((a) => a.adherent_id === adherent.id && a.cours_id)
          .sort((x, y) => (x.created_at < y.created_at ? 1 : -1))[0];
        if (!derniere) continue;
        const cours = etat.cours.find((c) => c.id === derniere.cours_id);
        if (!cours) continue;
        nouvelles.push({
          id: `ad-ren${compteur}`,
          adherent_id: adherent.id,
          cours_id: cours.id,
          saison,
          statut: "en_attente",
          montant_centimes: cours.tarif_centimes,
          mode_paiement: null,
          created_at: AUJOURDHUI,
          stripe_payment_intent: null,
        });
        compteur += 1;
      }

      return {
        ...etat,
        adhesions: [...etat.adhesions, ...nouvelles],
        compteur,
        confirmation:
          nouvelles.length === 0
            ? "Tout le monde a déjà une adhésion pour la saison en cours."
            : `${nouvelles.length} adhésion(s) créée(s) pour la nouvelle saison, en attente de règlement.`,
      };
    }

    // ——— Argent ——————————————————————————————————————————————————————————————

    case "reglement/ajouter": {
      const reglement: ReglementDemo = {
        id: id("r"),
        adhesion_id: action.adhesionId,
        montant_centimes: action.montantCentimes,
        mode: action.mode,
        note: action.note,
        created_at: AUJOURDHUI,
        remis_le: null,
      };
      const reglements = [...etat.reglements, reglement];
      // Le statut est RECALCULÉ, pas décidé par l'appelant : une adhésion passe « payé »
      // quand le total réglé atteint le montant dû, et pas avant.
      const adhesions = etat.adhesions.map((a) => {
        if (a.id !== action.adhesionId) return a;
        const paye = reglements.filter((r) => r.adhesion_id === a.id).reduce((s, r) => s + r.montant_centimes, 0);
        return { ...a, statut: paye >= a.montant_centimes ? ("paye" as const) : a.statut, mode_paiement: action.mode };
      });
      const cible = adhesions.find((a) => a.id === action.adhesionId);
      const reste = cible
        ? Math.max(cible.montant_centimes - reglements.filter((r) => r.adhesion_id === cible.id).reduce((s, r) => s + r.montant_centimes, 0), 0)
        : 0;
      return {
        ...etat,
        reglements,
        adhesions,
        compteur: n,
        confirmation:
          reste > 0
            ? `Encaissement simulé. Il reste ${eur(reste)} à régler. Aucune donnée n’a été enregistrée.`
            : "Encaissement simulé — la cotisation est soldée. Aucune donnée n’a été enregistrée.",
      };
    }

    case "remboursement/simuler": {
      const adhesion = etat.adhesions.find((a) => a.id === action.adhesionId);
      if (!adhesion) return etat;
      const montant = action.montantCentimes ?? adhesion.montant_centimes;
      // Le produit enregistre le remboursement en négatif, une fois Stripe confirmé.
      return {
        ...etat,
        reglements: [
          ...etat.reglements,
          {
            id: id("r"),
            adhesion_id: adhesion.id,
            montant_centimes: -Math.min(montant, adhesion.montant_centimes),
            mode: "en_ligne",
            note: "Remboursement",
            created_at: AUJOURDHUI,
            remis_le: null,
          },
        ],
        compteur: n,
        confirmation:
          "Remboursement simulé. Aucune demande n’a été transmise à Stripe, et aucune carte n’a été recréditée.",
      };
    }

    case "cheques/remettre": {
      if (action.ids.length === 0) return etat;
      return {
        ...etat,
        reglements: etat.reglements.map((r) => (action.ids.includes(r.id) ? { ...r, remis_le: AUJOURDHUI } : r)),
        remises: [...etat.remises, { id: id("rem"), date: AUJOURDHUI, reglementIds: action.ids }],
        compteur: n,
        confirmation: `Remise simulée de ${action.ids.length} chèque${action.ids.length > 1 ? "s" : ""}. Aucun bordereau n’a été transmis à une banque.`,
      };
    }

    // ——— Dossiers et présences ————————————————————————————————————————————————

    case "piece/basculer":
      return {
        ...etat,
        pieces: etat.pieces.map((p) =>
          p.id === action.id ? { ...p, statut: p.statut === "recue" ? ("manquante" as const) : ("recue" as const) } : p
        ),
      };

    case "presence/marquer": {
      // Idempotent, comme la RPC `marquer_present` : `on conflict do nothing`.
      const deja = etat.presences.some((p) => p.adherent_id === action.adherentId && p.jour === AUJOURDHUI);
      if (deja) return etat;
      return {
        ...etat,
        presences: [...etat.presences, { adherent_id: action.adherentId, jour: AUJOURDHUI }],
        confirmation: "Présence simulée. Elle disparaît au rechargement.",
      };
    }

    // ——— Messages ————————————————————————————————————————————————————————————

    case "campagne/ajouter": {
      // Les destinataires naissent « préparés ». `campagne/avancer` les fera passer à
      // accepté puis distribué, avec un rejet toutes les vingt adresses : l'ordre de
      // grandeur réel d'un carnet d'adresses de club.
      const campagne: CampagneDemo = {
        id: id("m"),
        objet: action.objet,
        corps: action.corps,
        groupe_libelle: action.groupeLibelle,
        auteur_nom: CLUB.president,
        statut: "en_cours",
        created_at: `${AUJOURDHUI}T19:05:00`,
        destinataires: action.emails.map((email, i) => ({ id: `${id("d")}-${i}`, email, statut: "prepare" as const })),
      };
      return {
        ...etat,
        campagnes: [campagne, ...etat.campagnes],
        compteur: n,
        confirmation: `Envoi simulé à ${action.emails.length} destinataire${action.emails.length > 1 ? "s" : ""}. Aucun email n’a réellement été envoyé.`,
      };
    }

    case "campagne/avancer": {
      const campagnes = etat.campagnes.map((c) => {
        if (c.id !== action.id) return c;
        const destinataires = c.destinataires.map((d, i) => {
          if (d.statut === "prepare") return { ...d, statut: "accepte" as StatutDestinataire };
          if (d.statut === "accepte") {
            const rejete = i > 0 && i % 20 === 0;
            return { ...d, statut: (rejete ? "rejete" : "distribue") as StatutDestinataire };
          }
          return d;
        });
        const fini = destinataires.every((d) => d.statut !== "prepare" && d.statut !== "accepte");
        const desErreurs = destinataires.some((d) => d.statut === "rejete" || d.statut === "echec");
        return {
          ...c,
          destinataires,
          statut: fini ? ((desErreurs ? "partiel" : "envoye") as CampagneDemo["statut"]) : c.statut,
        };
      });
      return { ...etat, campagnes };
    }

    // ——— Cours ———————————————————————————————————————————————————————————————

    case "cours/ajouter":
      return {
        ...etat,
        cours: [
          ...etat.cours,
          { id: id("c"), nom: action.nom.slice(0, 120), public_cible: null, tarif_centimes: Math.max(action.tarifCentimes, 0), places_max: null, creneaux: [] },
        ],
        compteur: n,
        confirmation: `Le cours « ${action.nom} » a été créé dans la simulation. Aucune donnée n’a été enregistrée.`,
      };

    case "cours/modifier":
      return {
        ...etat,
        cours: etat.cours.map((c) =>
          c.id === action.id
            ? {
                ...c,
                nom: action.nom.slice(0, 120),
                public_cible: action.publicCible.trim() ? action.publicCible.slice(0, 120) : null,
                tarif_centimes: Math.max(action.tarifCentimes, 0),
                places_max: action.placesMax,
                creneaux: action.creneaux.slice(0, 10).map((cr) => ({ ...cr, note: cr.note.slice(0, 60) })),
              }
            : c
        ),
        confirmation: "Cours modifié dans la simulation. Aucune donnée n’a été enregistrée.",
      };

    case "cours/supprimer": {
      // Même refus que le serveur réel : un cours qui compte des adhérents n'est pas
      // supprimable, leurs dossiers y sont rattachés.
      if (etat.adhesions.some((a) => a.cours_id === action.id)) return etat;
      return { ...etat, cours: etat.cours.filter((c) => c.id !== action.id), confirmation: "Cours supprimé de la simulation." };
    }

    case "listeAttente/promouvoir":
      return {
        ...etat,
        adhesions: etat.adhesions.map((a) => (a.id === action.adhesionId ? { ...a, statut: "en_attente" as const } : a)),
        confirmation: "Place donnée dans la simulation. Aucun email n’a réellement été envoyé.",
      };

    // ——— Actualités ——————————————————————————————————————————————————————————
    // Créer et supprimer, rien d'autre : le produit n'a ni édition, ni brouillon, ni
    // réordonnancement. Son code le dit — « Pas d'édition en v1 : supprimer puis
    // republier fait le travail. » La démonstration s'y tient.

    case "actualite/publier":
      return {
        ...etat,
        actualites: [
          { id: id("n"), titre: action.titre.slice(0, 120), texte: action.texte.slice(0, 5000), publie_le: action.publieLe, aUneImage: action.aUneImage },
          ...etat.actualites,
        ].sort((a, b) => (a.publie_le < b.publie_le ? 1 : -1)),
        compteur: n,
        confirmation: "Actualité publiée dans la simulation — visible sur la vitrine fictive. Aucun site réel n’a été modifié.",
      };

    case "actualite/supprimer":
      return {
        ...etat,
        actualites: etat.actualites.filter((a) => a.id !== action.id),
        confirmation: "Actualité supprimée de la simulation.",
      };

    // ——— Atelier du formulaire ———————————————————————————————————————————————

    case "form/page-ajouter":
      return {
        ...etat,
        form: { ...etat.form, pages: [...etat.form.pages, { id: id("pg"), titre: `Page ${etat.form.pages.length + 1}`, champs: [] }] },
        compteur: n,
      };

    case "form/page-renommer":
      return { ...etat, form: { ...etat.form, pages: etat.form.pages.map((p) => (p.id === action.id ? { ...p, titre: action.titre } : p)) } };

    case "form/page-deplacer":
      return { ...etat, form: { ...etat.form, pages: deplacer(etat.form.pages, etat.form.pages.findIndex((p) => p.id === action.id), action.sens) } };

    case "form/page-supprimer":
      return { ...etat, form: { ...etat.form, pages: etat.form.pages.filter((p) => p.id !== action.id) } };

    case "form/champ-ajouter":
      return {
        ...etat,
        form: {
          ...etat.form,
          pages: etat.form.pages.map((p) =>
            p.id === action.pageId ? { ...p, champs: [...p.champs, { id: id("ch"), type: "texte" as const, label: "", obligatoire: true }] } : p
          ),
        },
        compteur: n,
      };

    case "form/champ-modifier":
      return {
        ...etat,
        form: {
          ...etat.form,
          pages: etat.form.pages.map((p) =>
            p.id === action.pageId ? { ...p, champs: p.champs.map((c) => (c.id === action.champId ? { ...c, ...action.champ } : c)) } : p
          ),
        },
      };

    case "form/champ-deplacer":
      return {
        ...etat,
        form: {
          ...etat.form,
          pages: etat.form.pages.map((p) =>
            p.id === action.pageId ? { ...p, champs: deplacer(p.champs, p.champs.findIndex((c) => c.id === action.champId), action.sens) } : p
          ),
        },
      };

    case "form/champ-supprimer":
      return {
        ...etat,
        form: {
          ...etat.form,
          pages: etat.form.pages.map((p) => (p.id === action.pageId ? { ...p, champs: p.champs.filter((c) => c.id !== action.champId) } : p)),
        },
      };

    case "form/piece-ajouter":
      return { ...etat, form: { ...etat.form, pieces: [...etat.form.pieces, { id: id("pf"), label: "", obligatoire: true, cours_id: null }] }, compteur: n };

    case "form/piece-modifier":
      return { ...etat, form: { ...etat.form, pieces: etat.form.pieces.map((p) => (p.id === action.id ? { ...p, ...action.piece } : p)) } };

    case "form/piece-deplacer":
      return { ...etat, form: { ...etat.form, pieces: deplacer(etat.form.pieces, etat.form.pieces.findIndex((p) => p.id === action.id), action.sens) } };

    case "form/piece-supprimer":
      return { ...etat, form: { ...etat.form, pieces: etat.form.pieces.filter((p) => p.id !== action.id) } };

    case "form/remise-ajouter":
      return { ...etat, form: { ...etat.form, remises: [...etat.form.remises, { id: id("rm"), label: "", montant_centimes: 0, exigeCode: false, description: "" }] }, compteur: n };

    case "form/remise-modifier":
      return { ...etat, form: { ...etat.form, remises: etat.form.remises.map((r) => (r.id === action.id ? { ...r, ...action.remise } : r)) } };

    case "form/remise-supprimer":
      return { ...etat, form: { ...etat.form, remises: etat.form.remises.filter((r) => r.id !== action.id) } };

    case "form/autorisation-ajouter":
      return { ...etat, form: { ...etat.form, autorisations: [...etat.form.autorisations, { id: id("au"), label: "", obligatoire: false }] }, compteur: n };

    case "form/autorisation-modifier":
      return { ...etat, form: { ...etat.form, autorisations: etat.form.autorisations.map((a) => (a.id === action.id ? { ...a, ...action.autorisation } : a)) } };

    case "form/autorisation-supprimer":
      return { ...etat, form: { ...etat.form, autorisations: etat.form.autorisations.filter((a) => a.id !== action.id) } };

    case "form/sante":
      return { ...etat, form: { ...etat.form, sante: action.actif } };

    case "form/appliquer":
      return { ...etat, confirmation: "Formulaire appliqué à la simulation. Le vrai formulaire de votre club n’a pas été modifié." };

    // ——— Vitrine —————————————————————————————————————————————————————————————

    case "site/deplacer":
      return { ...etat, site: { ...etat.site, ordre: deplacer(etat.site.ordre, etat.site.ordre.indexOf(action.cle), action.sens) } };

    case "site/retirer":
      return { ...etat, site: { ...etat.site, masquees: [...etat.site.masquees, action.cle] } };

    case "site/reafficher":
      return { ...etat, site: { ...etat.site, masquees: etat.site.masquees.filter((c) => c !== action.cle) } };

    case "site/chapitre-ajouter":
      return {
        ...etat,
        site: { ...etat.site, custom: [...etat.site.custom, { id: id("cx"), type: action.typeChapitre, titre: action.titre, texte: action.texte }] },
        compteur: n,
        confirmation: "Chapitre ajouté à la simulation. Aucun site réel n’a été modifié.",
      };

    case "site/chapitre-supprimer":
      return { ...etat, site: { ...etat.site, custom: etat.site.custom.filter((c) => c.id !== action.id) } };

    case "site/appliquer":
      return { ...etat, confirmation: "Modifications appliquées à la simulation. Rien n’est publié : elles disparaissent au rechargement." };

    default:
      return etat;
  }
}
