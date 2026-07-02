import Link from "next/link";
import type { Organisation } from "@/types/db";

export function SiteHeader({ org, estAdmin }: { org: Organisation; estAdmin?: boolean }) {
  const accent = org.couleur_primaire ?? "#111111";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="flex items-center gap-2.5">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.nom} className="h-7 w-7 object-cover" />
          ) : (
            <span
              className="grid h-7 w-7 place-items-center text-[13px] font-bold text-white"
              style={{ background: accent }}
              aria-hidden
            >
              {org.nom.charAt(0)}
            </span>
          )}
          <span className="mono text-[14px] font-bold tracking-tight">{org.nom}</span>
        </Link>
        <nav className="mono hidden items-center gap-6 text-[12px] tracking-wide text-ink-soft md:flex">
          <a href="#presentation" className="hover:text-ink">Le club</a>
          <a href="#cours" className="hover:text-ink">Cours</a>
          <a href="#planning" className="hover:text-ink">Planning</a>
          <a href="#tarifs" className="hover:text-ink">Tarifs</a>
          <a href="#contact" className="hover:text-ink">Contact</a>
        </nav>
        <div className="flex items-center gap-3">
          {estAdmin ? (
            <Link
              href={`/${org.slug}/cockpit`}
              className="mono border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper"
            >
              COCKPIT →
            </Link>
          ) : null}
          <Link
            href={`/${org.slug}/inscription`}
            className="mono px-4 py-2 text-[12px] text-white transition-opacity hover:opacity-90"
            style={{ background: accent }}
          >
            S&apos;INSCRIRE →
          </Link>
        </div>
      </div>
    </header>
  );
}
