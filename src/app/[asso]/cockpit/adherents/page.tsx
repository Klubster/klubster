import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getAdherentsRecents } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";
import { peut } from "@/lib/roles";
import { renouvelerSaison } from "./actions";
import { STATUT_PIECE_MANQUANTE } from "@/lib/pieces";

export const dynamic = "force-dynamic";

// Identifiant qui n'existera jamais : sert à rendre un filtre volontairement vide.
const ID_IMPOSSIBLE = "00000000-0000-0000-0000-000000000000";

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

export default async function Adherents(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ q?: string; page?: string; statut?: string; renouvelees?: string; dossier?: string; recentes?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents`);
  }

  const q = (searchParams.q ?? "").trim();
  const statut = searchParams.statut ?? "";
  // Filtres venus du cockpit : « 3 dossiers incomplets » et « 4 nouvelles inscriptions »
  // doivent ouvrir EXACTEMENT ces trois et ces quatre lignes, pas la liste entière.
  const dossierIncomplet = searchParams.dossier === "incomplet";
  const joursRecents = Math.min(90, Math.max(0, Number(searchParams.recentes ?? 0) || 0));
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const debut = (page - 1) * PAR_PAGE;

  const supabase = await createSupabaseServerClient();

  // Le filtre par statut doit vivre dans la requête, pas en mémoire : appliqué après la
  // pagination, il ne filtrait que les 25 lignes déjà chargées — « aucun résultat » page 1,
  // trois résultats page 2, et un total faux. `!inner` force la jointure à filtrer.
  const jointure = statut ? "adhesions!inner(statut, montant_centimes, cours(nom))" : "adhesions(statut, montant_centimes, cours(nom))";

  // Inscriptions récentes : les adhérents dont une ADHÉSION a été créée dans la fenêtre.
  const idsRecents = joursRecents > 0 ? await getAdherentsRecents(org.id, joursRecents) : [];

  // Dossier incomplet = au moins une pièce manquante. La liste des identifiants est
  // calculée avant la requête paginée : filtrer après la pagination donnait un total faux.
  let idsIncomplets: string[] = [];
  if (dossierIncomplet) {
    const { data: pcs } = await supabase
      .from("pieces_adherent")
      .select("adherent_id")
      .eq("organisation_id", org.id)
      .eq("statut", STATUT_PIECE_MANQUANTE);
    idsIncomplets = [...new Set(((pcs ?? []) as { adherent_id: string }[]).map((x) => x.adherent_id))];
  }

  let requete = supabase
    .from("adherents")
    .select(`id, prenom, nom, email, telephone, created_at, ${jointure}`, { count: "exact" })
    .eq("organisation_id", org.id);

  if (statut) requete = requete.eq("adhesions.statut", statut);
  if (joursRecents > 0) {
    // Sur la date de l'ADHÉSION, pas celle de la fiche : le cockpit compte les inscriptions
    // reçues cette semaine, or un adhérent importé l'an dernier peut se réinscrire hier.
    // Filtrer sur `adherents.created_at` affichait 14 lignes pour « 8 inscriptions ».
    requete = requete.in("id", idsRecents.length > 0 ? idsRecents : [ID_IMPOSSIBLE]);
  }
  if (dossierIncomplet) {
    // Aucun dossier incomplet ne doit afficher une liste VIDE, pas la liste entière :
    // un filtre qui ne filtre rien fait croire au président que tout le club est en défaut.
    requete = requete.in("id", idsIncomplets.length > 0 ? idsIncomplets : [ID_IMPOSSIBLE]);
  }
  // Le badge affiché est adhesions[0] : sans ordre, PostgREST rend les adhésions dans
  // un ordre quelconque et le badge pouvait venir d'une saison ancienne.
  requete = requete.order("created_at", { referencedTable: "adhesions", ascending: false });

  if (q) {
    // Les caractères de filtre PostgREST (virgule, parenthèses) sont retirés :
    // interpolés tels quels, ils permettraient de réécrire la condition.
    const propre = q.toLowerCase().replace(/[^a-zà-ÿ0-9@.\- ]/gi, "");
    if (propre) {
      requete = requete.or(`nom.ilike.%${propre}%,prenom.ilike.%${propre}%,email.ilike.%${propre}%`);
    }
  }

  const { data, count } = await requete.order("nom", { ascending: true }).range(debut, debut + PAR_PAGE - 1);

  const lignes = (data ?? []) as unknown as LigneAdherent[];

  const total = count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAR_PAGE));
  const lien = (p: number) => {
    const s = new URLSearchParams();
    if (q) s.set("q", q);
    if (statut) s.set("statut", statut);
    if (dossierIncomplet) s.set("dossier", "incomplet");
    if (joursRecents > 0) s.set("recentes", String(joursRecents));
    if (p > 1) s.set("page", String(p));
    const qs = s.toString();
    return `/${org.slug}/cockpit/adherents${qs ? `?${qs}` : ""}`;
  };

  const filtreActif = dossierIncomplet
    ? "Dossiers incomplets"
    : joursRecents > 0
      ? `Inscriptions des ${joursRecents} derniers jours`
      : statut === "en_retard"
        ? "Cotisations en retard"
        : statut === "en_attente"
          ? "Règlements en attente"
          : statut === "paye"
            ? "Cotisations réglées"
            : "";

  const renouveler = renouvelerSaison.bind(null, org.slug);

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
          <div>
            <h1 className="text-3xl font-medium tracking-[-0.01em]">
              {total} adhérent{total > 1 ? "s" : ""}
            </h1>
            {/* Le filtre venu du cockpit se dit à l'écran, et se retire d'un clic : sans
                cela, « 3 adhérents » sur un club qui en compte 30 ressemble à une panne. */}
            {filtreActif ? (
              <p className="mono mt-2 flex flex-wrap items-center gap-3 text-[11px] uppercase tracking-label text-ink-soft">
                <span className="text-warning">▸ {filtreActif}</span>
                <Link href={`/${org.slug}/cockpit/adherents`} className="underline underline-offset-2 hover:text-ink">
                  TOUT VOIR
                </Link>
              </p>
            ) : null}
          </div>
          {/* Empilés pleine largeur sur mobile : deux boutons longs côte à côte
              wrappaient de travers sous le titre. */}
          {/* Import et ajout : président et secrétaire seulement. Montrer ces boutons à un
              rôle qui n'a pas l'écriture, c'est l'envoyer vers un refus — un lien mort.
              Vu en test le 02/08 avec le rôle Lecture seule. */}
          {peut(profile.role, "adherents_ecriture") ? (
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
              <Link
                href={`/${org.slug}/cockpit/adherents/import`}
                className="mono border border-ink px-5 py-3 text-center text-[12px] hover:bg-ink hover:text-paper"
              >
                IMPORTER UN FICHIER
              </Link>
              <Link
                href={`/${org.slug}/cockpit/adherents/nouveau`}
                className="mono bg-ink px-5 py-3 text-center text-[12px] text-paper hover:bg-ink/90"
              >
                AJOUTER UN ADHÉRENT →
              </Link>
            </div>
          ) : null}
        </div>

        {searchParams?.renouvelees !== undefined ? (
          <p className="mono mt-4 text-[12px] text-success">
            {searchParams.renouvelees === "0"
              ? "Tout le monde a déjà une adhésion pour la saison en cours."
              : `${searchParams.renouvelees} adhésion(s) créée(s) pour la nouvelle saison, en attente de règlement.`}
          </p>
        ) : null}

        {/* Renouvellement de saison — président et secrétaire. */}
        {peut(profile.role, "adherents_ecriture") ? (
          <form action={renouveler} className="mt-6 flex flex-wrap items-center gap-3 border border-line bg-bg-alt px-5 py-4">
            <div className="flex-1">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">NOUVELLE SAISON<span className="cur">_</span></p>
              <p className="mt-1 text-[13px] text-ink-soft">
                Recrée une adhésion « en attente » pour chaque adhérent qui n’en a pas encore cette saison, avec son dernier cours.
              </p>
            </div>
            <button className="mono w-full border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper sm:w-auto">
              RENOUVELER LA SAISON →
            </button>
          </form>
        ) : null}

        <form className="mt-8 flex flex-wrap items-center gap-3">
          <input
            name="q"
            type="search"
            aria-label="Rechercher un adhérent par nom, prénom ou email"
            defaultValue={q}
            placeholder="Rechercher un nom, un prénom, un email…"
            className="min-w-[260px] flex-1 border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          <select
            name="statut"
            aria-label="Filtrer par statut de paiement"
            defaultValue={statut}
            className="border border-line bg-paper px-3 py-3 outline-none focus:border-ink"
          >
            <option value="">Tous les dossiers</option>
            <option value="paye">Payés</option>
            <option value="en_attente">En attente</option>
            <option value="en_retard">En retard</option>
            <option value="liste_attente">Liste d’attente</option>
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
                          className={
                            ad.statut === "paye" ? "text-success"
                            : ad.statut === "en_retard" ? "text-danger"
                            : ad.statut === "liste_attente" ? "text-ink-soft"
                            : "text-warning"
                          }
                        >
                          {ad.statut === "paye" ? "Payé"
                            : ad.statut === "en_retard" ? "En retard"
                            : ad.statut === "liste_attente" ? "Liste d’attente"
                            : ad.statut === "rembourse" ? "Remboursé"
                            : ad.statut === "annule" ? "Annulée"
                            : "En attente"}
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

        {/* L'export CSV est refusé par la route aux rôles sans écriture : ne pas tendre
            un lien qui finit en erreur. Même règle que les boutons d'ajout ci-dessus. */}
        {peut(profile.role, "adherents_ecriture") ? (
          <p className="mono mt-10 text-[11px] text-ink-soft">
            <a href={`/${org.slug}/cockpit/export`} className="underline underline-offset-2 hover:text-ink">
              Exporter la liste complète en CSV
            </a>
          </p>
        ) : null}
      </div>
    </main>
  );
}
