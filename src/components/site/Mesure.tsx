"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Mesure d'audience (Microsoft Clarity) et consentement.
 *
 * Deux règles non négociables tiennent ce fichier :
 *
 * 1. LISTE BLANCHE DE PAGES. Clarity rejoue les sessions. Sur un cockpit, un espace
 *    adhérent ou une vitrine de club, cela enverrait à Microsoft des noms, des emails
 *    et des résultats de questionnaires de santé d'adhérents — alors que Klubster
 *    s'engage auprès des clubs, dans son contrat de sous-traitance, à ne pas faire
 *    sortir leurs données. La mesure ne tourne donc QUE sur les pages de la marque,
 *    et jamais sur `/[asso]/…`, `/connexion`, `/admin`. Une liste blanche et non une
 *    liste noire : une page ajoutée demain n'est pas tracée par défaut.
 *
 * 2. CONSENTEMENT PRÉALABLE. Les cookies de Clarity ne sont pas essentiels : la CNIL
 *    impose donc le consentement, et depuis le 31/10/2025 Microsoft lui-même le
 *    réclame pour les visiteurs de l'EEE — sans bandeau, l'outil ne collecte rien.
 *    Le refus est aussi accessible que l'acceptation, et il est mémorisé : reposer la
 *    question à chaque visite reviendrait à forcer la main.
 */

const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;
const CLE = "klubster-mesure-v1";

/** Pages de la marque. Tout le reste appartient aux clubs et à leurs adhérents. */
const PAGES_MESUREES = ["/", "/tarifs", "/fonctionnalites", "/combat", "/creer"];

function pageMesurable(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname === "/") return true;
  return PAGES_MESUREES.some((p) => p !== "/" && (pathname === p || pathname.startsWith(`${p}/`)));
}

type Choix = "oui" | "non" | null;

function lireChoix(): Choix {
  try {
    const v = localStorage.getItem(CLE);
    return v === "oui" || v === "non" ? v : null;
  } catch {
    return null; // navigation privée verrouillée : on se comporte comme sans choix
  }
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
  // `null` tant que le composant n'a pas lu localStorage : rien ne s'affiche côté
  // serveur, donc aucune divergence d'hydratation possible.
  const [choix, setChoix] = useState<Choix | "inconnu">("inconnu");

  useEffect(() => {
    setChoix(lireChoix());
  }, []);

  useEffect(() => {
    if (choix === "oui" && surPageMesuree) chargerClarity();
  }, [choix, surPageMesuree]);

  function decider(valeur: "oui" | "non") {
    try {
      localStorage.setItem(CLE, valeur);
    } catch {
      /* stockage indisponible : le choix vaut pour cette visite seulement */
    }
    setChoix(valeur);
  }

  // Sans identifiant Clarity configuré, aucun traceur n'est déposé : demander un
  // consentement pour rien serait une friction gratuite.
  if (!CLARITY_ID) return null;
  if (!surPageMesuree) return null;
  if (choix !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Mesure d’audience"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-line bg-paper px-6 py-5 md:px-8"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <p className="text-[14px] leading-relaxed text-ink-soft">
          Nous mesurons la fréquentation de ce site pour comprendre ce qui s’y comprend mal.
          Rien n’est mesuré dans les espaces des associations ni de leurs adhérents.{" "}
          <Link href="/confidentialite" className="underline underline-offset-2 hover:text-ink">
            En savoir plus
          </Link>
        </p>
        <div className="flex shrink-0 gap-3">
          {/* Refuser d'abord, et avec le même poids visuel qu'accepter : un refus qu'il
              faut chercher n'est pas un choix libre. */}
          <button
            type="button"
            onClick={() => decider("non")}
            className="mono border border-line px-5 py-3 text-[12px] text-ink hover:border-ink"
          >
            REFUSER
          </button>
          <button
            type="button"
            onClick={() => decider("oui")}
            className="mono border border-ink bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90"
          >
            ACCEPTER
          </button>
        </div>
      </div>
    </div>
  );
}
