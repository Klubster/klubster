import type { Metadata } from "next";
import CombatClient from "./CombatClient";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";

const TITRE = "Klubster Combat — Le logiciel qui gère ton club de combat";
const DESCRIPTION =
  "Le logiciel qui gère ton club de combat : inscriptions, licences, certificats, paiements et communication. Boxe, kickboxing, full contact, MMA, karaté. Créé par un président de club.";

// Page d'atterrissage des campagnes ciblant les clubs de combat : sans canonical ni
// carte de partage propre, un lien posté dans une conversation ou repris par un moteur
// s'affichait avec les métadonnées génériques du layout (relevé à l'audit du 21/07/2026).
export const metadata: Metadata = {
  title: TITRE,
  description: DESCRIPTION,
  alternates: { canonical: `${SITE}/combat` },
  openGraph: {
    title: TITRE,
    description: DESCRIPTION,
    url: `${SITE}/combat`,
    siteName: "Klubster",
    locale: "fr_FR",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION },
};

export default function CombatPage() {
  return <CombatClient />;
}
