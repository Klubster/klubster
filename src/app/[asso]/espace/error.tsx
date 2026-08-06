"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { ErreurEcran } from "@/components/ui/ErreurEcran";

// Lot S. L'adhérent (ou le parent) est le public le moins technicien du produit :
// une erreur brute est pour lui un point d'abandon, pas un incident passager.
export default function ErreurEspace({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("espace", error);
  }, [error]);

  const slug = usePathname()?.split("/")[1];

  return (
    <ErreurEcran
      titre="Votre espace n’a pas pu s’afficher"
      detail="Votre dossier et vos paiements sont intacts. Réessayez — si l’erreur revient, prévenez votre club, il sait nous joindre."
      reset={reset}
      retour={slug ? { href: `/${slug}`, label: "Revenir au site du club" } : undefined}
    />
  );
}
