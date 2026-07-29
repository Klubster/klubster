import Link from "next/link";

/**
 * Footer commun aux pages vitrine (home, tarifs, fonctionnalités).
 *
 * Il était dupliqué à l'identique dans trois pages, avec des listes de liens
 * qui avaient divergé. Une seule source désormais : toute mention légale
 * ajoutée ici apparaît partout.
 *
 * Le bloc contact n'est pas décoratif : l'article 19 de la LCEN impose un
 * accès facile, direct et permanent à une adresse électronique ET à un numéro
 * de téléphone permettant d'entrer effectivement en contact avec l'éditeur.
 */

export const EMAIL_CONTACT = "contact@klubster.fr";
export const TEL_AFFICHE = "06 31 83 84 17";
export const TEL_LIEN = "+33631838417";

function Cur() {
  return <span className="cur">_</span>;
}

const LIENS_PRODUIT: [string, string][] = [
  ["/creer", "Créer mon association"],
  ["/tarifs", "Tarifs"],
  ["/fonctionnalites", "Fonctionnalités"],
  // Sans ce lien, l'étude de cas est une page orpheline : aucune page du site n'y mène,
  // donc aucun robot ne la découvre. C'est pourtant le seul contenu indexable du lancement.
  ["/cas-clients/usm-boxe-anglaise", "Le premier club"],
  ["/connexion", "Espace président"],
];

const LIENS_LEGAUX: [string, string][] = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "CGU"],
  ["/cgv", "CGV"],
  ["/confidentialite", "Confidentialité"],
  ["/sous-traitance", "Sous-traitance"],
];

export default function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto max-w-6xl px-6 py-14 md:px-8">
        <div className="flex flex-col gap-10 md:flex-row md:justify-between">
          <div>
            <Link href="/" className="font-logo text-lg font-semibold">
              k<Cur />
            </Link>
            <p className="mono mt-3 max-w-xs text-[11px] leading-relaxed text-ink-soft">
              Développé à Montauban, au sein de l’USM Boxe Anglaise.
            </p>
            <p className="mono mt-5 text-[11px] leading-relaxed text-ink-soft">
              Une question avant de vous lancer&nbsp;?
              <br />
              <a href={`mailto:${EMAIL_CONTACT}`} className="hover:text-ink">
                {EMAIL_CONTACT}
              </a>
              <br />
              <a href={`tel:${TEL_LIEN}`} className="hover:text-ink">
                {TEL_AFFICHE}
              </a>
            </p>
          </div>

          <div className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            <nav className="mono flex flex-col text-[11px] text-ink-soft">
              {LIENS_PRODUIT.map(([href, label]) => (
                <Link key={href} href={href} className="py-2 hover:text-ink">
                  {label}
                </Link>
              ))}
            </nav>
            <nav className="mono flex flex-col text-[11px] text-ink-soft">
              {LIENS_LEGAUX.map(([href, label]) => (
                <Link key={href} href={href} className="py-2 hover:text-ink">
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <p className="mono mt-12 text-[11px] text-ink-faint">
          © {new Date().getFullYear()} KLUBSTER — Mathieu Bourdieu EI · Tarifs nets, TVA non applicable (art. 293 B du CGI)
        </p>
      </div>
    </footer>
  );
}
