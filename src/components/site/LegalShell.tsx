import Link from "next/link";

function Cur() {
  return <span className="cur">_</span>;
}

const LIENS: [string, string][] = [
  ["/mentions-legales", "Mentions légales"],
  ["/cgu", "CGU"],
  ["/cgv", "CGV"],
  ["/confidentialite", "Confidentialité"],
  ["/sous-traitance", "Sous-traitance (DPA)"],
];

export default function LegalShell({
  kicker,
  titre,
  maj,
  children,
}: {
  kicker: string;
  titre: string;
  maj: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <Link href="/" className="mono text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">← ACCUEIL</Link>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">{kicker}<Cur /></p>
        <h1 className="mt-6 text-3xl font-medium md:text-4xl">{titre}</h1>
        <p className="mono mt-3 text-[11px] text-ink-faint">Dernière mise à jour : {maj}</p>
        <div className="legal-prose mt-10">{children}</div>
      </div>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2 px-6 py-10 md:px-8">
          {LIENS.map(([href, label]) => (
            <Link key={href} href={href} className="mono text-[11px] uppercase tracking-wide text-ink-soft hover:text-ink">{label}</Link>
          ))}
        </div>
      </footer>
    </main>
  );
}
