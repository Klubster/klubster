import Link from "next/link";

// Lot S. Un état vide n'est jamais une impasse : il dit ce qui est vide, pourquoi ce
// n'est pas grave, et — quand une action existe — quoi faire ensuite. 29 écrans
// écrivaient chacun leur phrase « Aucun… » sans action : ce composant fixe le motif.
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
        <Link
          href={action.href}
          className="mono mt-6 inline-flex min-h-[44px] items-center border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
