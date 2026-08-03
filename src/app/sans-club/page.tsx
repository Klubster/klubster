import Link from "next/link";
import { redirect } from "next/navigation";
import { getProfile, destinationApresConnexion } from "@/lib/auth";
import { deconnexion } from "@/app/connexion/actions";

export const dynamic = "force-dynamic";

/**
 * Écran « connecté, mais sans club ».
 *
 * Avant, un compte sans organisation qui ouvrait l'URL d'un cockpit retombait sur une
 * 404 sèche ou sur le formulaire de connexion alors qu'il était déjà connecté — une
 * impasse constatée en exerçant l'onboarding (02/08). Cette page dit ce qui se passe et
 * propose les trois seules actions utiles. Elle ne dit RIEN du club demandé dans
 * l'URL d'origine : ni son existence, ni son nom.
 */
export default async function SansClub() {
  const profile = await getProfile();
  if (!profile) redirect("/connexion");
  // Un compte qui a déjà un club (ou l'éditeur) n'a rien à faire ici.
  if (profile.organisation_id || profile.role === "super_admin") {
    redirect(await destinationApresConnexion());
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 text-ink">
      <div className="w-full max-w-md">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          VOTRE ESPACE<span className="cur">_</span>
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-[-0.01em]">
          Vous n’avez pas encore créé de club.
        </h1>
        <p className="mt-4 text-[15px] text-ink-soft">
          Votre compte est bien connecté. Il reste à créer votre association pour ouvrir
          votre cockpit — ou, si votre club existe déjà, demandez à son président de vous
          ajouter à l’équipe avec cet email.
        </p>

        <div className="mt-8 flex flex-col gap-3">
          <Link
            href="/creer"
            className="mono block w-full bg-ink px-6 py-4 text-center text-[12px] text-paper hover:bg-ink/90"
          >
            CRÉER MON CLUB →
          </Link>
          <Link
            href="/"
            className="mono block w-full border border-ink px-6 py-4 text-center text-[12px] hover:bg-ink hover:text-paper"
          >
            REVENIR À L’ACCUEIL
          </Link>
          <form action={deconnexion}>
            <button className="mono w-full py-3 text-[11px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink">
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
