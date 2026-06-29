import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-5">
      <div className="text-center">
        <p className="font-mono text-sm uppercase tracking-[0.18em] text-ink-soft">erreur 404</p>
        <h1 className="mt-3 text-3xl font-bold">Page introuvable</h1>
        <p className="mt-3 text-ink-soft">Cette association ou cette page n&apos;existe pas (ou n&apos;est pas encore publiée).</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-ink px-6 py-3 text-sm font-medium text-white">
          Retour à l&apos;accueil
        </Link>
      </div>
    </main>
  );
}
