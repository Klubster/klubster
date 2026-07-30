"use client";

import { useState } from "react";

/**
 * Un bouton du cockpit, visible mais sans effet.
 *
 * Les boutons restent affichés — c'est ce qui montre au visiteur ce que Klubster
 * permet. Ils ne sont câblés sur rien : pas de `formAction`, pas de Server Action,
 * pas de requête. Cliquer affiche une explication et rien d'autre.
 *
 * C'est un `<button type="button">` et jamais un `<form>` : il n'y a donc aucune
 * soumission possible, même en forçant la main au navigateur.
 */
export default function Inerte({
  children,
  variante = "secondaire",
  className = "",
}: {
  children: React.ReactNode;
  variante?: "primaire" | "secondaire" | "discret";
  className?: string;
}) {
  const [montre, setMontre] = useState(false);

  const styles =
    variante === "primaire"
      ? "bg-ink text-paper hover:opacity-90"
      : variante === "discret"
        ? "text-ink-soft hover:text-ink"
        : "border border-line text-ink hover:border-ink";

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={() => setMontre((v) => !v)}
        aria-describedby={montre ? "kb-demo-inerte" : undefined}
        className={`mono px-5 py-3 text-[12px] uppercase tracking-wide ${styles} ${className}`}
      >
        {children}
      </button>
      {montre && (
        <span
          id="kb-demo-inerte"
          role="status"
          className="mono absolute left-0 top-full z-20 mt-2 block w-max max-w-[16rem] border border-line bg-ink px-4 py-3 text-[11px] leading-relaxed text-paper"
        >
          Fonction désactivée dans la démonstration.
          <span className="mt-1 block text-paper/70">Elle fonctionne dans votre club.</span>
        </span>
      )}
    </span>
  );
}
