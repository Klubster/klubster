import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

const PAR_PAGE = 25;

function Cur() {
  return <span className="cur">_</span>;
}

type LigneAdhesion = { statut: string | null; montant_centimes: number | null; cours: { nom: string } | null };
type LigneAdherent = {
  id: string;
  prenom: string;
  nom: string;
  email: string | null;
  telephone: string | null;
  created_at: string;
  adhesions: LigneAdhesion[] | null;
};

export default async function Adherents({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { q?: string; page?: string; statut?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents`);
  }

  const q = (searchParams.q ?? "").trim();
  const statut = searchParams.statut ?? "";
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const debut = (page - 1) * PAR_PAGE;

  const supabase = createSupabaseServerClient();
  let requete = supabase
    .from("adherents")
    .select("id, prenom, nom, email, telephone, created_at, adhesions(statut, montant_centimes, cours(nom))", {
      count: "exact",
    })
    .eq("organisation_id", org.id);

  if (q) {
    // Les caractères de filtre PostgREST (virgule, parenthèses) sont retirés :
    // interpolés tels quels, ils permettraient de réécrire la condition.
    const propre = q.toLowerCase().replace(/[^a-zà-ÿ0-9@.\- ]/gi, "");
    if (propre) {
      requete = requete.or(`nom.ilike.%${propre}%,prenom.ilike.%${propre}%,email.ilike.%${propre}%`);
    }
  }

  const { data, count } = await requete.order("nom", { ascending: true }).range(debut, debut + PAR_PAGE - 1);

  let lignes = (data ?? []) as unknown as LigneAdherent[];
  if (statut) lignes = lignes.filter((a) => a.adhesions?.[0]?.statut === statut);

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (statut) s.set("statut", statut);
    if (p > 1) s.set("page", String(p));
    const qs = s.toString();
    return `/${org.slug}/cockpit/adherents${qs ? `?${qs}` : ""}`;
  };

  return (
    <main className="min-h-screen text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← COCKPIT
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          ADHÉRENTS<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-[-0.01em]">
            {total} adhérent{total > 1 ? "s" : ""}
          </h1>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${org.slug}/cockpit/adherents/import`}
              className="mono border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
            >
              IMPORTER UN FICHIER
            </Link>
            <Link
              href={`/${org.slug}/cockpit/adherents/nouveau`}
              className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90"
            >
              AJOUTER UN ADHÉRENT →
            </Link>
          </div>
        </div>

        <form className="mt-8 flex flex-wrap items-center gap-3">
          <input
            name="q"
            defaultValue={q}
            placeholder="Rechercher un nom, un prénom, un email…"
            className="min-w-[260px] flex-1 border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          <select
            name="statut"
            defaultValue={statut}
            className="border border-line bg-paper px-3 py-3 outline-none focus:border-ink"
          >
            <option value="">Tous les dossiers</option>
            <option value="paye">Payés</option>
            <option value="en_attente">En attente</option>
            <option value="en_retard">En retard</option>
          </select>
          <button className="mono border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper">
            CHERCHER
          </button>
          {q || statut ? (
            <Link href={`/${org.slug}/cockpit/adherents`} className="mono text-[12px] text-ink-soft hover:text-ink">
              Effacer
            </Link>
          ) : null}
        </form>

        {lignes.length === 0 ? (
          <p className="mt-12 text-lg text-ink-soft">
            {q || statut
              ? "Aucun adhérent ne correspond à cette recherche."
              : "Aucun adhérent pour l’instant. Ils apparaîtront ici dès la première inscription."}
          </p>
        ) : (
          <div className="mt-8 border border-line">
            {lignes.map((a) => {
              const ad = a.adhesions?.[0];
              return (
                <Link
                  key={a.id}
                  href={`/${org.slug}/cockpit/adherents/${a.id}`}
                  className="grid grid-cols-1 gap-1 border-b border-line px-5 py-4 last:border-b-0 hover:bg-bg-alt sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
                >
                  <span className="text-[15px] font-medium">
                    {a.prenom} {a.nom}
                  </span>
                  <span className="mono text-[12px] text-ink-soft">
                    {ad?.cours?.nom ?? "—"}
                    {a.email ? <span className="block truncate">{a.email}</span> : null}
                  </span>
                  <span className="mono text-[11px] uppercase tracking-wide">
                    {ad ? (
                      <>
                        <span
                          style={{
                            color:
                              ad.statut === "paye" ? "#1E7A4F" : ad.statut === "en_retard" ? "#B23B3B" : "#B8860B",
                          }}
                        >
                          {ad.statut === "paye" ? "Payé" : ad.statut === "en_retard" ? "En retard" : "En attente"}
                        </span>
                        {typeof ad.montant_centimes === "number" ? (
                          <span className="ml-2 text-ink-soft">{formatPrix(ad.montant_centimes)}</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-ink-faint">Sans adhésion</span>
                    )}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {pages > 1 ? (
          <div className="mono mt-8 flex items-center justify-between text-[12px]">
            {page > 1 ? (
              <Link href={lien(page - 1)} className="hover:text-ink">
                ← Précédents
              </Link>
            ) : (
              <span />
            )}
            <span className="text-ink-soft">
              Page {page} sur {pages}
            </span>
            {page < pages ? (
              <Link href={lien(page + 1)} className="hover:text-ink">
                Suivants →
              </Link>
            ) : (
              <span />
            )}
          </div>
        ) : null}

        <p className="mono mt-10 text-[11px] text-ink-soft">
          <a href={`/${org.slug}/cockpit/export`} className="underline underline-offset-2 hover:text-ink">
            Exporter la liste complète en CSV
          </a>
        </p>
      </div>
    </main>
  );
}
