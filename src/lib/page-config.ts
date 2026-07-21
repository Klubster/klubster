// Configuration de la page club (mode Édition) : ordre des sections + sections custom.
import type { PageConfig, TailleLogo } from "@/types/db";

/**
 * Tailles proposées pour le logo du hero, avec les classes correspondantes.
 *
 * Quatre paliers plutôt qu'un champ libre en pixels : un club qui saisirait 900 px
 * écraserait son propre titre et casserait sa page sur mobile. Chaque palier reste
 * nettement plus petit sur petit écran, où le logo passe au-dessus du titre.
 */
export const TAILLES_LOGO: Record<TailleLogo, { libelle: string; classe: string }> = {
  s: { libelle: "Discret", classe: "h-20 w-20 md:h-32 md:w-32" },
  m: { libelle: "Normal", classe: "h-32 w-32 md:h-52 md:w-52" },
  l: { libelle: "Grand", classe: "h-40 w-40 md:h-72 md:w-72" },
  xl: { libelle: "Très grand", classe: "h-48 w-48 md:h-96 md:w-96" },
};

export const TAILLE_LOGO_DEFAUT: TailleLogo = "m";

/** Ramène une valeur venue de la base ou d'un formulaire à un palier connu. */
export function tailleLogoSure(v: unknown): TailleLogo {
  // `in` répondrait vrai pour « toString » ou « constructor », hérités du prototype :
  // on obtiendrait une classe Tailwind inexistante et un logo invisible.
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(TAILLES_LOGO, v)
    ? (v as TailleLogo)
    : TAILLE_LOGO_DEFAUT;
}

/** Classes Tailwind du logo du hero pour une config donnée. */
export function classeLogoHero(pc: PageConfig | null | undefined): string {
  return `${TAILLES_LOGO[tailleLogoSure(pc?.hero?.logoTaille)].classe} object-contain`;
}

// Sections standard de la vitrine, dans leur ordre par défaut.
// Le hero et l'actualité « à la une » restent fixes en haut de page.
export const SECTIONS_STANDARD = ["presentation", "cours", "planning", "tarifs", "infos", "contact"] as const;
export type SectionStandard = (typeof SECTIONS_STANDARD)[number];

// Retourne une config toujours cohérente : ordre nettoyé (clés inconnues retirées,
// sections standard manquantes ré-ajoutées, customs manquants ajoutés en fin).
export function normaliserPageConfig(pc: PageConfig | null | undefined): PageConfig {
  const custom = (pc?.custom ?? []).filter((c) => c && typeof c.id === "string");
  const connues = new Set<string>([...SECTIONS_STANDARD, ...custom.map((c) => c.id)]);
  const ordre = (pc?.ordre ?? []).filter((k, i, arr) => connues.has(k) && arr.indexOf(k) === i);
  // Chapitres standards volontairement retirés par le club. Sans cette liste, la boucle
  // ci-dessous les réintroduisait à chaque lecture : un club ne pouvait pas retirer
  // « Planning » ou « Tarifs » de sa vitrine, même s'ils ne le concernaient pas.
  const masquees = (pc?.masquees ?? []).filter((k) => (SECTIONS_STANDARD as readonly string[]).includes(k));
  for (const k of SECTIONS_STANDARD) if (!ordre.includes(k) && !masquees.includes(k)) ordre.push(k);
  for (const c of custom) if (!ordre.includes(c.id)) ordre.push(c.id);
  return {
    ordre,
    custom,
    masquees,
    hero: { logo: pc?.hero?.logo ?? true, logoTaille: tailleLogoSure(pc?.hero?.logoTaille) },
  };
}
