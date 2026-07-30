import Link from "next/link";
import { exigerSuperAdminSansFacteur } from "@/lib/admin";
import { etatMfa } from "@/lib/mfa";
import Facteur from "./Facteur";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

/**
 * Sécurité de la console : enrôler le second facteur, ou le présenter.
 *
 * Cette page passe par `exigerSuperAdminSansFacteur` — et c'est la SEULE de la console
 * dans ce cas. Elle exige d'être super-administrateur, mais pas d'avoir déjà présenté
 * son facteur : sinon il faudrait être vérifié pour atteindre l'écran de vérification.
 */
export default async function SecuritePage(props: {
  searchParams: Promise<{ next?: string }>;
}) {
  await exigerSuperAdminSansFacteur("/admin/securite");
  const searchParams = await props.searchParams;
  const { facteurVerifie, satisfait } = await etatMfa();

  // On ne renvoie que vers un chemin interne : une valeur de `?next=` venue d'ailleurs
  // ferait de cette page un tremplin de redirection ouverte.
  const brut = searchParams?.next ?? "/admin";
  const suite = brut.startsWith("/") && !brut.startsWith("//") ? brut : "/admin";

  const mode = facteurVerifie ? "verifier" : "enroler";

  return (
    <main id="contenu" className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-3xl px-6 py-16 md:px-8 md:py-24">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          CONSOLE — SÉCURITÉ<Cur />
        </p>

        <h1 className="mt-7 text-3xl font-medium leading-tight tracking-[-0.01em] md:text-[40px]">
          {facteurVerifie ? "Confirmez que c’est bien vous." : "Protégez la console."}
        </h1>

        {!facteurVerifie && (
          <p className="mt-6 max-w-prose text-lg text-ink-soft">
            La console voit tous les clubs, tous les dossiers et tous les montants. Un mot de
            passe seul n’y suffit pas.
          </p>
        )}

        <Facteur mode={mode} suite={suite} />

        {facteurVerifie && satisfait && (
          <p className="mono mt-8 text-[12px] text-brand">
            ✓ Session déjà vérifiée. <Link href={suite} className="underline">Revenir à la console →</Link>
          </p>
        )}

        <div className="mt-14 border-t border-line pt-8">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            EN CAS DE PERTE<Cur />
          </p>
          <p className="mt-4 max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Il n’existe pas de porte dérobée dans Klubster — c’est délibéré. Si vous perdez
            l’accès au code, supprimez le facteur depuis le tableau de bord Supabase
            (<span className="mono">Authentication → Users</span>), lui-même protégé par sa
            propre double authentification. Vous pourrez alors en enrôler un nouveau ici.
          </p>
        </div>
      </div>
    </main>
  );
}
