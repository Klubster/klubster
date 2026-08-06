"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ErreurEcran } from "@/components/ui/ErreurEcran";

// Lot S. Ici, pas de promesse sur les champs saisis : selon le moment de l'erreur,
// le formulaire peut les avoir perdus. On dit ce qui est sûr — l'inscription n'est
// pas enregistrée à moitié — et on offre une reprise, pas une impasse.
export default function ErreurInscription({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("inscription", error);
  }, [error]);

  const slug = usePathname()?.split("/")[1];

  return (
    <ErreurEcran
      titre="L’inscription n’a pas pu s’afficher"
      detail="Rien n’a été enregistré à moitié : aucune inscription incomplète n’a été créée, et rien ne vous a été facturé. Réessayez, ou revenez un peu plus tard."
      reset={reset}
      retour={slug ? { href: `/${slug}`, label: "Revenir au site du club" } : undefined}
    />
  );
}
