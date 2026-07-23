import Link from "next/link";
import Image from "next/image";
import MenuMobile from "@/components/site/MenuMobile";
import { texteSur } from "@/lib/contraste";
import type { Organisation } from "@/types/db";

export interface LienSection {
  href: string;
  label: string;
}

/** Chapitres standards, dans leur ordre de lecture. Repli si l'appelant ne dit rien. */
const LIENS_PAR_DEFAUT: LienSection[] = [
  { href: "#presentation", label: "Le club" },
  { href: "#cours", label: "Cours" },
  { href: "#planning", label: "Planning" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#contact", label: "Contact" },
];

export function SiteHeader({
  org,
  estAdmin,
  edition,
  liens,
}: {
  org: Organisation;
  estAdmin?: boolean;
  edition?: boolean;
  /** Les chapitres réellement présents sur la page. Les sections vides étant masquées,
   *  une nav figée proposait « Planning » ou « Contact » vers une ancre inexistante :
   *  le lien ne faisait rien, ce qui est pire que de ne pas l'afficher. */
  liens?: LienSection[];
}) {
  const accent = org.couleur_primaire ?? "#111111";
  // La couleur du club est un hex libre : sur un accent clair (jaune, bleu ciel…),
  // le blanc codé en dur devenait illisible. texteSur choisit blanc ou encre.
  const texteAccent = texteSur(accent);
  const nav = liens && liens.length > 0 ? liens : LIENS_PAR_DEFAUT;
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="flex min-w-0 items-center gap-2.5">
          {org.logo_url ? (
            // Les logos sortent du Storage tels qu'uploadés (jusqu'à 3 Mo) : next/image
            // les redimensionne à la taille affichée (40 px) et les convertit en AVIF/WebP.
            <Image src={org.logo_url} alt={org.nom} width={40} height={40} className="h-10 w-10 object-cover" />
          ) : (
            <span
              className="grid h-10 w-10 place-items-center text-[16px] font-bold"
              style={{ background: accent, color: texteAccent }}
              aria-hidden
            >
              {org.nom.charAt(0)}
            </span>
          )}
          <span className="mono truncate text-[14px] font-bold tracking-tight">{org.nom}</span>
        </Link>
        <nav className="mono hidden items-center gap-6 text-[12px] tracking-wide text-ink-soft md:flex">
          {nav.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          {estAdmin ? (
            <>
              <Link
                href={edition ? `/${org.slug}` : `/${org.slug}?edition=1`}
                className={`mono px-4 py-2 text-[12px] ${edition ? "bg-ink text-paper hover:bg-ink/90" : "border border-ink hover:bg-ink hover:text-paper"}`}
              >
                {edition ? "TERMINER" : "MODIFIER"}
              </Link>
              <Link
                href={`/${org.slug}/cockpit`}
                className="mono hidden border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper sm:block"
              >
                COCKPIT →
              </Link>
            </>
          ) : null}
          <Link
            href={`/${org.slug}/inscription`}
            className="mono px-4 py-2 text-[12px] transition-opacity hover:opacity-90"
            style={{ background: accent, color: texteAccent }}
          >
            S&apos;INSCRIRE →
          </Link>
          <MenuMobile ton="sombre" liens={nav} />
        </div>
      </div>
    </header>
  );
}
