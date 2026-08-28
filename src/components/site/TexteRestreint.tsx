import { parseMarkdownRestreint, type Bloc, type Inline } from "@/lib/markdown-restreint";

/**
 * Rendu d'un contenu en Markdown restreint (voir `src/lib/markdown-restreint.ts`).
 * Jamais d’injection de HTML brut : l’arbre est produit par le parseur, chaque nœud
 * devient un élément React. Les liens s'ouvrent dans un nouvel onglet, sans transmettre
 * la page d'origine ; les images viennent d'URL http(s) externes, sans référent.
 */
function Inlines({ noeuds }: { noeuds: Inline[] }) {
  return (
    <>
      {noeuds.map((n, i) => {
        switch (n.type) {
          case "texte":
            return <span key={i}>{n.texte}</span>;
          case "saut":
            return <br key={i} />;
          case "gras":
            return <strong key={i} className="font-medium text-ink"><Inlines noeuds={n.enfants} /></strong>;
          case "italique":
            return <em key={i}><Inlines noeuds={n.enfants} /></em>;
          case "lien":
            return (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-ink">
                <Inlines noeuds={n.enfants} />
              </a>
            );
        }
      })}
    </>
  );
}

function BlocRendu({ bloc }: { bloc: Bloc }) {
  switch (bloc.type) {
    case "paragraphe":
      return <p className="text-[14px] leading-relaxed text-ink-soft"><Inlines noeuds={bloc.enfants} /></p>;
    case "liste":
      return (
        <ul className="list-disc space-y-1 pl-5 text-[14px] leading-relaxed text-ink-soft">
          {bloc.items.map((it, i) => <li key={i}><Inlines noeuds={it} /></li>)}
        </ul>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element -- URL externe choisie par le club, hors du pipeline next/image
      return <img src={bloc.url} alt={bloc.alt} loading="lazy" referrerPolicy="no-referrer" className="block h-auto max-w-full" />;
  }
}

export default function TexteRestreint({ contenu, className }: { contenu: string; className?: string }) {
  const blocs = parseMarkdownRestreint(contenu);
  if (blocs.length === 0) return null;
  return (
    <div className={["space-y-3", className].filter(Boolean).join(" ")}>
      {blocs.map((b, i) => <BlocRendu key={i} bloc={b} />)}
    </div>
  );
}
