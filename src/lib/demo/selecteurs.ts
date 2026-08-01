/**
 * Les calculs que les écrans font sur l'état.
 *
 * POURQUOI ILS VIVENT ICI, ET PAS DANS LES COMPOSANTS
 * Parce qu'ils sont testables sans navigateur. La recherche, le filtre, la pagination,
 * le décompte des destinataires, le reste dû : ce sont les endroits où une démonstration
 * peut mentir sans qu'on s'en aperçoive — un filtre qui oublie une casse, une pagination
 * qui perd la dernière page. Extraits en fonctions pures, ils se vérifient en
 * millisecondes ; laissés dans le JSX, ils demanderaient un DOM.
 *
 * Aucun import de Supabase, Stripe, Resend ou d'une Server Action.
 */

import { AUJOURDHUI, CLUB, INSTANT_DEMO } from "./donnees";
import type { EtatDemo } from "./etat";
import type { AdherentDemo, AdhesionDemo } from "./types";

// ——— Liste des adhérents ——————————————————————————————————————————————————————

/** Les cinq valeurs du filtre réel, dans l'ordre du `<select>` du produit. */
export const FILTRES_STATUT = [
  { valeur: "", libelle: "Tous les dossiers" },
  { valeur: "paye", libelle: "Payés" },
  { valeur: "en_attente", libelle: "En attente" },
  { valeur: "en_retard", libelle: "En retard" },
  { valeur: "liste_attente", libelle: "Liste d’attente" },
] as const;

/** 25 par page, comme `const PAR_PAGE = 25` dans `adherents/page.tsx`. */
export const PAR_PAGE = 25;

/**
 * Nettoyage de la recherche, repris du serveur : on retire tout ce qui n'est ni lettre
 * (accents compris), ni chiffre, ni `@`, point, tiret ou espace.
 */
export function nettoyerRecherche(q: string): string {
  return q.toLowerCase().replace(/[^a-zà-ÿ0-9@.\- ]/gi, "");
}

export type LigneAdherent = {
  adherent: AdherentDemo;
  adhesion: AdhesionDemo | null;
  nomCours: string | null;
};

/**
 * La liste telle que l'écran la montre : recherche sur nom, prénom et email, filtre par
 * statut d'adhésion, tri FIXE par nom croissant.
 *
 * Le tri n'est pas configurable — le produit ne le permet pas, et la démonstration ne
 * doit pas laisser croire le contraire.
 */
export function listerAdherents(
  etat: EtatDemo,
  options: { q?: string; statut?: string } = {}
): LigneAdherent[] {
  const q = nettoyerRecherche(options.q ?? "").trim();
  const statut = options.statut ?? "";
  const nomCours = new Map(etat.cours.map((c) => [c.id, c.nom]));

  return etat.adherents
    .map((adherent) => {
      // QUELLE ADHÉSION LA LIGNE MONTRE-T-ELLE ?
      //
      // La saison courante d'abord, la plus récente ensuite. Prendre simplement la
      // première du tableau produisait un défaut visible : après « RENOUVELER LA
      // SAISON », le hub annonçait deux dossiers en attente pendant que la liste
      // continuait d'afficher « Payé » — l'adhésion de l'an dernier, restée en tête.
      // Le président voyait son propre clic ne rien faire.
      const siennes = etat.adhesions
        .filter((ad) => ad.adherent_id === adherent.id)
        .sort((x, y) => {
          const xCourante = x.saison === CLUB.saison ? 0 : 1;
          const yCourante = y.saison === CLUB.saison ? 0 : 1;
          if (xCourante !== yCourante) return xCourante - yCourante;
          return x.created_at < y.created_at ? 1 : -1;
        });
      // Avec un filtre, on cherche ce statut parmi ses adhésions — dans le même ordre,
      // donc en privilégiant là aussi la saison courante.
      const adhesion = statut ? siennes.find((ad) => ad.statut === statut) ?? null : siennes[0] ?? null;
      return { adherent, adhesion, nomCours: adhesion?.cours_id ? nomCours.get(adhesion.cours_id) ?? null : null };
    })
    .filter((l) => {
      if (statut && !l.adhesion) return false;
      if (!q) return true;
      const cible = `${l.adherent.prenom} ${l.adherent.nom} ${l.adherent.email ?? ""}`.toLowerCase();
      return cible.includes(q);
    })
    .sort((a, b) => a.adherent.nom.localeCompare(b.adherent.nom, "fr"));
}

export function paginer<T>(lignes: T[], page: number): { page: number; pages: number; debut: number; tranche: T[] } {
  const pages = Math.max(1, Math.ceil(lignes.length / PAR_PAGE));
  // Une page hors bornes ramène à la première : c'est ce que fait le produit quand on
  // supprime des lignes en étant sur la dernière page.
  const courante = Math.min(Math.max(1, page), pages);
  const debut = (courante - 1) * PAR_PAGE;
  return { page: courante, pages, debut, tranche: lignes.slice(debut, debut + PAR_PAGE) };
}

// ——— Argent ———————————————————————————————————————————————————————————————————

export function regleDe(etat: EtatDemo, adhesionId: string): number {
  return etat.reglements.filter((r) => r.adhesion_id === adhesionId).reduce((s, r) => s + r.montant_centimes, 0);
}

export function resteDe(etat: EtatDemo, adhesion: AdhesionDemo): number {
  return Math.max(adhesion.montant_centimes - regleDe(etat, adhesion.id), 0);
}

/** Chèques encaissés et pas encore déposés — la matière d'une remise. */
export function chequesARemettre(etat: EtatDemo) {
  return etat.reglements
    .filter((r) => r.mode === "cheque" && !r.remis_le && r.montant_centimes > 0)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
}

/** Les lignes de l'écran Encaissements : chèques et espèces non soldés. */
export function aEncaisser(etat: EtatDemo) {
  return etat.adhesions
    .filter(
      (a) =>
        (a.statut === "en_attente" || a.statut === "en_retard") &&
        (a.mode_paiement === "cheque" || a.mode_paiement === "especes")
    )
    .map((a) => ({ adhesion: a, reste: resteDe(etat, a) }))
    .filter((l) => l.reste > 0);
}

/** Les impayés de l'écran Relances : tous modes confondus, contrairement ci-dessus. */
export function impayes(etat: EtatDemo) {
  return etat.adhesions
    .filter((a) => a.statut === "en_attente" || a.statut === "en_retard")
    .map((a) => ({ adhesion: a, reste: resteDe(etat, a) }))
    .filter((l) => l.reste > 0)
    .sort((x, y) => {
      const nx = etat.adherents.find((a) => a.id === x.adhesion.adherent_id)?.nom ?? "";
      const ny = etat.adherents.find((a) => a.id === y.adhesion.adherent_id)?.nom ?? "";
      return nx.localeCompare(ny, "fr");
    });
}

/** Total encaissé par moyen de paiement, dans l'ordre d'affichage du produit. */
export const ORDRE_MODES = ["especes", "cheque", "en_ligne", "autre", "remboursement"] as const;

export const LIBELLE_MODE: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèques",
  en_ligne: "En ligne (carte)",
  autre: "Autre (chèques vacances, aides…)",
  remboursement: "Remboursements",
};

export function totauxParMode(etat: EtatDemo): { mode: string; total: number }[] {
  const par = new Map<string, number>();
  for (const r of etat.reglements) {
    // Un montant négatif est un remboursement : il a sa propre ligne, comme dans le
    // produit, plutôt que d'être soustrait en silence du mode d'origine.
    const cle = r.montant_centimes < 0 ? "remboursement" : r.mode;
    par.set(cle, (par.get(cle) ?? 0) + r.montant_centimes);
  }
  return ORDRE_MODES.filter((m) => par.has(m)).map((m) => ({ mode: m, total: par.get(m) as number }));
}

// ——— Dossiers ————————————————————————————————————————————————————————————————

export function piecesDe(etat: EtatDemo, adherentId: string) {
  return etat.pieces.filter((p) => p.adherent_id === adherentId);
}

export function dossierIncomplet(etat: EtatDemo, adherentId: string): boolean {
  return piecesDe(etat, adherentId).some((p) => p.statut !== "recue");
}

export function adherentsIncomplets(etat: EtatDemo): AdherentDemo[] {
  return etat.adherents.filter((a) => dossierIncomplet(etat, a.id));
}

// ——— Destinataires d'une campagne ————————————————————————————————————————————

/**
 * Les groupes du composeur réel, dans l'ordre exact du `<select>`.
 *
 * « Responsables légaux des mineurs » figure bien dans la liste — c'est le libellé que
 * le produit archive. Il rendra ZÉRO destinataire pour ce club de yoga, qui n'accueille
 * aucun mineur, et l'envoi se désactivera tout seul. C'est la vérité de ce club.
 */
export function groupesDisponibles(etat: EtatDemo) {
  return [
    { valeur: "tous", libelle: "Tous les adhérents", archive: "Tous les adhérents" },
    { valeur: "parents", libelle: "Parents (adhérents mineurs)", archive: "Responsables légaux des mineurs" },
    { valeur: "incomplet", libelle: "Dossiers incomplets", archive: "Dossiers incomplets" },
    ...etat.cours.map((c) => ({ valeur: c.id, libelle: c.nom, archive: c.nom })),
  ];
}

/** Adresses du groupe, dédoublonnées — comme le `Set` du composeur réel. */
export function destinatairesDuGroupe(etat: EtatDemo, groupe: string): string[] {
  const avecEmail = etat.adherents.filter((a) => a.email);
  let choisis: AdherentDemo[];

  if (groupe === "tous") choisis = avecEmail;
  // Aucun mineur dans ce club : le groupe est vide, et c'est exact.
  else if (groupe === "parents") choisis = [];
  else if (groupe === "incomplet") choisis = avecEmail.filter((a) => dossierIncomplet(etat, a.id));
  else {
    const ids = new Set(etat.adhesions.filter((ad) => ad.cours_id === groupe).map((ad) => ad.adherent_id));
    choisis = avecEmail.filter((a) => ids.has(a.id));
  }

  return Array.from(new Set(choisis.map((a) => a.email as string)));
}

/** Le libellé archivé du groupe — celui que l'historique photographie à l'envoi. */
export function libelleArchive(etat: EtatDemo, groupe: string): string {
  return groupesDisponibles(etat).find((g) => g.valeur === groupe)?.archive ?? "Cours";
}

// ——— Historique des campagnes —————————————————————————————————————————————————

/**
 * Les compteurs d'une campagne, tels que les colonnes réelles les portent.
 *
 * LE POINT QUI SE TROMPE TOUT SEUL : « accepté » N'EST PAS EXCLUSIF DE « distribué ».
 * `nombre_acceptes` est incrémenté par `envoyerCampagne` au moment où Resend prend le
 * lot ; `appliquer_evenement_resend` (migration `0024`) n'y touche plus jamais — il
 * n'ajoute qu'à `nombre_distribues`, `nombre_retardes`, `nombre_echecs` ou
 * `nombre_plaintes`. Un destinataire distribué reste donc compté parmi les acceptés, et
 * la ligne d'historique lit bien « 34 acceptés · 32 distribués ».
 *
 * Compter ici les seuls destinataires restés au statut `accepte` aurait affiché
 * « 0 accepté · 32 distribués » : arithmétiquement satisfaisant, et faux.
 *
 * Un rejet et un échec alimentent la même colonne `nombre_echecs` ; une plainte a la
 * sienne, et n'est PAS agrégée aux échecs — un message signalé comme indésirable a bien
 * été distribué, les confondre ferait croire à un problème d'acheminement.
 */
export function compteursCampagne(campagne: { destinataires: { statut: string }[] }) {
  const d = campagne.destinataires;
  return {
    destinataires: d.length,
    acceptes: d.filter((x) => x.statut !== "prepare").length,
    distribues: d.filter((x) => x.statut === "distribue").length,
    retardes: d.filter((x) => x.statut === "retarde").length,
    echecs: d.filter((x) => x.statut === "rejete" || x.statut === "echec").length,
    plaintes: d.filter((x) => x.statut === "plainte").length,
  };
}

/**
 * Les cinq statuts de `message_campaigns`, avec les libellés et les classes du produit.
 *
 * « Envoi terminé » et non « Envoyé » : le statut dit seulement que tous les lots ont été
 * acceptés. Ce sont les compteurs, en dessous, qui racontent ce qui est arrivé.
 */
export const ETAT_CAMPAGNE: Record<string, { texte: string; classe: string }> = {
  preparation: { texte: "En préparation", classe: "text-ink-soft" },
  en_cours: { texte: "Envoi en cours", classe: "text-warning" },
  envoye: { texte: "Envoi terminé", classe: "text-brand-dark" },
  partiel: { texte: "Partiellement envoyé", classe: "text-warning" },
  echec: { texte: "Échec", classe: "text-danger" },
};

/** Les huit états d'une ligne de `message_recipients`, libellés comme sur la campagne. */
export const ETAT_DESTINATAIRE: Record<string, { texte: string; classe: string }> = {
  prepare: { texte: "Non envoyé", classe: "text-ink-soft" },
  accepte: { texte: "Accepté", classe: "text-ink" },
  distribue: { texte: "Distribué", classe: "text-brand-dark" },
  retarde: { texte: "Retardé", classe: "text-warning" },
  rejete: { texte: "Rejeté", classe: "text-danger" },
  echec: { texte: "Échec", classe: "text-danger" },
  plainte: { texte: "Signalé comme indésirable", classe: "text-danger" },
  supprime: { texte: "Adresse supprimée", classe: "text-ink-soft" },
};

/**
 * « 14 octobre à 18 h 12 » — le format exact de `quand()` dans `Historique.tsx`, qui
 * remplace le deux-points de l'heure par « h » entouré d'espaces.
 *
 * Le fuseau est explicite ici alors qu'il ne l'est pas dans le produit : le cockpit
 * s'affiche sur la machine d'un président français, la démonstration doit rendre la même
 * chose partout, y compris au prérendu.
 */
export function quandCampagne(iso: string): string {
  const d = new Date(iso);
  const options = { timeZone: "Europe/Paris" } as const;
  const jour = d.toLocaleDateString("fr-FR", { ...options, day: "2-digit", month: "long" });
  const heure = d
    .toLocaleTimeString("fr-FR", { ...options, hour: "2-digit", minute: "2-digit" })
    .replace(":", " h ");
  return `${jour} à ${heure}`;
}

// ——— Actualités ———————————————————————————————————————————————————————————————

/**
 * Ce que la VITRINE montre : `getActualites(org.id)` avec sa limite par défaut de TROIS,
 * triées `publie_le desc` puis `created_at desc`.
 *
 * Le second critère n'a pas d'équivalent direct ici — `ActualiteDemo` n'a pas de
 * `created_at`, parce que rien à l'écran ne l'affiche. Il est rendu par la stabilité du
 * tri : le réducteur place l'actualité neuve en tête AVANT de trier, et `Array.sort` de
 * JavaScript conserve l'ordre relatif des ex æquo depuis ES2019. Deux actualités du même
 * jour sortent donc dans l'ordre de publication décroissant, comme en base.
 *
 * Le cockpit, lui, en demande cinquante : le président voit tout son fil, le public
 * seulement les trois dernières.
 */
export const ACTUALITES_VITRINE = 3;

export function actualitesVitrine(etat: EtatDemo) {
  return etat.actualites.slice(0, ACTUALITES_VITRINE);
}

/**
 * Le résumé d'une actualité sur la vitrine — 140 caractères, coupés au dernier espace
 * quand il tombe au-delà du soixantième caractère, suivis d'une ellipse.
 *
 * Recopié de `resumeActu` dans `src/app/[asso]/page.tsx`, y compris le seuil de 60 : sans
 * lui, un texte sans espace précoce serait tronqué à deux mots.
 */
export function resumeActu(texte: string, max = 140): string {
  if (texte.length <= max) return texte;
  const coupe = texte.slice(0, max + 1);
  const dernierEspace = coupe.lastIndexOf(" ");
  return `${(dernierEspace > 60 ? coupe.slice(0, dernierEspace) : coupe.slice(0, max)).trimEnd()}…`;
}

/**
 * La date de publication, validée comme `dateSure` dans la Server Action réelle.
 *
 * Le format seul ne suffit pas : « 2026-02-31 » a la bonne forme et n'existe pas — passé
 * à Postgres, il glisserait au 3 mars. On reconstruit donc la date en UTC et on vérifie
 * que ses trois composantes sont revenues intactes. En cas d'échec : aujourd'hui.
 */
export function dateSureDemo(valeur: string, aujourdhui: string): string {
  const s = valeur.trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    if (d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3]) return s;
  }
  return aujourdhui;
}

// ——— Chiffres du hub ——————————————————————————————————————————————————————————

/**
 * Les chiffres du hub, calculés comme `getCockpitStats` et `getAujourdhui`.
 *
 * DEUX PIÈGES, TOUS DEUX TOMBÉS UNE FOIS
 *
 * `piecesAttendues` compte des PIÈCES, pas des dossiers. Un adhérent à qui il manque
 * deux pièces compte pour deux. J'avais d'abord mis `dossiersIncomplets`, qui compte des
 * personnes : le titre « X choses méritent votre attention » s'en trouvait faussé, sans
 * qu'aucun test ne le voie.
 *
 * `nouvelles7j` compte des ADHÉSIONS par leur propre date de création, pas des adhérents.
 * Un adhérent de septembre qui prend un second cours en janvier est une inscription de
 * janvier.
 */
export function chiffresDuClub(etat: EtatDemo) {
  const enAttente = etat.adhesions.filter((a) => a.statut === "en_attente").length;
  const enRetard = etat.adhesions.filter((a) => a.statut === "en_retard").length;
  const encaisse = etat.reglements.reduce((s, r) => s + r.montant_centimes, 0);
  const resteAEncaisser = etat.adhesions.reduce((s, a) => s + resteDe(etat, a), 0);

  // Sept jours glissants depuis l'horloge figée.
  //
  // Calculé en UTC de bout en bout : `setDate`/`getDate` lisent le calendrier LOCAL,
  // et sur une date à minuit UTC ils renvoient la veille à l'ouest de Greenwich. La
  // fenêtre aurait glissé d'un jour selon la machine, et une inscription du 13 octobre
  // serait entrée ou sortie du compte sans raison.
  const limite = new Date(`${AUJOURDHUI}T00:00:00Z`);
  limite.setUTCDate(limite.getUTCDate() - 7);
  const nouvelles7j = etat.adhesions.filter((a) => new Date(`${a.created_at}T00:00:00Z`) >= limite).length;

  return {
    adherents: etat.adherents.length,
    enAttente,
    enRetard,
    nouvelles7j,
    piecesAttendues: etat.pieces.filter((p) => p.statut !== "recue").length,
    dossiersIncomplets: adherentsIncomplets(etat).length,
    encaisse,
    resteAEncaisser,
    chequesARemettre: chequesARemettre(etat).length,
    listeAttente: etat.adhesions.filter((a) => a.statut === "liste_attente").length,
  };
}

/**
 * La date de la démonstration, telle qu'elle s'affiche — jour, date longue, salutation.
 *
 * UNE SEULE FONCTION, ET UN FUSEAU EXPLICITE
 * Le hub affichait « LUNDI 20 OCTOBRE » écrit en dur, alors que le 20 octobre 2026 est
 * un mardi. Et `new Date("2026-10-20")` sans heure est lu à MINUIT UTC : à l'ouest de
 * Greenwich, c'est encore le 19 — donc lundi, donc les cours du lundi. Le jour affiché
 * dépendait du fuseau de la machine.
 *
 * Deux règles en sortent, valables partout dans ce dossier :
 *   1. la date affichée n'est jamais écrite en dur, elle vient d'ici ;
 *   2. toute lecture de calendrier passe par `timeZone: "Europe/Paris"`.
 */
export function dateDemo() {
  const instant = new Date(INSTANT_DEMO);
  const options = { timeZone: "Europe/Paris" } as const;

  const jourSemaine = instant.toLocaleDateString("fr-FR", { ...options, weekday: "long" });
  const dateLongue = instant.toLocaleDateString("fr-FR", {
    ...options,
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  // Même règle que le cockpit : bonsoir à partir de 18 h, et jusqu'à 4 h du matin.
  const heure = Number(instant.toLocaleString("fr-FR", { ...options, hour: "2-digit", hour12: false }));
  const salut = heure >= 18 || heure < 4 ? "Bonsoir" : "Bonjour";

  return { jourSemaine, dateLongue, salut };
}

/** Les cours qui se tiennent le jour de l'horloge figée. */
export function jourEtCours(etat: EtatDemo) {
  const { jourSemaine } = dateDemo();
  const coursDuJour = etat.cours.flatMap((c) =>
    c.creneaux.filter((k) => k.jour === jourSemaine).map((k) => ({ nom: c.nom, debut: k.debut, fin: k.fin }))
  );
  return { jourSemaine, coursDuJour };
}

// ——— Contrôle au bord du tapis ————————————————————————————————————————————————

export type VerifDemo = {
  id: string;
  prenom: string;
  nom: string;
  cours: string | null;
  regle: boolean;
  piecesManquantes: number;
  present: boolean;
};

/**
 * Ce que la RPC `verifier_adherent` renvoie.
 *
 * LA RÈGLE MÉTIER REPRODUIT LA RPC. La démonstration ajoute UN départage déterministe
 * par identifiant lorsque deux dates sont identiques — voir plus bas. Ce n'est donc pas
 * une transposition littérale, et il ne faut pas lire ce qui suit comme telle.
 *
 * TROIS DÉTAILS QUI NE S'INVENTENT PAS, et que j'ai relus dans `0013` :
 *
 *   — `cours` et `regle` viennent de la MÊME adhésion : la plus récente
 *     (`order by ad.created_at desc limit 1`). Pas « un cours parmi les siens », pas
 *     « toutes ses adhésions sont-elles payées ». Une adhérente qui a renouvelé et n'a
 *     pas encore payé est « Non réglé », même si l'an dernier était soldé.
 *   — sans aucune adhésion, `regle` vaut `false` (`coalesce(…, false)`), pas « à jour ».
 *   — `pieces_manquantes` compte les pièces `manquante`, sans se soucier du caractère
 *     obligatoire : au bord du tapis on veut le nombre, pas une nuance juridique.
 *
 * L'AJOUT DE LA DÉMONSTRATION : un tri sur `created_at` PUIS sur l'identifiant. Sans ce
 * second critère, deux adhésions créées le même jour — cas d'un renouvellement le jour
 * de l'inscription — sortaient dans l'ordre du tableau, c'est-à-dire dans l'ordre
 * d'écriture, c'est-à-dire au hasard. L'écran aurait affiché tantôt l'ancienne, tantôt
 * la nouvelle.
 *
 * La RPC réelle n'a pas ce départage : son `order by ad.created_at desc limit 1` n'est
 * pas un ordre total, et deux adhésions du même jour y sortent dans l'ordre que
 * Postgres veut. Consigné dans `docs/defauts-a-corriger.md` — c'est un correctif à
 * porter dans une migration, pas ici.
 */
export function verifierAdherentDemo(etat: EtatDemo, adherentId: string): VerifDemo | null {
  const a = etat.adherents.find((x) => x.id === adherentId);
  if (!a) return null;

  const siennes = etat.adhesions
    .filter((ad) => ad.adherent_id === a.id)
    .sort((x, y) => (y.created_at.localeCompare(x.created_at) || y.id.localeCompare(x.id)));
  const derniere = siennes[0] ?? null;

  return {
    id: a.id,
    prenom: a.prenom,
    nom: a.nom,
    cours: derniere?.cours_id ? etat.cours.find((c) => c.id === derniere.cours_id)?.nom ?? null : null,
    regle: derniere ? derniere.statut === "paye" : false,
    piecesManquantes: etat.pieces.filter((p) => p.adherent_id === a.id && p.statut === "manquante").length,
    present: etat.presences.some((p) => p.adherent_id === a.id && p.jour === AUJOURDHUI),
  };
}

/**
 * La recherche par nom du scanner — celle de `rechercher()`, pas celle de la liste.
 *
 * Deux règles propres à cet écran, et il ne faut pas les confondre avec celles de
 * `listerAdherents` : DEUX caractères minimum (en dessous, on renvoie une liste vide
 * plutôt que tout le club), et DOUZE résultats au plus. Elles existent parce qu'on
 * cherche ici d'une main, debout, entre deux arrivées.
 *
 * Le nettoyage retire tout ce qui n'est ni lettre, ni chiffre, ni espace, ni tiret —
 * c'est la précaution du serveur contre l'injection dans un `ilike`, et la reproduire
 * ici évite qu'un visiteur tape une apostrophe et trouve un comportement différent.
 */
export function chercherPourControle(etat: EtatDemo, q: string): AdherentDemo[] {
  const net = q.replace(/[^a-zà-ÿ0-9 -]/gi, "").trim();
  if (net.length < 2) return [];
  const bas = net.toLowerCase();
  return etat.adherents
    .filter((a) => a.nom.toLowerCase().includes(bas) || a.prenom.toLowerCase().includes(bas))
    .sort((x, y) => x.nom.localeCompare(y.nom, "fr"))
    .slice(0, 12);
}

/** Inscrits et jauge d'un cours — c'est la jauge, et elle seule, qui ouvre l'attente. */
export function jaugeDuCours(etat: EtatDemo, coursId: string) {
  const inscrits = etat.adhesions.filter((a) => a.cours_id === coursId && a.statut !== "liste_attente").length;
  const attente = etat.adhesions.filter((a) => a.cours_id === coursId && a.statut === "liste_attente").length;
  const cours = etat.cours.find((c) => c.id === coursId);
  return { inscrits, attente, places: cours?.places_max ?? null };
}
