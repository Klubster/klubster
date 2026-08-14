/**
 * Le club de démonstration — données entièrement fictives, état initial de la simulation.
 *
 * AUCUNE DONNÉE RÉELLE. Les personnes, les montants, les messages et les dates sont
 * inventés ; toutes les adresses sont en `@example.com`, domaine réservé par la RFC 2606
 * et qui n'appartiendra jamais à personne. Le vocabulaire, les cours et les tarifs sont
 * en revanche calés sur de vrais clubs de judo français : c'est ce qui fait qu'un
 * président reconnaît son métier au lieu de lire une maquette.
 *
 * POURQUOI UN CLUB DE JUDO, ET AVEC DES ENFANTS
 * `/demo` est le premier argument commercial de Klubster, et les clubs qu'il faut
 * convaincre sont d'abord des clubs de sports de combat. Or ce qu'un président de judo
 * ouvre le mercredi soir, ce n'est pas un tableau d'adultes autonomes : ce sont des
 * dossiers d'enfants — autorisation parentale à réclamer, questionnaire de santé signé
 * par un parent, un père à joindre parce que la mère ne répond pas. Une démonstration qui
 * n'aurait aucun mineur ne montrerait pas le travail réel. Vingt-quatre des trente-quatre
 * licenciés de ce club sont donc mineurs, ce qui est la proportion ordinaire d'un club
 * de judo de quartier.
 *
 * CE CLUB N'EST PAS LE PRODUIT. Klubster n'est pas un logiciel de judo, ni de sports de
 * combat : les mêmes écrans servent une chorale ou un club de randonnée. Le judo est ici
 * un décor crédible, pas une spécialisation — rien dans le code de `/demo` ne connaît de
 * ceinture ni de tatami, tout vient de ces données.
 */

import { estMineur } from "@/lib/sante";
import type {
  ActualiteDemo, AdherentDemo, AdhesionDemo, AutorisationDemo, CampagneDemo, CoursDemo,
  FormConfigDemo, PageConfigDemo, PieceDemo, PresenceDemo, QuestionnaireDemo, ReglementDemo,
} from "./types";

export const CLUB = {
  nom: "Judo Club des Peupliers",
  ville: "Laval",
  couleur: "#4F86C6", // bleu tatami — la couleur du club, pas celle de Klubster
  /**
   * La même couleur, assombrie jusqu'au contraste.
   *
   * POURQUOI DEUX VALEURS, ET LAQUELLE VA OÙ
   * `couleur` est ce que le club a choisi. Elle vaut environ 3,7:1 sur le papier : assez
   * pour un filet, une puce ou un liseré, pas pour du texte de 13 px ni pour du blanc
   * posé dessus. `couleurTexte` mesure 9,1:1 sur le papier et 9,3:1 sous du blanc — elle
   * porte donc les libellés, les statuts et les fonds de bouton.
   *
   * La distinction vient d'un défaut du produit réel, consigné dans
   * `docs/defauts-a-corriger.md` : le scanner pose `organisations.couleur_primaire`
   * directement en couleur de texte, sans rien qui contraigne cette valeur. Un bleu clair
   * — exactement celui qu'un club de judo choisit pour rappeler son tatami — devient
   * alors illisible.
   *
   * La démonstration ne reproduit PAS ce défaut. Reproduire fidèlement une
   * non-conformité d'accessibilité, ce n'est plus de la fidélité : c'est la propager sur
   * une page publique, en la présentant comme le produit.
   */
  couleurTexte: "#22496E",
  saison: "2026-2027",
  president: "Sébastien Delcourt",
  email: "contact@example.com",
  telephone: "02 43 00 00 00",
  adresse: "14 rue des Peupliers, 53000 Laval",
  // Les textes de la vitrine — `organisations.sport`, `accroche`, `presentation` et
  // `infos_pratiques`. Ils sont ici parce que la démonstration montre le site du club,
  // pas seulement son cockpit : sans eux, le chapitre « Le club » ne s'afficherait pas
  // (le produit le saute quand `presentation` est vide) et la page serait fausse d'une
  // façon difficile à voir.
  sport: "Judo",
  accroche: "On apprend d’abord à tomber.",
  presentation:
    "Le Judo Club des Peupliers enseigne le judo aux enfants du quartier depuis 1978, dans le dojo du gymnase Jean-Moulin. Six créneaux par semaine, de l’éveil à quatre ans au taïso des adultes, et la même règle pour tout le monde : on salue en montant sur le tapis, on salue en descendant.",
  infosPratiques:
    "Judogi obligatoire à partir du deuxième cours ; le club en prête pour l’essai. Ongles courts, pieds propres, aucun bijou sur le tapis. Les parents peuvent rester derrière la vitre du dojo pendant les cours des plus jeunes.",
} as const;

/**
 * L'horloge figée de la démonstration.
 *
 * `AUJOURDHUI` sert aux comparaisons de dates (« inscriptions · 7 jours », date d'un
 * règlement) ; `INSTANT_DEMO` sert à l'affichage.
 *
 * POURQUOI UN INSTANT COMPLET, ET PAS SEULEMENT UNE DATE
 * `new Date("2026-10-20")` est interprété à MINUIT UTC. Sur une machine à l'ouest de
 * Greenwich, c'est encore le 19 octobre — un lundi au lieu d'un mardi. Le jour affiché,
 * et donc les cours du jour, dépendaient du fuseau de la machine : exactement ce que
 * « rendu déterministe » prétendait exclure. Un instant explicite à midi UTC, lu avec
 * `timeZone: "Europe/Paris"`, ne bouge nulle part.
 *
 * 17 h UTC = 19 h à Paris en octobre (CEST) : la salutation est « Bonsoir », et le cours
 * des poussins du mardi est en train de finir — c'est l'heure exacte où un président
 * ouvre son écran, entre deux groupes.
 */
export const AUJOURDHUI = "2026-10-20";
export const INSTANT_DEMO = "2026-10-20T17:00:00Z";

/**
 * Le décalage horaire de Paris aux dates de la démonstration.
 *
 * Toutes les dates de la simulation tombent en octobre 2026, avant le changement d'heure
 * du dimanche 25 : l'heure d'été d'Europe centrale est encore en vigueur, soit UTC+2.
 *
 * POURQUOI IL EST ÉCRIT, ET NON DÉDUIT
 * `new Date("2026-10-14T18:12:00")` — sans décalage — est lu dans le fuseau de la
 * MACHINE. Sur un serveur en UTC l'instant n'est pas le même que sur un poste à Paris ou
 * à New York, et l'heure affichée pour un message envoyé changeait donc d'un
 * environnement à l'autre : rendu serveur et rendu client divergeaient, et deux visiteurs
 * ne voyaient pas la même chose. Avec un décalage explicite, l'instant est absolu, et la
 * lecture en `timeZone: "Europe/Paris"` rend « 14 octobre à 18 h 12 » partout.
 *
 * Une déduction automatique aurait été plus savante et moins sûre : elle demanderait de
 * réimplémenter les règles de bascule, pour une horloge figée à une seule date.
 */
export const DECALAGE_PARIS = "+02:00";

/**
 * Mineur ou majeur, à l'heure figée de la démonstration.
 *
 * C'EST LA FONCTION DU PRODUIT, pas une seconde. `estMineur` vit dans `src/lib/sante.ts`
 * et sert déjà au formulaire d'inscription et au serveur ; elle accepte une date de
 * référence, ce qui permet de la faire raisonner sur l'horloge figée plutôt que sur
 * l'heure de la machine. Recopier ici sa règle des dix-huit ans aurait créé deux vérités
 * qui finissent toujours par diverger d'un jour.
 *
 * POURQUOI AUCUNE DATE DE NAISSANCE N'EST EN OCTOBRE
 * `estMineur` lit le calendrier LOCAL de la machine. Une date de naissance tombant à un
 * jour de la date de référence pourrait donc basculer d'un an selon le fuseau, et un
 * adhérent changer de groupe entre le rendu serveur et le rendu navigateur. Aucune
 * naissance de ce club n'est en octobre : le décalage d'un jour ne peut rien changer.
 *
 * SANS DATE, MAJEUR. Une fiche saisie à la main n'en a pas ; le produit ne crée alors ni
 * pièce parentale ni entrée dans le groupe « Parents ». Deviner l'inverse enverrait un
 * courrier de convocation aux « parents » d'un adulte.
 */
export const estMineurDemo = (dateNaissance: string | null) =>
  dateNaissance !== null && estMineur(dateNaissance, new Date(INSTANT_DEMO));

// ——— Cours ————————————————————————————————————————————————————————————————————

export const COURS_INITIAUX: CoursDemo[] = [
  // SEPT PLACES, ET NON VINGT-DEUX. C'est le nombre d'inscrits que ce cours a réellement
  // dans les données ci-dessous : avec vingt-deux places, il restait quinze places
  // libres, et pourtant un enfant attendait en liste d'attente. La démonstration
  // affirmait alors une règle — « c'est la jauge, et rien d'autre, qui ouvre l'attente »
  // — que ses propres chiffres démentaient à l'écran. Sept poussins sur un tatami de
  // gymnase, c'est aussi ce que connaît un club de quartier.
  //
  // LE CRÉNEAU DU MARDI EST CELUI DE L'HORLOGE FIGÉE : à 19 h à Paris, le cours des
  // poussins vient de se terminer, trois enfants sont déjà passés au contrôle, et le
  // hub affiche ce cours-là. Un jour faux se verrait d'abord dans ce nom.
  { id: "c1", nom: "Judo poussins", public_cible: "6-8 ans", tarif_centimes: 19500, places_max: 7, creneaux: [{ jour: "mardi", debut: "18:00", fin: "19:00", note: "" }] },
  { id: "c2", nom: "Éveil judo", public_cible: "4-5 ans", tarif_centimes: 16500, places_max: 12, creneaux: [{ jour: "lundi", debut: "17:00", fin: "17:45", note: "sans chute" }] },
  { id: "c3", nom: "Judo benjamins", public_cible: null, tarif_centimes: 20500, places_max: 16, creneaux: [{ jour: "mercredi", debut: "17:45", fin: "19:00", note: "" }] },
  { id: "c4", nom: "Judo minimes et cadets", public_cible: "12-16 ans", tarif_centimes: 21500, places_max: 18, creneaux: [{ jour: "jeudi", debut: "19:00", fin: "20:30", note: "groupe compétition" }] },
  { id: "c5", nom: "Ju-jitsu adultes", public_cible: "Débutants bienvenus", tarif_centimes: 23500, places_max: 8, creneaux: [{ jour: "samedi", debut: "10:00", fin: "11:30", note: "" }] },
  { id: "c6", nom: "Taïso", public_cible: "Adultes — préparation physique", tarif_centimes: 17500, places_max: 14, creneaux: [{ jour: "vendredi", debut: "19:00", fin: "20:00", note: "renforcement, sans chute" }] },
];

/**
 * Le montant d'une adhésion EST le tarif du cours. Rien d'autre.
 *
 * J'avais ajouté « + 18 € d'adhésion à l'association », qui sonne juste — beaucoup de
 * clubs facturent ainsi — mais que Klubster ne fait pas : `ajouterAdherent` écrit
 * `montant_centimes: cours.tarif_centimes`, et aucun forfait n'existe ailleurs dans le
 * produit. Une démonstration où chaque cotisation vaut 18 € de plus qu'en réalité aurait
 * faussé tous les montants, tous les restes dus et tous les totaux — sous des écrans par
 * ailleurs corrects.
 *
 * La licence FFJDA, elle non plus, n'est pas ajoutée : un club qui la refacture crée un
 * cours ou relève son tarif, Klubster n'a pas de ligne pour ça.
 */
const t = (coursId: string) => COURS_INITIAUX.find((c) => c.id === coursId)?.tarif_centimes ?? 0;

// ——— Autorisations parentales ————————————————————————————————————————————————
// Elles sont déclarées ici, avant les adhérents, parce que chaque dossier de mineur en
// porte la trace : `register_adherent_full` reçoit dans `infos` une ligne
// « Autorisation — <libellé> » valant « Oui » ou « Non » pour CHACUNE des autorisations
// configurées. Le « Non » est aussi une information, et c'est même la plus importante des
// deux : un enfant qui ne doit pas quitter seul le dojo.

export const AUTORISATIONS_INITIALES: AutorisationDemo[] = [
  { id: "au1", label: "J’autorise les responsables du club à faire pratiquer les premiers soins et à appeler les secours.", obligatoire: true },
  { id: "au2", label: "J’autorise mon enfant à quitter seul le dojo à la fin du cours.", obligatoire: false },
  { id: "au3", label: "J’autorise le club à transporter mon enfant en voiture pour les compétitions.", obligatoire: false },
];

// ——— Adhérents ————————————————————————————————————————————————————————————————
// 34 fiches : au-delà des 25 d'une page, pour que la pagination se voie vraiment.
//
// Email ET téléphone peuvent manquer : un club a toujours quelques adhérents sans
// adresse — c'est ce qui rend crédible le « 33 destinataires avec un email » du
// composeur, et ce qui fait exister la mention « Pas d'email » sur les relances.
//
// POUR UN MINEUR, L'ADRESSE ET LE TÉLÉPHONE DE LA FICHE SONT CEUX DU PARENT. C'est ce
// que produit l'inscription réelle : le représentant légal crée le compte, saisit son
// email et son numéro, puis se déclare à nouveau dans le bloc « Responsable légal ». Le
// club écrit donc à des parents sans avoir à tenir deux carnets d'adresses — et le
// groupe « Parents (adhérents mineurs) » du composeur n'a rien d'autre à faire que de
// filtrer sur la date de naissance.

type Brut = {
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  inscritLe: string;
  coursId: string;
  statut: string;
  naissance: string;
  /** `null` pour un majeur. Sinon : qualité, prénom et nom du représentant légal. */
  responsable: { qualite: string; prenom: string; nom: string } | null;
};

const mineur = (
  prenom: string, nom: string, email: string | null, telephone: string | null,
  inscritLe: string, coursId: string, statut: string, naissance: string,
  qualite: string, respPrenom: string, respNom: string
): Brut => ({ prenom, nom, email, telephone, inscritLe, coursId, statut, naissance, responsable: { qualite, prenom: respPrenom, nom: respNom } });

const adulte = (
  prenom: string, nom: string, email: string | null, telephone: string | null,
  inscritLe: string, coursId: string, statut: string, naissance: string
): Brut => ({ prenom, nom, email, telephone, inscritLe, coursId, statut, naissance, responsable: null });

const BRUTS: Brut[] = [
  mineur("Lina", "Berthier", "sophie.berthier@example.com", "06 12 34 56 78", "2026-09-02", "c1", "paye", "2019-03-08", "Mère", "Sophie", "Berthier"),
  mineur("Adam", "Nguyen", "m.nguyen@example.com", "06 23 45 67 89", "2026-09-02", "c1", "en_attente", "2018-05-21", "Père", "Minh", "Nguyen"),
  mineur("Jules", "Leclerc", "camille.leclerc@example.com", null, "2026-09-03", "c1", "paye", "2018-11-27", "Mère", "Camille", "Leclerc"),
  mineur("Aya", "Benali", "nadia.benali@example.com", "06 34 56 78 90", "2026-09-03", "c3", "en_retard", "2016-05-02", "Mère", "Nadia", "Benali"),
  adulte("Claire", "Moreau", "claire.moreau@example.com", "06 45 67 89 01", "2026-09-04", "c5", "paye", "1988-04-11"),
  adulte("Jean-Paul", "Rousseau", "jp.rousseau@example.com", "02 43 11 22 33", "2026-09-04", "c6", "paye", "1963-02-17"),
  mineur("Iris", "Fontaine", "lea.fontaine@example.com", "06 56 78 90 12", "2026-09-05", "c2", "en_attente", "2022-01-24", "Mère", "Léa", "Fontaine"),
  mineur("Noah", "Dubois", "marc.dubois@example.com", null, "2026-09-05", "c3", "paye", "2015-06-30", "Père", "Marc", "Dubois"),
  mineur("Rayan", "Cherif", "n.cherif@example.com", "06 67 89 01 23", "2026-09-08", "c4", "en_attente", "2012-08-05", "Mère", "Nadia", "Cherif"),
  adulte("Béatrice", "Lemoine", "b.lemoine@example.com", "02 43 44 55 66", "2026-09-08", "c6", "paye", "1971-12-03"),
  mineur("Gaspard", "Garnier", "p.garnier@example.com", "06 78 90 12 34", "2026-09-09", "c1", "en_attente", "2018-09-14", "Père", "Pierre", "Garnier"),
  // Ce dossier-là n'a QUE la liste d'attente, et c'est exactement ce que produit le
  // produit : quand la jauge est pleine, `register_adherent_full` crée une seule
  // adhésion, au statut `liste_attente`. Rien à encaisser, rien à relancer.
  mineur("Mila", "Roux", "emilie.roux@example.com", "06 89 01 23 45", "2026-09-09", "c1", "liste_attente", "2019-07-21", "Mère", "Émilie", "Roux"),
  adulte("Sarah", "Petit", "sarah.petit@example.com", "06 90 12 34 56", "2026-09-10", "c5", "paye", "1994-03-16"),
  mineur("Anouk", "Mercier", "a.mercier@example.com", null, "2026-09-10", "c3", "paye", "2017-04-09", "Père", "Antoine", "Mercier"),
  mineur("Ibrahim", "Diallo", "fatou.diallo@example.com", "06 01 23 45 67", "2026-09-11", "c4", "paye", "2011-05-28", "Mère", "Fatou", "Diallo"),
  adulte("Michel", "Chevalier", null, "02 43 77 88 99", "2026-09-11", "c6", "paye", "1958-01-30"),
  mineur("Elena", "Barbier", "julie.barbier@example.com", "06 11 22 33 44", "2026-09-12", "c2", "en_attente", "2021-02-11", "Mère", "Julie", "Barbier"),
  mineur("Sacha", "Haddad", "k.haddad@example.com", "06 22 33 44 55", "2026-09-12", "c2", "paye", "2021-11-05", "Père", "Karim", "Haddad"),
  mineur("Nina", "Girard", "anne.girard@example.com", "06 33 44 55 66", "2026-09-15", "c3", "paye", "2016-12-01", "Mère", "Anne", "Girard"),
  mineur("Timéo", "Perrin", "v.perrin@example.com", "06 44 55 66 77", "2026-09-15", "c4", "en_retard", "2013-03-22", "Mère", "Valérie", "Perrin"),
  adulte("Sophie", "Marchand", "s.marchand@example.com", "06 55 66 77 88", "2026-09-16", "c5", "paye", "1990-07-14"),
  mineur("Léo", "Bonnet", "denis.bonnet@example.com", null, "2026-09-16", "c1", "paye", "2019-01-17", "Père", "Denis", "Bonnet"),
  mineur("Rose", "Faure", "ines.faure@example.com", "06 66 77 88 99", "2026-09-17", "c2", "en_attente", "2022-04-03", "Mère", "Inès", "Faure"),
  adulte("Christine", "Lambert", "c.lambert@example.com", "02 43 99 00 11", "2026-09-17", "c6", "paye", "1966-09-27"),
  mineur("Malo", "Renard", "o.renard@example.com", "06 77 88 99 00", "2026-09-18", "c3", "paye", "2015-02-19", "Père", "Olivier", "Renard"),
  mineur("Zoé", "Colin", "n.colin@example.com", "06 88 99 00 11", "2026-09-18", "c4", "en_attente", "2011-08-12", "Mère", "Nathalie", "Colin"),
  adulte("Bruno", "Leroy", "b.leroy@example.com", null, "2026-09-19", "c6", "paye", "1979-06-08"),
  mineur("Ambre", "Masson", "c.masson@example.com", "06 99 00 11 22", "2026-09-19", "c1", "paye", "2018-12-05", "Mère", "Céline", "Masson"),
  mineur("Naël", "Blanchard", "h.blanchard@example.com", "06 10 20 30 40", "2026-09-22", "c2", "en_retard", "2021-05-30", "Père", "Hugo", "Blanchard"),
  mineur("Sofia", "Toure", "a.toure@example.com", "06 20 30 40 50", "2026-09-22", "c3", "paye", "2017-01-13", "Mère", "Amina", "Toure"),
  adulte("Patrick", "Guerin", "p.guerin@example.com", "02 43 30 40 50", "2026-09-23", "c6", "paye", "1974-11-06"),
  mineur("Enzo", "Vidal", "l.vidal@example.com", "06 40 50 60 70", "2026-09-23", "c4", "paye", "2014-04-25", "Mère", "Laure", "Vidal"),
  mineur("Yanis", "Bakri", "s.bakri@example.com", "06 50 60 70 80", "2026-09-24", "c1", "en_attente", "2020-06-18", "Père", "Samir", "Bakri"),
  adulte("Isabelle", "Poirier", "i.poirier@example.com", "06 60 70 80 90", "2026-09-24", "c5", "paye", "1985-08-21"),
];

/**
 * Réponses libres au formulaire d'inscription — indexées par rang dans le tableau.
 *
 * Volontairement clairsemées : personne ne remplit tous les champs facultatifs, et un
 * club dont chaque fiche est complète n'existe pas.
 */
const REPONSES_LIBRES: Record<number, Record<string, string>> = {
  0: { "Comment avez-vous connu le club ?": "Bouche-à-oreille", "Ceinture actuelle": "Blanche-jaune" },
  2: { "Personne à prévenir en cas d’urgence": "Nadège Leclerc", "Téléphone de la personne à prévenir": "06 98 76 54 32" },
  4: { "Ceinture actuelle": "Blanche" },
  9: { "Personne à prévenir en cas d’urgence": "Alain Lemoine", "Téléphone de la personne à prévenir": "02 43 55 44 33" },
  12: { "Ceinture actuelle": "Verte" },
  17: { "Comment avez-vous connu le club ?": "Forum des associations", "Ceinture actuelle": "Blanche" },
  20: { "Ceinture actuelle": "Marron" },
  32: { "Ceinture actuelle": "Jaune" },
};

/**
 * Les enfants qui ne doivent PAS repartir seuls du dojo.
 *
 * Deux familles ont répondu « Non » à la deuxième autorisation. C'est la seule
 * information de cette page qu'un encadrant doit connaître avant la fin du cours, et
 * c'est pour ça que le produit trace le « Non » autant que le « Oui ».
 */
const PAS_SEUL = new Set([2, 16]);

const num = (i: number) => String(i + 1).padStart(2, "0");

/** Les `infos` d'une fiche, construites comme `enregistrerInscription` les écrit. */
function infosDe(b: Brut, i: number): Record<string, string> {
  const infos: Record<string, string> = { "Date de naissance": b.naissance };

  if (b.responsable) {
    infos["Responsable légal"] = `${b.responsable.prenom} ${b.responsable.nom}`;
    infos["Responsable légal — qualité"] = b.responsable.qualite;
    if (b.email) infos["Responsable légal — email"] = b.email;
    if (b.telephone) infos["Responsable légal — téléphone"] = b.telephone;
    for (const a of AUTORISATIONS_INITIALES) {
      infos[`Autorisation — ${a.label}`] = a.id === "au2" && PAS_SEUL.has(i) ? "Non" : "Oui";
    }
  }

  return { ...infos, ...(REPONSES_LIBRES[i] ?? {}) };
}

export const ADHERENTS_INITIAUX: AdherentDemo[] = BRUTS.map((b, i) => ({
  id: `a${num(i)}`,
  prenom: b.prenom,
  nom: b.nom,
  email: b.email,
  telephone: b.telephone,
  created_at: b.inscritLe,
  date_naissance: b.naissance,
  infos: infosDe(b, i),
}));

export const ADHESIONS_INITIALES: AdhesionDemo[] = BRUTS.map((b, i) => ({
  id: `ad${num(i)}`,
  adherent_id: `a${num(i)}`,
  cours_id: b.coursId,
  saison: CLUB.saison,
  statut: b.statut as AdhesionDemo["statut"],
  montant_centimes: t(b.coursId),
  // Le mode « en ligne » n'est posé que là où un règlement en ligne existe (voir plus
  // bas). Une adhésion en liste d'attente n'a aucun mode : rien n'a encore été demandé.
  mode_paiement:
    b.statut === "liste_attente" ? null : b.statut === "paye" && i % 4 === 0 ? "en_ligne" : i % 3 === 0 ? "especes" : "cheque",
  // Toutes les inscriptions datent de septembre : la carte « inscriptions · 7 jours »
  // affiche donc 0 au départ, comme le ferait un club en octobre. C'est terne, et c'est
  // vrai — et cela rend le geste du visiteur visible : ajouter quelqu'un la fait passer
  // à 1 sous ses yeux.
  created_at: b.inscritLe,
  stripe_payment_intent: null,
  // Personne n'a encore été relancé : c'est au visiteur de le faire, et de voir la
  // mention « relancé aujourd'hui » apparaître sous le nom.
  derniere_relance: null,
}));

/**
 * DEUX ENFANTS N'ONT QUE LA SAISON PASSÉE.
 *
 * Sans eux, « RENOUVELER LA SAISON » répondrait immédiatement « Tout le monde a déjà
 * une adhésion pour la saison en cours » — fidèle, et sans rien à montrer. Avec eux,
 * le visiteur voit le geste faire son travail : deux adhésions créées, les compteurs du
 * hub qui bougent, puis zéro au second clic.
 *
 * Ils gardent leurs règlements de l'an dernier : c'est ce qui donne son sens au
 * renouvellement — le club retrouve des familles qu'il connaît, avec le dernier groupe
 * de l'enfant. Et ils ne comptent ni dans les impayés ni dans les dossiers à terminer de
 * cette saison, puisqu'ils n'y ont pas encore d'adhésion.
 */
const SAISON_PASSEE = "2025-2026";
for (const id of ["ad25", "ad26"]) {
  const a = ADHESIONS_INITIALES.find((x) => x.id === id);
  if (a) {
    a.saison = SAISON_PASSEE;
    a.statut = "paye";
    a.created_at = "2025-09-08";
  }
}

// UNE adhésion payée par carte, pour que le panneau de remboursement soit atteignable.
// C'est le seul chemin du cockpit qui lit `stripe_payment_intent` — et le seul qu'on
// n'a jamais pu exercer en production, faute de donnée (voir docs/deploiement-0026-0027).
const CARTE = ADHESIONS_INITIALES.find((a) => a.adherent_id === "a01")!;
CARTE.mode_paiement = "en_ligne";
CARTE.stripe_payment_intent = "pi_3QdemonstrationFictive";

// ——— Règlements ———————————————————————————————————————————————————————————————
// Les adhésions « payées » sont soldées ; deux « en attente » portent un acompte, pour
// que le « reste » ait un sens à l'écran — un club de judo encaisse la moitié en
// septembre et le solde en janvier plus souvent qu'il ne l'avoue. Les chèques déposés le
// 20 septembre sont soldés ; ceux des inscriptions suivantes attendent encore le
// bordereau.

export const REGLEMENTS_INITIAUX: ReglementDemo[] = [];
ADHESIONS_INITIALES.forEach((a, i) => {
  if (a.statut === "paye") {
    REGLEMENTS_INITIAUX.push({
      id: `r${num(i)}`,
      adhesion_id: a.id,
      montant_centimes: a.montant_centimes,
      mode: (a.mode_paiement as ReglementDemo["mode"]) ?? "cheque",
      note: null,
      created_at: a.id === "ad01" ? "2026-09-02" : "2026-09-15",
      // Les chèques des douze premières inscriptions sont déjà déposés ; les autres
      // attendent la prochaine remise.
      remis_le: a.mode_paiement === "cheque" && i < 12 ? "2026-09-20" : null,
    });
  }
});

REGLEMENTS_INITIAUX.push(
  { id: "r-acompte-1", adhesion_id: "ad02", montant_centimes: 15000, mode: "cheque", note: null, created_at: "2026-09-05", remis_le: null },
  { id: "r-acompte-2", adhesion_id: "ad11", montant_centimes: 10000, mode: "autre", note: "Coupon sport ANCV", created_at: "2026-09-12", remis_le: null }
);

// ——— Pièces ———————————————————————————————————————————————————————————————————
//
// LES PIÈCES NAISSENT DU FORMULAIRE, PAS D'UNE LISTE ÉCRITE À LA MAIN.
// `register_adherent_full` parcourt `form_config.pieces` et n'écrit une ligne que si la
// pièce concerne le cours choisi ET, quand `mineurs_seulement` est posé, si sa portée
// d'âge est respectée. Une autorisation parentale n'est donc jamais réclamée à un
// adulte : c'est la date de naissance, côté serveur, qui en décide. La portée d'âge vient
// de la migration `20260804090000_pieces_mineurs.sql`, qui n'est PAS sur cette branche
// mais sur la release — le détail est consigné sur `PieceFormDemo` dans `types.ts`.
//
// LE CERTIFICAT MÉDICAL, LUI, NE VIENT PAS DU FORMULAIRE. Il est créé par
// `enregistrer_questionnaire_sante` quand le questionnaire conclut « certificat requis »
// — et par elle seule. C'est le point que la démonstration doit rendre lisible pour un
// club de judo : depuis 2021 le questionnaire de santé SUFFIT, sauf réponse positive
// (certificat de moins de six mois pour un mineur) et sauf compétition. Le certificat
// systématique est l'affaire de la boxe anglaise, pas du judo.

/**
 * CINQ DOSSIERS INCOMPLETS — cinq autorisations parentales jamais rendues.
 *
 * C'est la scène que tout président de club d'enfants reconnaît : le formulaire est
 * signé en ligne, le papier reste dans le sac. Le groupe « Dossiers incomplets » du
 * composeur et le filtre de la liste racontent donc quelque chose de vrai.
 */
const AUTORISATION_MANQUANTE = new Set(["a03", "a07", "a12", "a19", "a26"]);

/** Les deux questionnaires qui concluent au certificat, et donc à une pièce de plus. */
const CERTIFICAT_REQUIS = new Set(["a07", "a19"]);

export const PIECES_INITIALES: PieceDemo[] = ADHERENTS_INITIAUX.flatMap((a) => {
  const pieces: PieceDemo[] = [
    {
      id: `${a.id}-photo`,
      adherent_id: a.id,
      cle: "pf1",
      label: "Photo d’identité",
      statut: "recue" as const,
      aUnFichier: true,
    },
  ];

  if (estMineurDemo(a.date_naissance)) {
    const manquante = AUTORISATION_MANQUANTE.has(a.id);
    pieces.push({
      id: `${a.id}-autorisation`,
      adherent_id: a.id,
      cle: "pf2",
      label: "Autorisation parentale signée",
      statut: manquante ? ("manquante" as const) : ("recue" as const),
      aUnFichier: !manquante,
    });
  }

  if (CERTIFICAT_REQUIS.has(a.id)) {
    pieces.push({
      id: `${a.id}-certificat-medical`,
      adherent_id: a.id,
      cle: "certificat_medical",
      label: "Certificat médical",
      statut: "manquante" as const,
      aUnFichier: false,
    });
  }

  return pieces;
});

/**
 * Les questionnaires de santé — RÉSULTAT, signataire et date, jamais les réponses.
 *
 * Pour un mineur, c'est le représentant légal qui signe : `signataire_nom` porte donc le
 * nom du parent, et `texteAttestation` du produit parle « en qualité de représentant
 * légal ». Deux de ces questionnaires concluent au certificat médical, ce qui a créé la
 * pièce correspondante ci-dessus — c'est le seul chemin du produit vers un certificat.
 */
export const QUESTIONNAIRES_INITIAUX: QuestionnaireDemo[] = [
  { adherent_id: "a01", resultat: "atteste", signataire_nom: "Sophie Berthier", created_at: "2026-09-02" },
  { adherent_id: "a07", resultat: "certificat_requis", signataire_nom: "Léa Fontaine", created_at: "2026-09-05" },
  { adherent_id: "a16", resultat: "atteste", signataire_nom: "Michel Chevalier", created_at: "2026-09-11" },
  { adherent_id: "a19", resultat: "certificat_requis", signataire_nom: "Anne Girard", created_at: "2026-09-15" },
];

// ——— Campagnes ————————————————————————————————————————————————————————————————

const emailsDe = (ids: string[]) =>
  ids.map((id) => ADHERENTS_INITIAUX.find((a) => a.id === id)?.email).filter((e): e is string => !!e);

const tous = ADHERENTS_INITIAUX.filter((a) => a.email).map((a) => a.email as string);

/** Les adresses des représentants légaux — c'est-à-dire celles des dossiers de mineurs. */
const parents = ADHERENTS_INITIAUX.filter((a) => a.email && estMineurDemo(a.date_naissance)).map(
  (a) => a.email as string
);

export const CAMPAGNES_INITIALES: CampagneDemo[] = [
  {
    id: "m1",
    objet: "Fermeture du dojo pendant les vacances de la Toussaint",
    corps:
      "Bonjour,\n\nLe dojo sera fermé du samedi 18 au dimanche 26 octobre. Les cours reprennent aux horaires habituels le lundi 27.\n\nBonnes vacances à toutes et à tous,\nSébastien",
    groupe_libelle: "Tous les adhérents",
    auteur_nom: CLUB.president,
    statut: "partiel",
    created_at: `2026-10-14T18:12:00${DECALAGE_PARIS}`,
    // Un rejet et un signalement : l'ordre de grandeur réel d'un carnet d'adresses de
    // club — boîtes pleines, adresses professionnelles fermées. Zéro aurait été flatteur.
    destinataires: tous.map((email, i) => ({
      id: `m1-d${i}`,
      email,
      statut: i === 3 ? ("rejete" as const) : i === 11 ? ("plainte" as const) : ("distribue" as const),
    })),
  },
  {
    // Le groupe « Parents » en usage réel : le club écrit aux représentants légaux, et à
    // eux seuls. Le libellé archivé est celui que le produit photographie à l'envoi —
    // « Responsables légaux des mineurs » —, pas celui du menu déroulant.
    id: "m2",
    objet: "Passage de grades du samedi 12 décembre",
    corps:
      "Bonjour,\n\nLe passage de grades aura lieu le samedi 12 décembre au dojo, de 14 h à 17 h. Judogi propre et ceinture actuelle, ainsi que le passeport sportif s’il est déjà ouvert.\n\nMerci de nous dire avant le 30 novembre si votre enfant sera présent.\n\nSébastien",
    groupe_libelle: "Responsables légaux des mineurs",
    auteur_nom: CLUB.president,
    statut: "envoye",
    created_at: `2026-10-09T09:30:00${DECALAGE_PARIS}`,
    destinataires: parents.map((email, i) => ({
      id: `m2-d${i}`,
      email,
      statut: "distribue" as const,
    })),
  },
  {
    id: "m3",
    objet: "Il manque une pièce au dossier de votre enfant",
    corps:
      "Bonjour,\n\nSauf erreur de notre part, l’autorisation parentale signée manque encore au dossier. Vous pouvez la déposer depuis votre espace adhérent, ou la remettre au prochain cours.\n\nMerci,\nLe Judo Club des Peupliers",
    groupe_libelle: "Dossiers incomplets",
    auteur_nom: CLUB.president,
    statut: "envoye",
    created_at: `2026-10-06T20:45:00${DECALAGE_PARIS}`,
    destinataires: emailsDe(["a03", "a07", "a12", "a19", "a26"]).map((email, i) => ({
      id: `m3-d${i}`,
      email,
      statut: i === 2 ? ("retarde" as const) : ("distribue" as const),
    })),
  },
];

// ——— Formulaire ———————————————————————————————————————————————————————————————

export const FORM_CONFIG_INITIALE: FormConfigDemo = {
  pages: [
    {
      id: "pg1",
      titre: "Pratique & urgence",
      champs: [
        { id: "ch1", type: "texte", label: "Personne à prévenir en cas d’urgence", obligatoire: true },
        { id: "ch2", type: "tel", label: "Téléphone de la personne à prévenir", obligatoire: true },
        { id: "ch3", type: "choix", label: "Ceinture actuelle", obligatoire: false, options: "Blanche, Blanche-jaune, Jaune, Jaune-orange, Orange, Verte, Bleue, Marron, Noire" },
        { id: "ch4", type: "case", label: "J’autorise le club à utiliser des photos prises pendant les cours", obligatoire: false },
        { id: "ch5", type: "choix", label: "Comment avez-vous connu le club ?", obligatoire: false, options: "Bouche-à-oreille, Réseaux sociaux, Recherche internet, Forum des associations, École, Autre" },
      ],
    },
  ],
  pieces: [
    { id: "pf1", label: "Photo d’identité", obligatoire: true, cours_id: null, mineurs_seulement: false },
    { id: "pf2", label: "Autorisation parentale signée", obligatoire: true, cours_id: null, mineurs_seulement: true },
  ],
  remises: [
    { id: "rm1", label: "Pass’Sport", montant_centimes: 7000, exigeCode: true, description: "Aide de l’État pour les jeunes éligibles : saisissez le code reçu, le club le vérifiera." },
  ],
  autorisations: AUTORISATIONS_INITIALES,
  // Le questionnaire de santé est ACTIVÉ, et c'est le bon réglage pour un club de judo :
  // depuis 2021 il remplace le certificat médical, sauf réponse positive et sauf
  // compétition. La case reste décochable pour les disciplines qui exigent un certificat
  // dans tous les cas — la boxe anglaise, par exemple.
  sante: true,
};

// ——— Actualités ———————————————————————————————————————————————————————————————

export const ACTUALITES_INITIALES: ActualiteDemo[] = [
  { id: "n1", titre: "Passage de grades — samedi 12 décembre", texte: "Le passage de grades se tiendra au dojo, de 14 h à 17 h, pour tous les groupes enfants.\n\nJudogi propre, ceinture actuelle et passeport sportif. Les familles peuvent rester : les tapis sont installés jusqu’au fond de la salle.", publie_le: "2026-10-12", aUneImage: true },
  { id: "n2", titre: "Bienvenue à Kevin, qui reprend les poussins", texte: "Kevin est ceinture noire 2e dan et diplômé d’État. Il reprend le groupe des poussins le mardi et secondera Sébastien au cours des benjamins.", publie_le: "2026-09-01", aUneImage: false },
  { id: "n3", titre: "Reprise des cours le lundi 7 septembre", texte: "Tous les créneaux reprennent à leurs horaires habituels. Les inscriptions restent ouvertes jusqu’à la fin du mois, dans la limite des places disponibles.", publie_le: "2026-08-20", aUneImage: false },
];

// ——— Vitrine ——————————————————————————————————————————————————————————————————

export const PAGE_CONFIG_INITIALE: PageConfigDemo = {
  ordre: ["presentation", "cours", "planning", "tarifs", "actualites", "infos", "contact"],
  masquees: [],
  custom: [
    { id: "cx1", type: "president", titre: "Le mot du président", texte: "On ne vient pas ici pour gagner des médailles. On vient apprendre à tomber, et à se relever sans rien casser — ni chez soi, ni chez l’autre." },
    { id: "cx2", type: "chiffres", titre: "Le club en chiffres", texte: "1978 · Année de création — 34 · Licenciés — 6 · Créneaux par semaine" },
  ],
};

// ——— Présences ————————————————————————————————————————————————————————————————
// Trois enfants déjà pointés : le cours des poussins du mardi se termine à 19 h, et le
// contrôle montre l'état « déjà présent » sans qu'il faille d'abord en marquer un.

export const PRESENCES_INITIALES: PresenceDemo[] = [
  { adherent_id: "a01", jour: AUJOURDHUI },
  { adherent_id: "a11", jour: AUJOURDHUI },
  { adherent_id: "a22", jour: AUJOURDHUI },
];

// ——— Formats ——————————————————————————————————————————————————————————————————
// Mêmes formats que le produit : centimes en base, euros à l'écran, virgule décimale.

export const eur = (centimes: number) =>
  (centimes / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

/**
 * Les dates de la simulation sont des jours calendaires (`AAAA-MM-JJ`), donc lus à
 * MINUIT UTC. Sans fuseau explicite, une machine à l'ouest de Greenwich les affiche la
 * veille : « publié le 11 octobre » pour une actualité datée du 12. Le produit ne s'en
 * soucie pas — il s'affiche sur l'écran d'un président français — mais une démonstration
 * prérendue puis rejouée dans le navigateur doit rendre la même chose des deux côtés.
 */
const JOUR = { timeZone: "Europe/Paris" } as const;

export const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", JOUR);

export const dateLongue = (iso: string) =>
  new Date(iso).toLocaleDateString("fr-FR", { ...JOUR, day: "numeric", month: "long", year: "numeric" });
