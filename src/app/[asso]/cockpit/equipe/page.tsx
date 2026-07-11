import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ROLES, libelleRole } from "@/lib/roles";
import { definirRole, ajouterMembre, retirerMembre } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

type Membre = { id: string; prenom: string | null; nom: string | null; email: string | null; role: string };

export default async function EquipePage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { ok?: string; ajout?: string; erreur?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  const president = profile?.role === "admin_asso" || profile?.role === "super_admin";
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/equipe`);
  }
  if (!president) redirect(`/${params.asso}/cockpit?equipe=refuse`);

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email, role")
    .eq("organisation_id", org.id)
    .order("role", { ascending: true });
  const membres = (data ?? []) as Membre[];

  const roleAvecSlug = definirRole.bind(null, org.slug);
  const ajoutAvecSlug = ajouterMembre.bind(null, org.slug);
  const retraitAvecSlug = retirerMembre.bind(null, org.slug);

  const messageAjout: Record<string, string> = {
    ok: "Membre ajouté à l’équipe.",
    introuvable: "Aucun compte Klubster avec cet email. La personne doit d’abord créer son compte.",
    deja_membre_ailleurs: "Ce compte appartient déjà à une autre association.",
    erreur: "L’ajout a échoué.",
  };

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← COCKPIT
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ÉQUIPE<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">Votre équipe.</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Chaque bénévole a le juste accès : un trésorier gère les paiements sans voir les données de santé,
          un encadrant contrôle au bord du terrain sans toucher à l’argent.
        </p>

        {searchParams?.ok === "role" ? <p className="mono mt-5 text-[12px]" style={{ color: "#1E7A4F" }}>Rôle mis à jour.</p> : null}
        {searchParams?.ok === "retire" ? <p className="mono mt-5 text-[12px]" style={{ color: "#1E7A4F" }}>Membre retiré.</p> : null}
        {searchParams?.ajout ? (
          <p className="mono mt-5 text-[12px]" style={{ color: searchParams.ajout === "ok" ? "#1E7A4F" : "#B23B3B" }}>
            {messageAjout[searchParams.ajout] ?? ""}
          </p>
        ) : null}

        <div className="mt-8 border border-line">
          {membres.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 border-b border-line px-5 py-4 last:border-b-0">
              <div className="min-w-[180px] flex-1">
                <div className="text-[15px] font-medium">
                  {m.prenom || m.nom ? `${m.prenom ?? ""} ${m.nom ?? ""}`.trim() : m.email}
                  {m.id === profile.id ? <span className="mono ml-2 text-[10px] text-ink-faint">(vous)</span> : null}
                </div>
                {m.email ? <div className="mono text-[12px] text-ink-soft">{m.email}</div> : null}
              </div>

              {m.id === profile.id ? (
                <span className="mono text-[12px] text-ink-soft">{libelleRole(m.role)}</span>
              ) : (
                <form action={roleAvecSlug} className="flex items-center gap-2">
                  <input type="hidden" name="user_id" value={m.id} />
                  <select
                    name="role"
                    defaultValue={m.role}
                    className="border border-line bg-paper px-2 py-2 text-[12px] outline-none focus:border-ink"
                  >
                    {ROLES.map((r) => (
                      <option key={r.cle} value={r.cle}>{r.label}</option>
                    ))}
                  </select>
                  <button className="mono border border-ink px-3 py-2 text-[11px] hover:bg-ink hover:text-paper">OK</button>
                </form>
              )}

              {m.id !== profile.id ? (
                <form action={retraitAvecSlug}>
                  <input type="hidden" name="user_id" value={m.id} />
                  <button className="mono text-[11px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink">
                    retirer
                  </button>
                </form>
              ) : null}
            </div>
          ))}
        </div>

        {/* Rôles, en clair. */}
        <div className="mt-6 border border-line bg-bg-alt px-5 py-4">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LES RÔLES<Cur /></p>
          <div className="mt-3 space-y-2">
            {ROLES.map((r) => (
              <p key={r.cle} className="text-[13px]">
                <span className="font-medium">{r.label}</span> <span className="text-ink-soft">— {r.desc}</span>
              </p>
            ))}
          </div>
        </div>

        {/* Ajouter un bénévole. */}
        <form action={ajoutAvecSlug} className="mt-6 border border-line px-5 py-4">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">AJOUTER UN BÉNÉVOLE<Cur /></p>
          <p className="mono mt-2 text-[11px] text-ink-faint">
            La personne crée d’abord son compte sur Klubster, puis vous l’ajoutez ici avec son email.
          </p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <input
              name="email"
              type="email"
              required
              placeholder="email du bénévole"
              className="min-w-[240px] flex-1 border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
            <button className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">AJOUTER →</button>
          </div>
        </form>
      </div>
    </main>
  );
}
