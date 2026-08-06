"use client";

import { useEffect } from "react";
import { ErreurEcran } from "@/components/ui/ErreurEcran";

// Lot S. Public : le super-admin uniquement — le détail technique est utile ici,
// contrairement aux écrans grand public. Le message reste sobre, la console le complète.
export default function ErreurAdmin({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error("admin", error);
  }, [error]);

  return (
    <ErreurEcran
      titre="La console n’a pas pu s’afficher"
      detail={`L’erreur est journalisée. ${error.message ? `Détail : ${error.message}` : ""}`}
      reset={reset}
      retour={{ href: "/admin", label: "Revenir à la console" }}
    />
  );
}
