"use client";

import { useFormStatus } from "react-dom";
import { classesBouton, type VarianteBouton } from "@/components/ui/Button";

/**
 * Bouton de formulaire qui dit ce qu'il fait pendant qu'il le fait.
 *
 * Les allers-retours vers Stripe prennent parfois plusieurs secondes : sans
 * retour visible, le président croit que rien ne se passe et reclique — ce qui
 * enchaîne les appels. Le bouton se désactive et annonce l'attente.
 *
 * S6 : l'habit vient de `classesBouton` (design system) via `variant` ; `className`
 * reste accepté pour les ajustements de mise en page (largeur, marges), plus pour
 * redéfinir le style du bouton lui-même.
 */
export default function BoutonAttente({
  children,
  attente,
  className,
  variant,
  compact,
}: {
  children: React.ReactNode;
  /** Ce qu'on affiche pendant le traitement, ex. « OUVERTURE DE STRIPE… ». */
  attente: string;
  className?: string;
  variant?: VarianteBouton;
  compact?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${
        variant ? classesBouton(variant, { compact, className }) : className ?? ""
      } disabled:cursor-wait disabled:opacity-60`}
    >
      {pending ? attente : children}
    </button>
  );
}
