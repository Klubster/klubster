"use client";

import { useEffect, useRef } from "react";

/**
 * Widget Cloudflare Turnstile — vérifie que l'inscription vient d'une personne, pas d'un robot.
 *
 * Ne s'affiche que si NEXT_PUBLIC_TURNSTILE_SITE_KEY est définie : tant que les clés ne sont pas
 * posées dans Vercel, le formulaire reste strictement identique à aujourd'hui.
 * La vérification serveur correspondante vit dans src/lib/antiabus.ts.
 *
 * Le widget injecte un champ caché « cf-turnstile-response » dans le formulaire parent :
 * c'est ce jeton que le serveur revalide auprès de Cloudflare.
 */
export default function Turnstile() {
  const cle = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const conteneur = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cle) return;
    if (document.querySelector("script[data-turnstile]")) return;
    const s = document.createElement("script");
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    s.async = true;
    s.defer = true;
    s.setAttribute("data-turnstile", "");
    document.head.appendChild(s);
  }, [cle]);

  if (!cle) return null;

  return (
    <div>
      <div ref={conteneur} className="cf-turnstile" data-sitekey={cle} data-language="fr" data-theme="light" />
      <noscript>
        <p className="mono mt-2 text-[11px] text-ink-soft">
          Activez JavaScript pour valider votre inscription.
        </p>
      </noscript>
    </div>
  );
}
