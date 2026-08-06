"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ErreurEcran } from "@/components/ui/ErreurEcran";

// Lot S. Avant cette frontière, une erreur serveur dans le cockpit affichait l'écran
// générique de Next — hors marque, sans issue, et le bénévole croyait le produit cassé.
export default function ErreurCockpit({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    // Ne jamais avaler une erreur : elle part dans les logs Vercel via la console.
    console.error("cockpit", error);
  }, [error]);

  // Le slug est le premier segment de l'URL — error.tsx ne reçoit pas les params.
  const slug = usePathname()?.split("/")[1];

  return (
    <ErreurEcran
      titre="Le cockpit n’a pas pu s’afficher"
      detail="Vos données sont intactes — l’écran a échoué, pas le club. Réessayez ; si l’erreur revient, écrivez-nous depuis la bulle « Écrire à Mathieu » ou à contact@klubster.fr."
      reset={reset}
      retour={slug ? { href: `/${slug}/cockpit`, label: "Revenir à l’accueil du cockpit" } : undefined}
    />
  );
}
