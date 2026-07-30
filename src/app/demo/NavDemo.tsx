"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CHIFFRES, euros } from "@/lib/demo/club";

/**
 * La navigation du cockpit, reprise à l'identique du vrai (`[asso]/cockpit`) : mêmes
 * numéros, mêmes libellés, même rail horizontal sur mobile. Le visiteur doit
 * reconnaître l'écran quand il ouvrira le sien.
 *
 * Composant client uniquement pour surligner l'onglet courant — aucune donnée, aucune
 * action.
 */

const NAV = [
  { n: "01", label: "AUJOURD'HUI", href: "/demo" },
  { n: "02", label: "ADHÉRENTS", href: "/demo/adherents" },
  { n: "03", label: "INSCRIPTIONS", href: "/demo/inscriptions" },
  { n: "04", label: "CONTRÔLE", href: "/demo/controle" },
  { n: "05", label: "PAIEMENTS", href: "/demo/paiements" },
  { n: "06", label: "MESSAGES", href: "/demo/messages" },
  { n: "07", label: "SITE", href: "/demo/site" },
];

export default function NavDemo() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5 overflow-x-auto border-b border-line px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:border-b-0 md:border-r md:px-7 md:py-6">
      {NAV.map((item) => {
        const actif = pathname === item.href;
        return (
          <Link
            key={item.n}
            href={item.href}
            className={`mono whitespace-nowrap border-b-2 py-3.5 text-[12px] tracking-wide md:block md:border-b-0 md:py-[10px] ${
              actif ? "border-brand font-bold text-ink" : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {item.n} {item.label}
            {actif ? <span className="cur">_</span> : <span className="text-ink-faint">_</span>}
          </Link>
        );
      })}

      <div className="mono mt-6 hidden border-t border-line pt-5 md:block">
        <div className="text-[10px] uppercase tracking-label text-ink-soft">TRÉSORERIE</div>
        <div className="mt-2 text-[18px] font-bold tracking-tight">{euros(CHIFFRES.encaisseEuros)}</div>
        <div className="mt-1 text-[10px] text-ink-soft">encaissé cette saison</div>
        <div className="mt-4 text-[13px] font-bold" style={{ color: "#B23B3B" }}>
          {euros(CHIFFRES.resteDuEuros)}
        </div>
        <div className="mt-1 text-[10px] text-ink-soft">reste à encaisser</div>
      </div>
    </nav>
  );
}
