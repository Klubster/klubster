// Questionnaire de santé (loi du 2 mars 2022). Il peut tenir lieu de certificat médical,
// mais pas systématiquement : chaque fédération fixe ses propres exigences et certaines
// disciplines — dont les sports de combat — réclament un certificat dans tous les cas.
// C'est au club de dire quelles pièces il demande, via son formulaire d'inscription.
// Majeur : QS-SPORT (Cerfa 15699*01). Mineur : questionnaire relatif à l'état
// de santé du sportif mineur (décret du 7 mai 2021).
// Règle : si TOUTES les réponses sont « non » → attestation, pas de certificat.
// Si au moins un « oui » → certificat médical requis (mineur : < 6 mois).

export type QSResultat = "atteste_negatif" | "certificat_requis";
export type QSType = "adulte" | "mineur";

export const QS_ADULTE: string[] = [
  "Un membre de votre famille est-il décédé subitement d'une cause cardiaque ou inexpliquée ?",
  "Avez-vous ressenti une douleur dans la poitrine, des palpitations, un essoufflement inhabituel ou un malaise ?",
  "Avez-vous eu un épisode de respiration sifflante (asthme) ?",
  "Avez-vous eu une perte de connaissance ?",
  "Si vous avez arrêté le sport pendant 30 jours ou plus pour raison de santé, avez-vous repris sans l'accord d'un médecin ?",
  "Avez-vous débuté un traitement médical de longue durée (hors contraception et désensibilisation aux allergies) ?",
  "Ressentez-vous une douleur, un manque de force ou une raideur suite à un problème osseux, articulaire ou musculaire (fracture, entorse, luxation, déchirure, tendinite…) survenu durant les 12 derniers mois ?",
  "Votre pratique sportive est-elle interrompue pour des raisons de santé ?",
  "Pensez-vous avoir besoin d'un avis médical pour poursuivre votre pratique sportive ?",
];

export const QS_MINEUR: string[] = [
  // Depuis l'année dernière
  "Es-tu allé(e) à l'hôpital pendant toute une journée ou plusieurs jours ?",
  "As-tu été opéré(e) ?",
  "As-tu beaucoup plus grandi que les autres années durant l'année ?",
  "As-tu beaucoup maigri ou grossi ?",
  "As-tu eu la tête qui tourne pendant un effort ?",
  "As-tu perdu connaissance ou es-tu tombé(e) sans te souvenir de ce qui s'était passé ?",
  "As-tu reçu un ou plusieurs chocs violents qui t'ont obligé(e) à interrompre un moment une activité sportive ?",
  "As-tu eu beaucoup de mal à respirer pendant un effort par rapport à d'habitude ?",
  "As-tu eu beaucoup de mal à respirer après un effort ?",
  "As-tu eu mal dans la poitrine ou des palpitations (cœur qui bat très vite) ?",
  "As-tu commencé à prendre un nouveau médicament tous les jours et pour longtemps ?",
  "As-tu arrêté le sport à cause d'un problème de santé pendant un mois ou plus ?",
  // Depuis un certain temps (plus de 2 semaines)
  "Te sens-tu très fatigué(e) ?",
  "As-tu du mal à t'endormir ou te réveilles-tu souvent dans la nuit ?",
  "Sens-tu que tu as moins faim, que tu manges moins ?",
  "Te sens-tu triste ou inquiet(e) ?",
  "Pleures-tu plus souvent ?",
  "Ressens-tu une douleur ou un manque de force à cause d'une blessure que tu t'es faite cette année ?",
  // Aujourd'hui
  "Penses-tu quelquefois à arrêter de faire du sport parce que tu n'es pas en forme ?",
  "Penses-tu avoir besoin de voir ton médecin pour continuer le sport ?",
  "Souhaites-tu signaler quelque chose d'autre concernant ta santé ?",
];

// Sections (pour l'affichage du questionnaire mineur)
export const QS_MINEUR_SECTIONS: { titre: string; debut: number }[] = [
  { titre: "Depuis l'année dernière", debut: 0 },
  { titre: "Depuis plus de deux semaines", debut: 12 },
  { titre: "Aujourd'hui", debut: 18 },
];

export function questionsPour(type: QSType): string[] {
  return type === "mineur" ? QS_MINEUR : QS_ADULTE;
}

export function estMineur(dateNaissance: string, ref = new Date()): boolean {
  const d = new Date(dateNaissance);
  if (Number.isNaN(d.getTime())) return false;
  let age = ref.getFullYear() - d.getFullYear();
  const m = ref.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < d.getDate())) age--;
  return age < 18;
}

export function resultatDe(reponses: Record<string, "oui" | "non">): QSResultat {
  return Object.values(reponses).some((r) => r === "oui") ? "certificat_requis" : "atteste_negatif";
}

export function texteAttestation(type: QSType, resultat: QSResultat): string {
  if (resultat === "atteste_negatif") {
    return type === "mineur"
      ? "J'atteste, en qualité de représentant légal, que chaque rubrique du questionnaire de santé du sportif mineur donne lieu à une réponse négative. Aucun certificat médical n'est exigé."
      : "J'atteste avoir répondu NON à chacune des rubriques du questionnaire de santé QS-SPORT et reconnais ne pas avoir à fournir de certificat médical.";
  }
  return type === "mineur"
    ? "Au moins une réponse est positive : un certificat médical de non contre-indication de moins de 6 mois devra être fourni au club avant la participation."
    : "Au moins une réponse est positive : un certificat médical de non contre-indication à la pratique sportive devra être fourni au club.";
}
