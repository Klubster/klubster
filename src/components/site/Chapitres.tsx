/* Rendu des chapitres de la vitrine — layouts imposés, DA Klubster (filets, mono, 0px). */
import type { SectionCustom } from "@/types/db";
import { LABEL_DEFAUT } from "@/lib/chapitres";

function Filet({ n, label, accent }: { n: string; label: string; accent: string }) {
  if (!label) return null;
  return (
    <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
      SECTION {n} — {label}
      <span style={{ color: accent }}>_</span>
    </p>
  );
}

function Img({ url, alt, className }: { url: string | null; alt: string; className: string }) {
  if (!url) return null;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className={className} />;
}

export function ChapitreView({ s, n, accent }: { s: SectionCustom; n: string; accent: string }) {
  const label = (s.titre ?? LABEL_DEFAUT[s.type] ?? "Le club").toUpperCase();
  const items = s.items ?? [];

  /* — Le mot du président — */
  if (s.type === "president") {
    const signataire = items[0];
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className="mt-12 flex flex-col gap-10 md:flex-row md:items-start">
          {s.image_url ? (
            <Img url={s.image_url} alt={signataire?.titre ?? "Le président"} className="h-28 w-28 shrink-0 border border-line object-cover md:h-36 md:w-36" />
          ) : null}
          <div>
            <p className="max-w-[30ch] text-2xl font-medium leading-snug md:text-3xl">« {s.texte} »</p>
            {s.texte2 ? <p className="mt-6 max-w-prose text-lg leading-relaxed text-ink-soft">{s.texte2}</p> : null}
            {signataire ? (
              <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">
                {signataire.titre}
                {signataire.texte ? <span className="text-ink-faint"> — {signataire.texte}</span> : null}
                <span style={{ color: accent }}>_</span>
              </p>
            ) : null}
          </div>
        </div>
      </div>
    );
  }

  /* — Chiffres clés — */
  if (s.type === "chiffres") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className={`mt-12 grid grid-cols-2 gap-px border border-line bg-line ${items.length > 3 ? "md:grid-cols-4" : "md:grid-cols-3"}`}>
          {items.map((it, i) => (
            <div key={i} className="bg-paper px-6 py-8">
              <div className="mono text-[32px] font-bold tracking-[-0.02em]" style={{ color: accent }}>{it.titre}</div>
              <div className="mono mt-2 text-[10px] uppercase tracking-label text-ink-soft">{it.texte}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Entraîneurs & bénévoles — */
  if (s.type === "equipe") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 lg:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="bg-paper px-5 py-6">
              {it.image_url ? (
                <Img url={it.image_url} alt={it.titre ?? "Membre de l'équipe"} className="h-24 w-24 border border-line object-cover" />
              ) : (
                <span className="grid h-24 w-24 place-items-center border border-line bg-bg-alt text-[24px] font-bold" style={{ color: accent }} aria-hidden>
                  {(it.titre ?? "?").charAt(0).toUpperCase()}
                </span>
              )}
              <div className="mt-4 text-[15px] font-medium">{it.titre}</div>
              {it.texte ? <div className="mono mt-1 text-[10px] uppercase tracking-wider text-ink-soft">{it.texte}</div> : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Questions fréquentes — */
  if (s.type === "faq") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className="mt-12 border-t border-line">
          {items.map((it, i) => (
            <div key={i} className="border-b border-line py-5">
              <div className="flex items-baseline gap-4">
                <span className="mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <p className="text-[16px] font-medium">{it.titre}</p>
                  {it.texte ? <p className="mt-2 max-w-prose text-[15px] leading-relaxed text-ink-soft">{it.texte}</p> : null}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Galerie photos — */
  if (s.type === "galerie") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className={`mt-12 grid grid-cols-2 gap-px border border-line bg-line ${items.length > 4 ? "md:grid-cols-3" : ""}`}>
          {items.map((it, i) => (
            <div key={i} className="relative h-52 overflow-hidden bg-paper md:h-64">
              <Img url={it.image_url} alt={`Photo du club ${i + 1}`} className="absolute inset-0 h-full w-full object-cover" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Partenaires — */
  if (s.type === "partenaires") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        {s.texte ? <p className="mt-8 max-w-prose text-lg text-ink-soft">{s.texte}</p> : null}
        <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3 md:grid-cols-4">
          {items.map((it, i) => (
            <div key={i} className="grid h-28 place-items-center bg-paper px-6">
              <Img url={it.image_url} alt={it.titre ?? `Partenaire ${i + 1}`} className="max-h-16 w-auto max-w-full object-contain" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Résultats & événements — */
  if (s.type === "resultats") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        <div className="mt-12 border-t border-line">
          {items.map((it, i) => (
            <div key={i} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
              <span className="mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <span className="flex-1 text-[15px]">{it.titre}</span>
              {it.texte ? (
                <span className="mono text-[14px] font-bold" style={{ color: accent }}>{it.texte}</span>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* — Grande citation — */
  if (s.type === "citation") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-24 md:px-8 md:py-36">
        <p className="max-w-[24ch] text-[28px] font-medium leading-[1.15] tracking-[-0.01em] md:text-[40px]">
          {s.texte}
          <span style={{ color: accent }}>_</span>
        </p>
        {s.texte2 ? (
          <p className="mono mt-8 text-[11px] uppercase tracking-label text-ink-soft">{s.texte2}</p>
        ) : null}
      </div>
    );
  }

  /* — Texte & photo (layouts historiques) — */
  const img = (
    <Img url={s.image_url} alt={s.titre ?? "Photo du club"} className="absolute inset-0 h-full w-full object-cover" />
  );

  if (s.type === "triptyque") {
    return (
      <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-28">
        <Filet n={n} label={label} accent={accent} />
        {s.titre ? <h2 className="mt-8 max-w-[24ch] text-3xl font-medium leading-tight md:text-4xl">{s.titre}</h2> : null}
        <div className="mt-12 grid grid-cols-1 gap-px border border-line bg-line md:grid-cols-3">
          <p className="bg-paper px-6 py-8 text-lg leading-relaxed text-ink-soft">{s.texte}</p>
          <div className="relative h-72 overflow-hidden bg-paper md:h-auto">{img}</div>
          <p className="bg-paper px-6 py-8 text-lg leading-relaxed text-ink-soft">{s.texte2}</p>
        </div>
      </div>
    );
  }

  const photoDroite = s.type === "photo-droite";
  const colonneTexte = (
    <div className="px-6 py-20 md:px-8 md:py-24">
      <Filet n={n} label={label} accent={accent} />
      {s.titre ? <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">{s.titre}</h2> : null}
      <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{s.texte}</p>
    </div>
  );
  const colonnePhoto = (
    <div
      className={`relative h-72 overflow-hidden md:h-auto ${
        photoDroite ? "border-t border-line md:border-l md:border-t-0" : "border-b border-line md:border-r md:border-b-0"
      }`}
    >
      {img}
    </div>
  );

  return (
    <div className="mx-auto grid max-w-5xl grid-cols-1 md:grid-cols-2">
      {photoDroite ? (
        <>
          {colonneTexte}
          {colonnePhoto}
        </>
      ) : (
        <>
          {colonnePhoto}
          {colonneTexte}
        </>
      )}
    </div>
  );
}
