// Lot S. Squelettes de chargement — le signal honnête pendant une navigation serveur.
// Formes rectangulaires nettes (aucune rondeur, DA), pulsation discrète, et un libellé
// pour les lecteurs d'écran : un squelette muet est un écran vide pour eux.

function Barre({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-bg-alt ${className}`} aria-hidden />;
}

// En-tête de page : kicker + titre + sous-titre, le rythme des écrans du cockpit.
export function SqueletteEntete() {
  return (
    <div>
      <Barre className="h-3 w-32" />
      <Barre className="mt-4 h-8 w-72 max-w-full" />
      <Barre className="mt-3 h-4 w-96 max-w-full" />
    </div>
  );
}

// Liste : n lignes de hauteur constante, comme les listes d'adhérents ou de règlements.
export function SqueletteListe({ lignes = 6 }: { lignes?: number }) {
  return (
    <div className="mt-8 space-y-px">
      {Array.from({ length: lignes }).map((_, i) => (
        <Barre key={i} className="h-14 w-full" />
      ))}
    </div>
  );
}

export function EcranChargement({ libelle = "Chargement de la page…" }: { libelle?: string }) {
  return (
    <div className="mx-auto w-full max-w-6xl px-5 py-10 md:px-8" role="status" aria-live="polite">
      <span className="sr-only">{libelle}</span>
      <SqueletteEntete />
      <SqueletteListe />
    </div>
  );
}
