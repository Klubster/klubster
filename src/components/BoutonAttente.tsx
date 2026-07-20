"use client";

import { useFormStatus } from "react-dom";

/**
 * Bouton de formulaire qui dit ce qu'il fait pendant qu'il le fait.
 *
 * Les allers-retours vers Stripe prennent parfois plusieurs secondes : sans
 * retour visible, le président croit que rien ne se passe et reclique — ce qui
 * enchaîne les appels. Le bouton se désactive et annonce l'attente.
 */
export default function BoutonAttente({
  children,
  attente,
  className,
}: {
  children: React.ReactNode;
  /** Ce qu'on affiche pendant le traitement, ex. « OUVERTURE DE STRIPE… ». */
  attente: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? attente : children}
    </button>
  );
}
