import Link from "next/link";
import { classesBouton } from "@/components/ui/Button";

// Lot S. Un état vide n'est jamais une impasse : il dit ce qui est vide, pourquoi ce
// n'est pas grave, et — quand une action existe — quoi faire ensuite. 29 écrans
// écrivaient chacun leur phrase « Aucun… » sans action : ce composant fixe le motif.
// S6 : deux vides ne se ressemblent pas — un filtre sans résultat n'est pas un premier
// usage. C'est aux écrans de choisir titre/détail/action ; le composant fixe la forme.
export function EtatVide({
  titre,
  detail,
  action,
}: {
  titre: string;
  detail?: string;
  action?: { href: string; label: string };
}) {
  return (
    <div className="border border-dashed border-line px-6 py-10 text-center">
      <p className="text-[15px] text-ink-soft">{titre}</p>
      {detail ? <p className="mt-2 text-[13px] text-ink-faint">{detail}</p> : null}
      {action ? (
        <Link href={action.href} className={classesBouton("secondary", { className: "mt-6" })}>
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
