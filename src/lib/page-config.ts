// Configuration de la page club (mode Édition) : ordre des sections + sections custom.
import type { PageConfig } from "@/types/db";

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
  return { ordre, custom, masquees, hero: { logo: pc?.hero?.logo ?? true } };
}
