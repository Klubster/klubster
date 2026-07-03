import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Communication from "./Communication";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function MessageriePage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/communication`);
  }

  const supabase = createSupabaseServerClient();
  const { data: adhData } = await supabase.from("adherents").select("id, email").eq("organisation_id", org.id);
  const { data: insData } = await supabase.from("adhesions").select("adherent_id, cours_id").eq("organisation_id", org.id);
  const { data: coursData } = await supabase.from("cours").select("id, nom").eq("organisation_id", org.id).order("ordre");

  const adherents = (adhData ?? []) as { id: string; email: string | null }[];
  const adhesions = (insData ?? []) as { adherent_id: string; cours_id: string | null }[];
  const cours = (coursData ?? []) as { id: string; nom: string }[];

  const coursByAdh = new Map<string, string[]>();
  for (const r of adhesions) {
    if (!r.cours_id) continue;
    const arr = coursByAdh.get(r.adherent_id) ?? [];
    arr.push(r.cours_id);
    coursByAdh.set(r.adherent_id, arr);
  }
  const membres = adherents
    .filter((a) => a.email)
    .map((a) => ({ email: a.email as string, coursIds: coursByAdh.get(a.id) ?? [] }));

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Écrire à vos adhérents.</h1>
        <p className="mt-3 text-ink-soft">
          Choisissez un groupe, écrivez votre message : Klubster prépare l’email et l’ouvre dans votre messagerie,
          les adhérents en copie cachée.
        </p>

        {membres.length === 0 ? (
          <p className="mono mt-8 text-[12px] text-ink-soft">Aucun adhérent avec un email pour le moment.</p>
        ) : (
          <Communication membres={membres} cours={cours} contactEmail={org.email_contact} />
        )}
      </div>
    </main>
  );
}
