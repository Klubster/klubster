"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Mesure d'audience (Microsoft Clarity), en mode sans cookie.
 *
 * Trois règles tiennent ce fichier :
 *
 * 1. PORTÉE PAR LE LAYOUT. Ce composant n'est monté que dans `app/(marketing)/layout.tsx`.
 *    C'est la vraie barrière : entrer dans l'espace d'un club le démonte, et la mesure
 *    s'arrête avec lui. Auparavant il vivait dans le layout racine, où le script
 *    survivait à une navigation côté client vers un cockpit ou un espace adhérent.
 *
 * 2. LISTE BLANCHE, EN SECOND RIDEAU. Clarity rejoue les sessions : sur un espace de
 *    club, cela enverrait à Microsoft des noms, des emails et des résultats de
 *    questionnaires de santé — alors que Klubster s'engage auprès des clubs, dans son
 *    contrat de sous-traitance, à ne pas faire sortir leurs données. La liste ci-dessous
 *    reste donc en place au cas où le composant serait monté ailleurs par erreur.
 *    Cette barrière-là n'est pas négociable : elle protège les données des adhérents.
 *
 * 3. PAS DE BANDEAU. Décision produit de Mathieu (21/07/2026) : sur une landing atteinte
 *    par email à froid, un bandeau coûte plus de visiteurs qu'il n'apporte de mesure.
 *    Le dépôt de cookies est désactivé dans les réglages du projet Clarity (Settings →
 *    Setup), ce qui est la condition pour s'en passer.
 *
 *    ⚠️ Contrepartie documentée par Microsoft, à connaître avant de lire les chiffres :
 *    depuis le 31/10/2025, sans signal de consentement, Clarity continue d'enregistrer
 *    les sessions mais dégrade ses agrégats pour les visiteurs de l'EEE — chaque page vue
 *    compte pour une session, tout visiteur paraît nouveau, et surtout **les tunnels
 *    affichent un abandon total à chaque étape**. Les enregistrements de session restent
 *    exploitables ; les entonnoirs de conversion, non.
 *    https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-without-cookie-consent
 *
 *    On n'appelle volontairement PAS `clarity("consent", …)` : cette API sert à
 *    transmettre le choix d'un visiteur à qui l'on a posé la question. Ici on ne la pose
 *    pas, et lui passer `false` reviendrait à déclarer un refus explicite.
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * Pages de la marque. Tout le reste appartient aux clubs et à leurs adhérents.
 *
 * `/creer` en est volontairement absent : c'est la seule page marketing où l'on saisit
 * un nom, un email et un mot de passe. Y rejouer des sessions pour observer un
 * décrochage de tunnel ne vaut pas d'enregistrer quelqu'un en train d'ouvrir son compte.
 */
const PAGES_MESUREES = ["/", "/tarifs", "/fonctionnalites", "/combat"];

function pageMesurable(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return PAGES_MESUREES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

function chargerClarity() {
  if (!CLARITY_ID) return;
  if (document.getElementById("kb-clarity")) return;
  const s = document.createElement("script");
  s.id = "kb-clarity";
  s.type = "text/javascript";
  s.async = true;
  s.innerHTML = `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`;
  document.head.appendChild(s);
}

export default function Mesure() {
  const pathname = usePathname();
  const surPageMesuree = pageMesurable(pathname);

  useEffect(() => {
    if (surPageMesuree) chargerClarity();
  }, [surPageMesuree]);

  return null;
}
