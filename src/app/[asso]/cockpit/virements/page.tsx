import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { getSoldeClub, getVirementsClub, getCompteBancaireClub, stripeConfigured } from "@/lib/stripe";
import { compteConnecte } from "@/lib/stripe-org";
import { ouvrirCompteStripe } from "./actions";
import BoutonAttente from "@/components/BoutonAttente";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const euros = (centimes: number) =>
  (centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

const jour = (secondes: number) =>
  new Date(secondes * 1000).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Somme les soldes EUR d'un tableau Stripe (un compte peut porter plusieurs devises). */
function totalEuros(entrees: Array<{ amount: number; currency: string }> | undefined): number {
  if (!Array.isArray(entrees)) return 0;
  return entrees.filter((e) => e.currency === "eur").reduce((t, e) => t + e.amount, 0);
}

const ETATS: Record<string, string> = {
  paid: "Versé",
  pending: "En route",
  in_transit: "En route",
  canceled: "Annulé",
  failed: "Échoué",
};

/**
 * « Mes virements » : où en est l'argent du club.
 * Le trésorier ne veut pas piloter Stripe — il veut savoir ce qui est arrivé
 * sur le compte de l'association, et ce qui arrive bientôt.
 */
export default async function VirementsPage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/virements`);
  }

  const account = compteConnecte(org);

  // Une panne Stripe ne doit pas rendre la page inaccessible : on dégrade proprement.
  let disponible = 0;
  let enAttente = 0;
  let virements: Array<{ id: string; amount: number; currency: string; arrival_date: number; status: string }> = [];
  let banque: { bank_name?: string; last4?: string } | null = null;
  let panne = false;

  if (account && stripeConfigured()) {
    try {
      const [solde, liste, comptes] = await Promise.all([
        getSoldeClub(account),
        getVirementsClub(account),
        getCompteBancaireClub(account),
      ]);
      disponible = totalEuros(solde?.available);
      enAttente = totalEuros(solde?.pending);
      virements = (liste?.data ?? []).filter((v: { currency: string }) => v.currency === "eur");
      banque = comptes?.data?.[0] ?? null;
    } catch (e) {
      console.error("virements", e);
      panne = true;
    }
  }

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← AUJOURD&apos;HUI
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          VIREMENTS<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          VIREMENTS — {org.nom}<Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Où est l&apos;argent du club.</h1>

        {!account ? (
          <>
            <p className="mt-3 max-w-prose text-ink-soft">
              Stripe n&apos;est pas encore connecté : les cotisations en ligne ne peuvent pas être encaissées.
            </p>
            <Link
              href={`/${org.slug}/cockpit#paiements`}
              className="mono mt-6 inline-block bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90"
            >
              CONNECTER STRIPE →
            </Link>
          </>
        ) : (
          <>
            <p className="mt-3 max-w-prose text-ink-soft">
              Les cotisations arrivent sur le compte bancaire de l&apos;association{" "}
              <span className="text-ink">automatiquement</span>, sans rien déclencher.
            </p>

            {searchParams?.erreur === "lien" ? (
              <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
                Impossible d&apos;ouvrir votre compte Stripe pour l&apos;instant. Réessayez dans un instant.
              </p>
            ) : null}
            {panne ? (
              <p className="mono mt-6 text-[12px]" style={{ color: "#8A6508" }}>
                Les montants n&apos;ont pas pu être récupérés auprès de Stripe. Vos fonds ne sont pas affectés —
                réessayez dans quelques minutes.
              </p>
            ) : null}

            {/* LES DEUX CHIFFRES QUI COMPTENT */}
            <section className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              <div className="bg-paper p-6">
                <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                  EN ROUTE VERS VOTRE BANQUE<Cur />
                </p>
                <p className="mt-3 text-3xl font-medium">{euros(disponible)}</p>
                <p className="mt-2 text-[13px] text-ink-soft">
                  Part au prochain versement, sans action de votre part.
                </p>
              </div>
              <div className="bg-paper p-6">
                <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                  ENCORE EN COURS<Cur />
                </p>
                <p className="mt-3 text-3xl font-medium">{euros(enAttente)}</p>
                <p className="mt-2 text-[13px] text-ink-soft">
                  Paiements reçus, en cours de compensation bancaire.
                </p>
              </div>
            </section>

            {/* LE DÉLAI, DIT UNE FOIS, CLAIREMENT */}
            <p className="mono mt-6 border border-line bg-bg-alt px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
              COMBIEN DE TEMPS<Cur />
              <span className="mt-2 block">
                Comptez <span className="text-ink">3 jours ouvrés</span> entre le paiement d&apos;un adhérent et
                l&apos;arrivée sur votre compte. Les tout premiers encaissements du club mettent{" "}
                <span className="text-ink">7 jours</span> : Stripe étend ce délai le temps d&apos;ouvrir le compte.
              </span>
            </p>

            {/* HISTORIQUE */}
            <section className="mt-10">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                DERNIERS VERSEMENTS<Cur />
              </p>
              {virements.length === 0 ? (
                <p className="mt-4 text-[15px] text-ink-soft">
                  Aucun versement pour le moment. Le premier partira dès qu&apos;une cotisation aura été payée en ligne.
                </p>
              ) : (
                <ul className="mt-4 border border-line bg-paper">
                  {virements.map((v) => (
                    <li
                      key={v.id}
                      className="flex items-baseline justify-between gap-4 border-b border-line px-5 py-4 last:border-b-0"
                    >
                      <span>
                        <span className="block text-[15px]">{euros(v.amount)}</span>
                        <span className="mono block text-[11px] text-ink-soft">
                          {v.status === "paid" ? "Arrivé le" : "Arrivée prévue le"} {jour(v.arrival_date)}
                        </span>
                      </span>
                      <span className="mono whitespace-nowrap text-[11px] text-ink-soft">
                        {ETATS[v.status] ?? v.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* COORDONNÉES BANCAIRES */}
            <section className="mt-10 border border-line bg-paper p-6">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                COMPTE BANCAIRE<Cur />
              </p>
              <p className="mt-4 text-[15px]">
                {banque?.last4 ? (
                  <>
                    {banque.bank_name ? `${banque.bank_name} — ` : ""}compte se terminant par{" "}
                    <span className="mono">{banque.last4}</span>
                  </>
                ) : (
                  "Aucun compte bancaire enregistré pour l’instant."
                )}
              </p>
              <p className="mt-3 max-w-prose text-[13px] text-ink-soft">
                Pour changer de RIB, Stripe vous demande de le saisir chez lui : vos coordonnées bancaires ne
                passent jamais par Klubster.
              </p>
              <form action={ouvrirCompteStripe.bind(null, org.slug)} className="mt-5">
                {/* w-full mobile : ce libellé long débordait des petits écrans. */}
                <BoutonAttente
                  attente="OUVERTURE DE STRIPE…"
                  className="mono w-full border border-ink px-5 py-2.5 text-[12px] hover:bg-ink hover:text-paper sm:w-auto"
                >
                  MODIFIER MES COORDONNÉES BANCAIRES →
                </BoutonAttente>
              </form>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
