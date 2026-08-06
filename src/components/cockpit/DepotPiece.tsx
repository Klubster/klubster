"use client";
import { useRef, useState } from "react";

/**
 * Formulaire de dépôt d'une pièce — avec le contrôle de taille AVANT l'envoi.
 *
 * Le transport des Server Actions est plafonné à 4 Mo (next.config) : au-delà,
 * la requête meurt en 413 AVANT d'exécuter la moindre ligne — aucune redirection,
 * aucun message, l'écran semble simplement ne rien faire. Constaté en déposant un
 * fichier de 6 Mo pendant la certification. Ce composant refuse le fichier côté
 * client, en le disant, au lieu de laisser le silence faire croire à un bug.
 */
const TAILLE_MAX_MO = 4;

export default function DepotPiece({
  action,
  libelle,
  nomChamp = "fichier",
  enfants,
}: {
  action: (formData: FormData) => Promise<void>;
  libelle: string;
  nomChamp?: string;
  enfants?: React.ReactNode;
}) {
  const [erreur, setErreur] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  return (
    <form
      ref={formRef}
      action={action}
      onSubmit={(e) => {
        const fichier = (formRef.current?.elements.namedItem(nomChamp) as HTMLInputElement | null)?.files?.[0];
        if (fichier && fichier.size > TAILLE_MAX_MO * 1024 * 1024) {
          e.preventDefault();
          setErreur(`Fichier trop lourd (${TAILLE_MAX_MO} Mo maximum). Réduisez-le — une photo du document suffit.`);
          return;
        }
        setErreur(null);
        setEnvoi(true);
      }}
      className="mono flex w-full flex-wrap items-center gap-2 pl-1 pt-1 text-[11px]"
    >
      {enfants}
      <input
        type="file"
        name={nomChamp}
        accept="application/pdf,image/png,image/jpeg"
        required
        className="max-w-[240px] text-[11px]"
      />
      <button
        disabled={envoi}
        className="border border-line px-3 py-1.5 uppercase tracking-wide hover:bg-ink hover:text-paper disabled:opacity-40"
      >
        {envoi ? "ENVOI…" : libelle}
      </button>
      {erreur ? <span className="w-full text-danger">{erreur}</span> : null}
    </form>
  );
}
