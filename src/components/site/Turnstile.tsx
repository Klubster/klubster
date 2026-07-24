"use client";

import { useEffect, useRef } from "react";

/**
 * Widget Cloudflare Turnstile — vérifie que l'inscription vient d'une personne, pas d'un robot.
 *
 * ⚠️ Mode « execute » : le jeton n'est PAS produit à l'affichage mais À LA DEMANDE,
 * via `demanderJetonTurnstile()` appelée au moment de la soumission. Un jeton
 * Turnstile expire en 5 minutes ; or un adhérent réel met 10-15 minutes à remplir
 * le formulaire d'inscription (identité, questionnaire de santé, signature…) —
 * avec le rendu implicite, le jeton était donc systématiquement mort à l'arrivée
 * et le serveur refusait « robot » (bug constaté le 24/07/2026 sur usmboxe).
 *
 * Ne rend rien si NEXT_PUBLIC_TURNSTILE_SITE_KEY est absente : tant que les clés ne
 * sont pas posées dans Vercel, le formulaire reste strictement identique.
 * La vérification serveur correspondante vit dans src/lib/antiabus.ts.
 */
declare global {
  interface Window {
    turnstile?: {
      render: (conteneur: HTMLElement, options: Record<string, unknown>) => string;
      execute: (widgetId: string) => void;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
    };
  }
}

// État de module : un seul formulaire d'inscription par page.
let widgetId: string | null = null;
let resolutionEnAttente: ((jeton: string | null) => void) | null = null;

/**
 * Produit un jeton FRAIS (quelques secondes d'âge au plus) à appeler juste avant
 * d'envoyer le formulaire. Résout :
 *   - `""`   si Turnstile n'est pas configuré (rien à joindre) ;
 *   - `null` si la vérification n'a pas abouti (script bloqué, réseau, timeout) —
 *            à traiter comme une erreur côté formulaire, sans envoyer ;
 *   - le jeton sinon.
 */
export function demanderJetonTurnstile(timeoutMs = 20000): Promise<string | null> {
  if (!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY) return Promise.resolve("");
  if (typeof window === "undefined" || !window.turnstile || widgetId === null) {
    return Promise.resolve(null);
  }
  const ts = window.turnstile;
  const id = widgetId;
  return new Promise((resolve) => {
    const minuteur = window.setTimeout(() => {
      if (resolutionEnAttente) {
        resolutionEnAttente = null;
        resolve(null);
      }
    }, timeoutMs);
    resolutionEnAttente = (jeton) => {
      window.clearTimeout(minuteur);
      resolve(jeton);
    };
    try {
      // reset avant execute : un widget déjà exécuté (tentative précédente) ne
      // relance pas de challenge sans remise à zéro.
      ts.reset(id);
      ts.execute(id);
    } catch {
      resolutionEnAttente = null;
      window.clearTimeout(minuteur);
      resolve(null);
    }
  });
}

export default function Turnstile() {
  const cle = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cle) return;

    const rendre = () => {
      if (!conteneur.current || !window.turnstile || widgetId !== null) return;
      widgetId = window.turnstile.render(conteneur.current, {
        sitekey: cle,
        language: "fr",
        theme: "light",
        // Jeton à la demande (au submit), pas à l'affichage : voir l'en-tête du fichier.
        execution: "execute",
        callback: (jeton: string) => {
          resolutionEnAttente?.(jeton);
          resolutionEnAttente = null;
        },
        "error-callback": () => {
          resolutionEnAttente?.(null);
          resolutionEnAttente = null;
        },
      });
    };

    const existant = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
    if (window.turnstile) {
      rendre();
    } else if (existant) {
      existant.addEventListener("load", rendre, { once: true });
    } else {
      const s = document.createElement("script");
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
      s.async = true;
      s.defer = true;
      s.setAttribute("data-turnstile", "");
      s.onload = rendre;
      document.head.appendChild(s);
    }

    return () => {
      if (widgetId !== null && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* le widget avait déjà disparu */
        }
      }
      widgetId = null;
      resolutionEnAttente = null;
    };
  }, [cle]);

  if (!cle) return null;

  return (
    <div>
      {/* Invisible tant qu'aucun challenge interactif n'est requis ; Cloudflare y
          affiche le défi au moment de l'exécution si nécessaire. */}
      <div ref={conteneur} />
      <noscript>
        <p className="mono mt-2 text-[11px] text-ink-soft">
          Activez JavaScript pour valider votre inscription.
        </p>
      </noscript>
    </div>
  );
}
