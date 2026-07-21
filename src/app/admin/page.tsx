import Link from "next/link";
import { notFound } from "next/navigation";
import { getStatsAdmin, verifierSuperAdmin, type ClubAdmin, type StatsAdmin } from "@/lib/admin";
import { formatMontant } from "@/lib/format";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const LIBELLE_STATUT: Record<string, string> = {
  actif: "Abonné",
  essai: "Essai",
  impaye: "Impayé",
  resilie: "Résilié",
  aucun: "Sans abonnement",
};

function dateCourte(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

function depuis(iso: string | null): string {
  if (!iso) return "jamais";
  const j = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (j <= 0) return "aujourd’hui";
  if (j === 1) return "hier";
  if (j < 30) return `il y a ${j} j`;
  if (j < 365) return `il y a ${Math.floor(j / 30)} mois`;
  return `il y a ${Math.floor(j / 365)} an${j >= 730 ? "s" : ""}`;
}

/** Chiffre clé. Le nombre d'abord, l'explication ensuite — jamais l'inverse. */
function Chiffre({ n, label, aide }: { n: string; label: string; aide?: string }) {
  return (
    <div className="bg-paper px-6 py-7">
      <p className="mono text-[28px] leading-none text-ink">{n}</p>
      <p className="mono mt-3 text-[10px] uppercase tracking-label text-ink-soft">{label}</p>
      {aide ? <p className="mt-1.5 text-[13px] leading-snug text-ink-soft">{aide}</p> : null}
    </div>
  );
}

/** Une alerte ne s'affiche que si elle a de la matière : sinon elle devient du bruit. */
function Alerte({ titre, clubs, quoi }: { titre: string; clubs: ClubAdmin[]; quoi: string }) {
  if (clubs.length === 0) return null;
  return (
    <div className="border-b border-line px-6 py-5 md:px-10">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
        <p className="text-[15px] font-medium">
          <span className="mono mr-2 text-[12px] text-brand">{String(clubs.length).padStart(2, "0")}</span>
          {titre}
        </p>
        <p className="text-[13px] text-ink-soft">{quoi}</p>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {clubs.map((c) => (
          <Link
            key={c.id}
            href={`/admin/${c.id}`}
            className="mono border border-line px-3 py-1.5 text-[12px] text-ink hover:border-ink"
          >
            {c.nom}
          </Link>
        ))}
      </div>
    </div>
  );
}

/** Acquisition sur 12 semaines. Des barres CSS : aucune librairie pour six pixels. */
function Acquisition({ series }: { series: StatsAdmin["creationsParSemaine"] }) {
  const max = Math.max(1, ...series.map((s) => s.n));
  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      {series.map((s) => (
        <div key={s.debut} className="flex-1">
          <div
            className="w-full bg-brand"
            style={{ height: `${Math.max(2, (s.n / max) * 56)}px`, opacity: s.n === 0 ? 0.18 : 1 }}
            title={`Semaine du ${dateCourte(s.debut)} : ${s.n} club${s.n > 1 ? "s" : ""}`}
          />
        </div>
      ))}
    </div>
  );
}

type Tri = "recent" | "adherents" | "encaisse" | "activite" | "nom";

export default async function SuperAdmin(
  props: {
    searchParams?: Promise<{ q?: string; statut?: string; tri?: Tri }>;
  }
) {
  const searchParams = await props.searchParams;
  // Réservé au super-admin. Une page inexistante pour tous les autres : on ne
  // révèle même pas qu'elle existe.
  const profile = await verifierSuperAdmin();
  if (!profile) notFound();

  const s = await getStatsAdmin();

  const q = (searchParams?.q ?? "").trim().toLowerCase();
  const filtreStatut = searchParams?.statut ?? "";
  const tri: Tri = searchParams?.tri ?? "recent";

  let clubs = s.clubs;
  if (q) {
    clubs = clubs.filter(
      (c) =>
        c.nom.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        (c.president?.email ?? "").toLowerCase().includes(q)
    );
  }
  if (filtreStatut) clubs = clubs.filter((c) => c.statutAbo === filtreStatut);
  clubs = [...clubs].sort((a, b) => {
    if (tri === "adherents") return b.adherents - a.adherents;
    if (tri === "encaisse") return b.encaisseCentimes - a.encaisseCentimes;
    if (tri === "nom") return a.nom.localeCompare(b.nom, "fr");
    if (tri === "activite") return (b.derniereActivite ?? "").localeCompare(a.derniereActivite ?? "");
    return b.creeLe.localeCompare(a.creeLe);
  });

  const lien = (p: Record<string, string>) => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (filtreStatut) u.set("statut", filtreStatut);
    if (tri !== "recent") u.set("tri", tri);
    for (const [k, v] of Object.entries(p)) {
      if (v) u.set(k, v);
      else u.delete(k);
    }
    const str = u.toString();
    return str ? `/admin?${str}` : "/admin";
  };

  const aucuneAlerte =
    s.alertes.essaiBientotFini.length === 0 &&
    s.alertes.impayes.length === 0 &&
    s.alertes.jamaisPublies.length === 0 &&
    s.alertes.sansAdherent.length === 0 &&
    s.alertes.sansStripe.length === 0 &&
    s.alertes.dormants.length === 0;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
        <Link href="/" className="font-logo text-lg font-semibold">
          k<Cur />
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          CONSOLE PLATEFORME<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-6xl">
        <div className="border-b border-line px-6 py-10 md:px-10 md:py-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            BONJOUR, {(profile.prenom ?? "MATHIEU").toUpperCase()}
            <Cur />
          </p>
          <h1 className="mt-5 text-3xl font-medium leading-tight md:text-4xl">
            {s.total === 0
              ? "Aucune association pour l’instant."
              : `${s.total} association${s.total > 1 ? "s" : ""} sur Klubster.`}
          </h1>
          <p className="mt-3 max-w-prose text-[15px] text-ink-soft">
            {s.abonnesActifs > 0
              ? `${s.abonnesActifs} payante${s.abonnesActifs > 1 ? "s" : ""}, ${s.enEssai} en essai. ${formatMontant(s.mrrCentimes)} de revenu mensuel récurrent.`
              : `${s.enEssai} en essai, aucune abonnée payante pour l’instant. Le revenu démarre à la fin des premiers mois offerts.`}
          </p>
          {s.tronque ? (
            <p className="mono mt-4 text-[12px]" style={{ color: "#8A6A2F" }}>
              Volume au-delà du plafond de lecture : les totaux ci-dessous sont partiels.
              Il est temps de passer les agrégats côté base.
            </p>
          ) : null}
        </div>

        {/* LE BUSINESS — les chiffres qui décident */}
        <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
          <Chiffre n={formatMontant(s.mrrCentimes)} label="REVENU MENSUEL" aide={`${formatMontant(s.arrCentimes)} sur l’année`} />
          <Chiffre n={String(s.abonnesActifs)} label="CLUBS ABONNÉS" aide={`${s.enEssai} en essai · ${s.impayes} impayé${s.impayes > 1 ? "s" : ""}`} />
          <Chiffre n={String(s.adherentsTotal)} label="ADHÉRENTS GÉRÉS" aide={`${s.inscriptions30j} inscription${s.inscriptions30j > 1 ? "s" : ""} sur 30 jours`} />
          <Chiffre
            n={formatMontant(s.encaisseTotalCentimes)}
            label="ENCAISSÉ PAR LES CLUBS"
            aide="Cumul des cotisations passées par Klubster"
          />
        </div>

        {/* ACQUISITION */}
        <div className="border-b border-line px-6 py-8 md:px-10">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              CRÉATIONS DE CLUBS · 12 SEMAINES<Cur />
            </p>
            <p className="text-[13px] text-ink-soft">
              {s.nouveaux30j} nouveau{s.nouveaux30j > 1 ? "x" : ""} club{s.nouveaux30j > 1 ? "s" : ""} sur 30 jours ·{" "}
              {s.publies} publié{s.publies > 1 ? "s" : ""} sur {s.total}
            </p>
          </div>
          <div className="mt-6">
            <Acquisition series={s.creationsParSemaine} />
            <div className="mono mt-2 flex justify-between text-[10px] text-ink-faint">
              <span>{dateCourte(s.creationsParSemaine[0]?.debut ?? null)}</span>
              <span>aujourd’hui</span>
            </div>
          </div>
        </div>

        {/* CE QUI DEMANDE UNE ACTION — avant les statistiques, comme dans le cockpit */}
        <div className="border-b border-line px-6 pt-8 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            CE QUI DEMANDE UNE ACTION<Cur />
          </p>
        </div>
        {aucuneAlerte ? (
          <div className="border-b border-line px-6 py-6 md:px-10">
            <p className="text-[15px] text-ink-soft">Rien à signaler. Tous les clubs sont en ordre.</p>
          </div>
        ) : (
          <>
            <Alerte
              titre="Essai qui se termine dans moins de 7 jours"
              clubs={s.alertes.essaiBientotFini}
              quoi="À appeler avant la bascule, pas après."
            />
            <Alerte titre="Abonnement impayé" clubs={s.alertes.impayes} quoi="Paiement rejeté : relancer." />
            <Alerte
              titre="Club publié sans aucun adhérent"
              clubs={s.alertes.sansAdherent}
              quoi="L’activation a calé quelque part."
            />
            <Alerte
              titre="Créé mais jamais publié"
              clubs={s.alertes.jamaisPublies}
              quoi="Le wizard a été abandonné avant la fin."
            />
            <Alerte
              titre="Sans compte Stripe connecté"
              clubs={s.alertes.sansStripe}
              quoi="Ne peut pas encaisser en ligne."
            />
            <Alerte
              titre="Aucune activité depuis 30 jours"
              clubs={s.alertes.dormants}
              quoi="Le club a des adhérents mais plus rien ne bouge."
            />
          </>
        )}

        {/* LES ASSOCIATIONS */}
        <div className="px-6 pt-10 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            LES ASSOCIATIONS<Cur />
          </p>

          <form method="get" action="/admin" className="mt-5 flex flex-wrap gap-3">
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Chercher un club, un slug, un email…"
              aria-label="Chercher une association"
              className="min-w-[240px] flex-1 border border-line bg-paper px-4 py-3 text-[14px] outline-none focus:border-ink"
            />
            <select
              name="statut"
              defaultValue={filtreStatut}
              aria-label="Filtrer par statut d’abonnement"
              className="border border-line bg-paper px-4 py-3 text-[14px] outline-none focus:border-ink"
            >
              <option value="">Tous les statuts</option>
              <option value="actif">Abonnés</option>
              <option value="essai">En essai</option>
              <option value="impaye">Impayés</option>
              <option value="resilie">Résiliés</option>
              <option value="aucun">Sans abonnement</option>
            </select>
            <select
              name="tri"
              defaultValue={tri}
              aria-label="Trier"
              className="border border-line bg-paper px-4 py-3 text-[14px] outline-none focus:border-ink"
            >
              <option value="recent">Les plus récents</option>
              <option value="adherents">Le plus d’adhérents</option>
              <option value="encaisse">Le plus encaissé</option>
              <option value="activite">Actifs récemment</option>
              <option value="nom">Ordre alphabétique</option>
            </select>
            <button type="submit" className="mono border border-line px-5 py-3 text-[12px] text-ink hover:border-ink">
              FILTRER
            </button>
            {q || filtreStatut || tri !== "recent" ? (
              <Link href="/admin" className="mono self-center text-[12px] text-ink-soft underline underline-offset-2 hover:text-ink">
                Tout afficher
              </Link>
            ) : null}
          </form>

          <p className="mono mt-4 text-[11px] text-ink-faint">
            {clubs.length} club{clubs.length > 1 ? "s" : ""} affiché{clubs.length > 1 ? "s" : ""} sur {s.total}
          </p>
        </div>

        {clubs.length === 0 ? (
          <div className="px-6 py-12 md:px-10">
            <p className="text-[15px] text-ink-soft">Aucune association ne correspond à cette recherche.</p>
          </div>
        ) : (
          <div className="mt-5 border-t border-line">
            {clubs.map((c) => (
              <Link
                key={c.id}
                href={`/admin/${c.id}`}
                className="block border-b border-line px-6 py-5 hover:bg-ink/[0.02] md:px-10"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[16px] font-medium">
                      {c.nom}
                      {!c.publie ? (
                        <span className="mono ml-3 text-[10px] uppercase tracking-label text-ink-faint">BROUILLON</span>
                      ) : null}
                    </p>
                    <p className="mono mt-1 truncate text-[11px] text-ink-soft">
                      klubster.fr/{c.slug}
                      {c.domaineCustom ? ` · ${c.domaineCustom}` : ""}
                      {c.president?.email ? ` · ${c.president.email}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-x-8 gap-y-2">
                    <div className="min-w-[80px]">
                      <p className="mono text-[15px]">{c.adherents}</p>
                      <p className="mono text-[10px] uppercase tracking-label text-ink-faint">ADHÉRENTS</p>
                    </div>
                    <div className="min-w-[96px]">
                      <p className="mono text-[15px]">{formatMontant(c.encaisseCentimes)}</p>
                      <p className="mono text-[10px] uppercase tracking-label text-ink-faint">ENCAISSÉ</p>
                    </div>
                    <div className="min-w-[110px]">
                      <p className="mono text-[15px]" style={{ color: c.statutAbo === "impaye" ? "#B23B3B" : undefined }}>
                        {LIBELLE_STATUT[c.statutAbo] ?? c.statutAbo}
                      </p>
                      <p className="mono text-[10px] uppercase tracking-label text-ink-faint">
                        {c.statutAbo === "actif" ? `${formatMontant(c.prixMensuelCentimes)}/MOIS` : "ABONNEMENT"}
                      </p>
                    </div>
                    <div className="min-w-[92px]">
                      <p className="mono text-[15px]">{depuis(c.derniereActivite)}</p>
                      <p className="mono text-[10px] uppercase tracking-label text-ink-faint">ACTIVITÉ</p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        <div className="px-6 py-12 md:px-10">
          <p className="mono text-[11px] text-ink-faint">
            Console réservée à l’éditeur. Les données affichées proviennent des clubs eux-mêmes<Cur />
          </p>
        </div>
      </div>
    </main>
  );
}
