import Link from "next/link";
import { notFound } from "next/navigation";
import { getStatsAdmin, verifierSuperAdmin } from "@/lib/admin";
import { formatMontant } from "@/lib/format";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const LIBELLE_STATUT: Record<string, string> = {
  actif: "Abonné",
  essai: "Essai en cours",
  impaye: "Impayé",
  resilie: "Résilié",
  aucun: "Sans abonnement",
};

function dateLongue(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}

function Ligne({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-line py-4 sm:flex-row sm:items-baseline sm:justify-between">
      <p className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</p>
      <p className="text-[15px] sm:text-right">{children}</p>
    </div>
  );
}

export default async function FicheClubAdmin({ params }: { params: { id: string } }) {
  const profile = await verifierSuperAdmin();
  if (!profile) notFound();

  // La fiche réutilise l'agrégat de la console : une seule logique de calcul, donc
  // aucun risque que la liste et le détail racontent deux histoires différentes.
  const s = await getStatsAdmin();
  const c = s.clubs.find((x) => x.id === params.id);
  if (!c) notFound();

  const partAdherents = s.adherentsTotal > 0 ? Math.round((c.adherents / s.adherentsTotal) * 100) : 0;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-10">
        <Link href="/admin" className="mono text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">
          ← CONSOLE
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          FICHE CLUB<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-10 md:py-16">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          {LIBELLE_STATUT[c.statutAbo] ?? c.statutAbo}
          {!c.publie ? " · BROUILLON" : ""}
          <Cur />
        </p>
        <h1 className="mt-5 text-3xl font-medium leading-tight md:text-4xl">{c.nom}</h1>
        <p className="mono mt-3 text-[12px] text-ink-soft">klubster.fr/{c.slug}</p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/${c.slug}`}
            className="mono border border-line px-5 py-3 text-[12px] text-ink hover:border-ink"
          >
            VOIR LE SITE →
          </Link>
          <Link
            href={`/${c.slug}/cockpit`}
            className="mono border border-line px-5 py-3 text-[12px] text-ink hover:border-ink"
          >
            OUVRIR LE COCKPIT →
          </Link>
          {c.president?.email ? (
            <a
              href={`mailto:${c.president.email}`}
              className="mono border border-line px-5 py-3 text-[12px] text-ink hover:border-ink"
            >
              ÉCRIRE AU PRÉSIDENT →
            </a>
          ) : null}
        </div>

        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            L’ESSENTIEL<Cur />
          </p>
          <div className="mt-4">
            <Ligne label="ADHÉRENTS">
              {c.adherents}
              {partAdherents > 0 ? (
                <span className="mono ml-2 text-[12px] text-ink-soft">{partAdherents} % du parc</span>
              ) : null}
            </Ligne>
            <Ligne label="COURS PROPOSÉS">{c.cours}</Ligne>
            <Ligne label="ENCAISSÉ PAR LE CLUB">{formatMontant(c.encaisseCentimes)}</Ligne>
            <Ligne label="RESTE DÛ PAR SES ADHÉRENTS">
              {c.resteDuCentimes > 0 ? (
                <span style={{ color: "#8A6A2F" }}>{formatMontant(c.resteDuCentimes)}</span>
              ) : (
                "Rien"
              )}
            </Ligne>
            <Ligne label="DERNIÈRE ACTIVITÉ">{dateLongue(c.derniereActivite)}</Ligne>
          </div>
        </div>

        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ABONNEMENT KLUBSTER<Cur />
          </p>
          <div className="mt-4">
            <Ligne label="STATUT">
              <span style={{ color: c.statutAbo === "impaye" ? "#B23B3B" : undefined }}>
                {LIBELLE_STATUT[c.statutAbo] ?? c.statutAbo}
              </span>
            </Ligne>
            <Ligne label={c.statutAbo === "actif" ? "FACTURÉ" : "TARIF À L’EFFECTIF"}>
              {formatMontant(c.prixMensuelCentimes)} / mois
            </Ligne>
            <Ligne label="CONTRIBUTION AU REVENU">
              {c.mrrCentimes > 0 ? `${formatMontant(c.mrrCentimes)} / mois` : "Aucune pour l’instant"}
            </Ligne>
            {c.essaiFin ? <Ligne label="FIN DE L’ESSAI">{dateLongue(c.essaiFin)}</Ligne> : null}
            <Ligne label="ENCAISSEMENT EN LIGNE">
              {c.stripeConnecte ? "Stripe connecté" : "Stripe non connecté"}
            </Ligne>
          </div>
        </div>

        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            LE CLUB<Cur />
          </p>
          <div className="mt-4">
            <Ligne label="PRÉSIDENT">
              {c.president
                ? `${c.president.prenom ?? ""} ${c.president.nom ?? ""}`.trim() || "—"
                : "Aucun compte président"}
            </Ligne>
            <Ligne label="EMAIL">{c.president?.email ?? "—"}</Ligne>
            <Ligne label="DISCIPLINE">{c.sport ?? "—"}</Ligne>
            <Ligne label="DOMAINE PROPRE">{c.domaineCustom ?? "Aucun"}</Ligne>
            <Ligne label="CRÉÉ LE">{dateLongue(c.creeLe)}</Ligne>
            <Ligne label="SITE PUBLIÉ">{c.publie ? "Oui" : "Non — resté en brouillon"}</Ligne>
          </div>
        </div>

        <p className="mono mt-12 text-[11px] leading-relaxed text-ink-faint">
          Ouvrir le cockpit d’un club donne accès à ses données d’adhérents, y compris les
          pièces de dossier. À n’utiliser que pour du support demandé par le club<Cur />
        </p>
      </div>
    </main>
  );
}
