"use client";

// Lot S. L'écran d'erreur aux couleurs de la maison — avant lui, toute erreur serveur
// affichait la page générique de Next, hors marque et sans issue. Règle du projet :
// jamais d'impasse muette. Ici : ce qui s'est passé, réessayer, revenir.
export function ErreurEcran({
  titre = "La page n’a pas pu s’afficher",
  detail = "Rien n’est perdu de votre côté. Réessayez — si l’erreur revient, elle est chez nous, pas chez vous.",
  reset,
  retour,
}: {
  titre?: string;
  detail?: string;
  reset: () => void;
  retour?: { href: string; label: string };
}) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-16 md:px-8">
      <p className="mono text-[11px] uppercase tracking-label text-danger">_erreur</p>
      <h1 className="mt-4 text-3xl font-medium md:text-4xl">{titre}</h1>
      <p className="mt-3 max-w-prose text-[15px] text-ink-soft">{detail}</p>
      <div className="mt-8 flex flex-wrap gap-3">
        <button
          onClick={reset}
          className="mono inline-flex min-h-[44px] items-center bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
        >
          Réessayer
        </button>
        {retour ? (
          <a
            href={retour.href}
            className="mono inline-flex min-h-[44px] items-center border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
          >
            {retour.label}
          </a>
        ) : null}
      </div>
    </div>
  );
}
