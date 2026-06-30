import Reveal from "./Reveal";
import Parallax from "./Parallax";

export type Shot = { src: string; alt: string; fig?: string; legende?: string };

function Frame({ shot, h }: { shot: Shot; h: string }) {
  return (
    <div className={`relative overflow-hidden ${h}`}>
      <Parallax src={shot.src} alt={shot.alt} className="absolute inset-0" strength={0.05} />
      {shot.fig || shot.legende ? (
        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 bg-ink/80 px-4 py-2.5">
          <span className="mono text-[10px] uppercase tracking-label text-paper/55">{shot.fig}</span>
          <span className="mono text-[11px] text-paper/90">{shot.legende}</span>
        </div>
      ) : null}
    </div>
  );
}

// Galerie éditoriale, filet blanc 1px (gap-px sur fond blanc), style magazine.
// variant "duo" = 2 horizontales. variant "feature" = 1 grande + 2 petites.
export default function EditorialGallery({ variant, shots }: { variant: "duo" | "feature"; shots: Shot[] }) {
  if (variant === "duo") {
    return (
      <Reveal className="mx-auto max-w-6xl px-6 md:px-8">
        <div className="grid grid-cols-1 gap-px bg-white md:grid-cols-2">
          <Frame shot={shots[0]} h="h-[300px] md:h-[480px]" />
          <Frame shot={shots[1]} h="h-[300px] md:h-[480px]" />
        </div>
      </Reveal>
    );
  }
  // feature : 1 grande à gauche, 2 empilées à droite
  return (
    <Reveal className="mx-auto max-w-6xl px-6 md:px-8">
      <div className="grid grid-cols-1 gap-px bg-white md:grid-cols-[1.65fr_1fr] md:h-[560px]">
        <Frame shot={shots[0]} h="h-[320px] md:h-full" />
        <div className="grid grid-cols-1 gap-px bg-white md:grid-rows-2">
          <Frame shot={shots[1]} h="h-[200px] md:h-full" />
          <Frame shot={shots[2]} h="h-[200px] md:h-full" />
        </div>
      </div>
    </Reveal>
  );
}
