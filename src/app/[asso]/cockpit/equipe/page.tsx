import { Button, classesBouton } from "@/components/ui/Button";
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

export default async function EquipePage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ ok?: string; ajout?: string; erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  const president = profile?.role === "admin_asso" || profile?.role === "super_admin";
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/equipe`);
  }
  // Même paramètre que les huit autres refus du cockpit : `?acces=refuse` porte un
  // message visible (« Cette page n'est pas accessible avec votre rôle »), `?equipe=refuse`
  // n'en portait aucun — le bénévole revenait au tableau de bord sans explication.
  if (!president) redirect(`/${params.asso}/cockpit?acces=refuse`);

  const supabase = await createSupabaseServerClient();
  // L'écran Équipe ne liste QUE l'équipe. Un profil `adherent` rattaché au club n'est pas
  // un bénévole : l'afficher ici avec un sélecteur dont la valeur `adherent` n'existe pas
  // ferait retomber le navigateur sur la première option — « Président » — et un OK
  // machinal suffirait à promouvoir un adhérent président. Vu en test le 02/08.
  const { data } = await supabase
    .from("profiles")
    .select("id, prenom, nom, email, role")
    .eq("organisation_id", org.id)
    .in("role", ROLES.map((r) => r.cle))
    .order("role", { ascending: true });
  const membres = (data ?? []) as Membre[];

  const roleAvecSlug = definirRole.bind(null, org.slug);
  const ajoutAvecSlug = ajouterMembre.bind(null, org.slug);
  const retraitAvecSlug = retirerMembre.bind(null, org.slug);

  /**
   * Les messages disent CE QUI S'EST PASSÉ, et quoi faire ensuite.
   *
   * L'ancien « L'ajout a échoué. » a masqué un vrai défaut pendant trois semaines : la
   * contrainte de base n'acceptait que quatre rôles quand le cockpit en proposait cinq,
   * et le président ne pouvait pas distinguer ce blocage d'une faute de frappe dans une
   * adresse. Un échec sans motif ne remonte jamais.
   */
  const messageAjout: Record<string, string> = {
    ok: "Membre ajouté à l’équipe, en lecture seule. Choisissez son rôle ci-dessus.",
    introuvable: "Aucun compte Klubster avec cet email. La personne doit d’abord créer son compte.",
    deja_membre: "Cette personne fait déjà partie de votre équipe — son rôle est inchangé.",
    deja_membre_ailleurs: "Ce compte appartient déjà à une autre association.",
    "erreur-role_refuse":
      "La base a refusé ce rôle. C’est un défaut de Klubster, pas une erreur de votre part — signalez-le.",
    "erreur-pas_president": "Seul le président peut modifier l’équipe.",
    "erreur-inconnue": "L’ajout a échoué. Réessayez ; si cela persiste, signalez-le.",
  };

  const messageErreur: Record<string, string> = {
    role_refuse:
      "La base a refusé ce rôle. C’est un défaut de Klubster, pas une erreur de votre part — signalez-le.",
    pas_president: "Seul le président peut modifier les rôles.",
    soi_meme: "Vous ne pouvez pas changer votre propre rôle. Demandez à un autre président.",
    role_inconnu: "Ce rôle n’existe pas.",
    inconnue: "La modification a échoué. Réessayez ; si cela persiste, signalez-le.",
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

        {searchParams?.ok === "role" ? <p className="mono mt-5 text-[12px] text-success">Rôle mis à jour.</p> : null}
        {searchParams?.ok === "retire" ? <p className="mono mt-5 text-[12px] text-success">Membre retiré.</p> : null}
        {searchParams?.ajout ? (
          <p role="status" className={`mono mt-5 text-[12px] ${searchParams.ajout === "ok" ? "text-success" : "text-danger"}`}>
            {messageAjout[searchParams.ajout] ?? messageAjout["erreur-inconnue"]}
          </p>
        ) : null}
        {/* Un motif inconnu ne doit pas donner un bandeau vide : mieux vaut un message
            générique qu'un échec silencieux — c'est le point de bascule que ce projet a
            déjà payé une fois, sur `?erreur=confirmation` sans texte. */}
        {searchParams?.erreur ? (
          <p role="status" className="mono mt-5 text-[12px] text-danger">
            {messageErreur[searchParams.erreur] ?? messageErreur.inconnue}
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
                  {/* Cibles tactiles : ≥ 44 px sur mobile (sélecteur, OK, retirer) — le
                      président fait souvent ça depuis son téléphone, au gymnase. */}
                  <select
                    name="role"
                    defaultValue={m.role}
                    className="min-h-[44px] border border-line bg-paper px-2 py-2 text-[12px] outline-none focus:border-ink sm:min-h-0"
                  >
                    {ROLES.map((r) => (
                      <option key={r.cle} value={r.cle}>{r.label}</option>
                    ))}
                  </select>
                  <button className={classesBouton("secondary", { className: "px-3 py-2 text-[11px] sm:min-h-0" })}>APPLIQUER</button>
                </form>
              )}

              {m.id !== profile.id ? (
                <form action={retraitAvecSlug}>
                  <input type="hidden" name="user_id" value={m.id} />
                  <button className="mono min-h-[44px] px-1 py-2 text-[11px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink sm:min-h-0 sm:py-0">
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
            <Button className="w-full sm:w-auto">AJOUTER →</Button>
          </div>
        </form>
      </div>
    </main>
  );
}
