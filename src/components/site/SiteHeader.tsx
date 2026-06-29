import Link from "next/link";
import type { Organisation } from "@/types/db";

export function SiteHeader({ org }: { org: Organisation }) {
  const accent = org.couleur_primaire ?? "#0B1220";
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <Link href={`/${org.slug}`} className="flex items-center gap-2.5">
          {org.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={org.logo_url} alt={org.nom} className="h-8 w-8 rounded-control object-cover" />
          ) : (
            <span
              className="grid h-8 w-8 place-items-center rounded-control font-mono text-sm font-bold text-white"
              style={{ background: accent }}
              aria-hidden
            >
              {org.nom.charAt(0)}
            </span>
          )}
          <span className="font-mono text-sm font-bold tracking-tight">{org.nom}</span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-ink-soft md:flex">
          <a href="#presentation" className="hover:text-ink">Le club</a>
          <a href="#cours" className="hover:text-ink">Cours</a>
          <a href="#planning" className="hover:text-ink">Planning</a>
          <a href="#tarifs" className="hover:text-ink">Tarifs</a>
          <a href="#contact" className="hover:text-ink">Contact</a>
        </nav>
        <Link
          href={`/${org.slug}/inscription`}
          className="inline-flex items-center rounded-full px-4 py-2 text-sm font-medium text-white shadow-sm transition-opacity hover:opacity-90"
          style={{ background: accent }}
        >
          S&apos;inscrire
        </Link>
      </div>
    </header>
  );
}
