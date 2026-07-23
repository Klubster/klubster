// Polices des templates de vitrine (src/lib/themes.ts), auto-hébergées par next/font :
// téléchargées au BUILD puis servies depuis notre domaine — aucune requête du navigateur
// vers fonts.googleapis.com (le layout racine promet « aucune requête vers Google »,
// promesse que le <link> Google Fonts des vitrines contredisait ; audit du 23/07).
//
// Contrainte next/font : chaque famille doit être déclarée statiquement, au niveau du
// module — d'où la liste exhaustive des 6 templates ici, jamais de chargement dynamique.
// `preload: false` : les variables posent des @font-face, mais le navigateur ne télécharge
// que la famille réellement référencée par le CSS de la page (celle du template choisi).
// Inter et Space Mono (templates Éditorial et Brut) viennent déjà du layout racine
// (--kb-inter / --kb-space-mono) : on ne les re-déclare pas.
import {
  Source_Serif_4,
  IBM_Plex_Mono,
  Archivo,
  DM_Mono,
  Nunito,
  Red_Hat_Mono,
  Barlow_Semi_Condensed,
} from "next/font/google";

const sourceSerif = Source_Serif_4({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--gf-source-serif", preload: false });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "600"], display: "swap", variable: "--gf-plex-mono", preload: false });
const archivo = Archivo({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--gf-archivo", preload: false });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["400", "500"], display: "swap", variable: "--gf-dm-mono", preload: false });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700"], display: "swap", variable: "--gf-nunito", preload: false });
const redHatMono = Red_Hat_Mono({ subsets: ["latin"], weight: ["400", "700"], display: "swap", variable: "--gf-red-hat-mono", preload: false });
const barlowSemi = Barlow_Semi_Condensed({ subsets: ["latin"], weight: ["400", "500", "600"], display: "swap", variable: "--gf-barlow-semi", preload: false });

/** Classes à poser sur un ancêtre pour rendre les variables --gf-* disponibles
 *  (vitrines via <ThemeVitrine>, aperçus de /creer et du cockpit Identité). */
export const classesPolicesVitrines = [
  sourceSerif.variable,
  plexMono.variable,
  archivo.variable,
  dmMono.variable,
  nunito.variable,
  redHatMono.variable,
  barlowSemi.variable,
].join(" ");
