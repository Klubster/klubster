"use client";

import Link from "next/link";

/**
 * Le rail numéroté, repris à l'identique de `cockpit/page.tsx` (lignes 95-105).
 *
 * SEPT ENTRÉES, PAS HUIT. Il n'y a pas d'`ADHÉRENTS` dans le rail réel : on y accède
 * par le geste « Gérer les adhérents » de la grille d'actions rapides. La première
 * version de la démonstration l'avait inventée, et oubliait `06 ACTUALITÉS`.
 *
 * LE NOM PUBLIC N'EST PAS LE NOM TECHNIQUE, et c'est délibéré dans le produit :
 * « Inscriptions » mène à `formulaire`, « Contrôle » à `scanner`, « Messages » à
 * `communication`. Le commentaire du cockpit l'explique pour le scanner : « Contrôle et
 * non Présences : le scan vérifie l'inscription, la cotisation et le dossier — la
 * feuille d'appel n'en est qu'un des usages. » Les routes de la démonstration gardent
 * donc les noms publics.
 *
 * CE COMPOSANT N'EST RENDU QUE PAR `/demo/page.tsx`. Le mettre dans le layout l'aurait
 * fait suivre le visiteur sur toutes les sous-pages — or aucune n'en a dans le cockpit,
 * elles reviennent par leur propre lien.
 */

const ENTREES = [
  { n: "01", label: "AUJOURD’HUI", href: "/demo" },
  { n: "02", label: "INSCRIPTIONS", href: "/demo/inscriptions" },
  { n: "03", label: "CONTRÔLE", href: "/demo/controle" },
  { n: "04", label: "PAIEMENTS", href: "/demo/paiements" },
  { n: "05", label: "MESSAGES", href: "/demo/messages" },
  { n: "06", label: "ACTUALITÉS", href: "/demo/actualites" },
  { n: "07", label: "SITE", href: "/demo/site" },
] as const;

export default function RailDemo() {
  return (
    <nav
      aria-label="Sections du cockpit"
      className="flex gap-5 overflow-x-auto border-b border-line px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:border-b-0 md:border-r md:px-7 md:py-6"
    >
      {ENTREES.map((item) => {
        // « Aujourd'hui » est la page courante : c'est le seul écran qui rend ce rail.
        const actif = item.href === "/demo";
        return (
          <Link
            key={item.n}
            href={item.href}
            aria-current={actif ? "page" : undefined}
            className={`mono block min-h-[44px] whitespace-nowrap border-b-2 py-3.5 text-[12px] tracking-wide outline-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:border-b-0 md:py-[10px] ${
              actif ? "border-brand font-bold text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {item.n} {item.label}
            {actif ? <span className="cur">_</span> : <span className="text-ink-faint">_</span>}
          </Link>
        );
      })}

      {/* Le bloc trésorerie vit DANS le rail, comme dans le produit — masqué sous `md`,
          où le rail devient une bande horizontale et n'a plus la place.

          TROIS LIGNES, PAS CINQ. J'y avais ajouté « X € encaissé cette saison » : le
          rail réel n'en porte pas. C'est une promesse de marque — l'argent va direct au
          club, sans commission — et non un tableau de bord. Le montant encaissé a sa
          place sur l'écran Paiements, où il est déjà. */}
      <div className="mono mt-6 hidden border-t border-line pt-5 md:block">
        <div className="text-[10px] uppercase tracking-label text-ink-soft">TRÉSORERIE</div>
        <div className="mt-2 text-[12px] text-brand">✓ reversée direct</div>
        <div className="mt-0.5 text-[11px] text-ink-faint">0 % commission</div>
      </div>
    </nav>
  );
}
