import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCockpitStats } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { deconnexion } from "@/app/connexion/actions";
import { connecterStripe } from "./stripe-actions";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const NAV = ["AUJOURD'HUI", "ÉQUIPAGE", "TOUR DE CONTRÔLE", "TRÉSORERIE", "MESSAGERIE", "DOSSIERS", "JOURNAL", "ATELIER"];

export default async function Cockpit({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { stripe?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  const profile = await getProfile();
  const autorise = profile && (profile.organisation_id === org.id || profile.role === "super_admin");
  if (!autorise) redirect(`/connexion?next=/${org.slug}/cockpit`);

  const s = await getCockpitStats(org.slug);
  const aMettreAJour = s.enAttente + s.enRetard;
  const prenom = profile?.prenom?.trim();
  const stripeConnecte = !!org.stripe_account_id;
  const connecterAvecSlug = connecterStripe.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <div className="flex items-center gap-5">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">{org.nom} · MISSION 2026</span>
          <form action={deconnexion}>
            <button className="mono text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">DÉCONNEXION</button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        <nav className="border-b border-line px-6 py-6 md:border-b-0 md:border-r md:px-7">
          {NAV.map((label, i) => {
            const actif = i === 0;
            return (
              <div key={label} className={`mono py-[10px] text-[12px] tracking-wide ${actif ? "font-bold text-ink" : "text-ink-soft"}`}>
                {String(i + 1).padStart(2, "0")} {label}
                {actif ? <Cur /> : <span className="text-ink-faint">_</span>}
              </div>
            );
          })}
          <div className="mono mt-6 border-t border-line pt-5">
            <div className="text-[10px] uppercase tracking-label text-ink-soft">TRÉSORERIE</div>
            <div className="mt-2 text-[12px] text-brand">✓ reversée direct</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">0 % commission</div>
          </div>
        </nav>

        <div>
          <div className="border-b border-line px-6 py-8 md:px-10 md:py-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              AUJOURD&apos;HUI<Cur /> <span className="text-ink-faint">· Mission du jour</span>
            </p>
            <h1 className="mt-4 text-[26px] font-medium tracking-[-0.01em] md:text-[30px]">
              Bonsoir{prenom ? `, ${prenom}` : ""}.
            </h1>
            <p className="mt-3 max-w-prose text-lg text-ink-soft">
              Tout est prêt pour le prochain entraînement.{" "}
              {aMettreAJour > 0 ? (
                <span className="text-ink">Il reste {aMettreAJour} dossier{aMettreAJour > 1 ? "s" : ""} à mettre à jour.</span>
              ) : (
                <span className="text-ink">Tous les dossiers sont à jour.</span>
              )}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-px border-b border-line bg-line md:grid-cols-4">
            <Kpi n={s.equipage.toLocaleString("fr-FR")} label="EN ÉQUIPAGE" />
            <Kpi n={String(s.enAttente)} label="DOSSIERS EN ATTENTE" />
            <Kpi n={String(s.enRetard)} label="COTISATIONS EN RETARD" />
            <Kpi n={formatPrix(s.tresorerieCentimes)} label="TRÉSORERIE · SAISON" />
          </div>

          {/* PAIEMENTS / STRIPE */}
          <div className="border-b border-line px-6 py-7 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENTS<Cur /></p>
            {stripeConnecte ? (
              <p className="mt-4 text-[15px]">
                <span className="mono text-brand">✓</span> Stripe connecté. Les cotisations sont encaissées
                directement sur le compte du club — Klubster ne prend aucune commission.
              </p>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-prose text-[15px] text-ink-soft">
                  Connectez Stripe pour encaisser les cotisations en ligne — l&apos;argent arrive
                  directement sur votre compte, <span className="text-ink">0 % de commission</span>.
                </p>
                <form action={connecterAvecSlug}>
                  <button className="mono whitespace-nowrap bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                    CONNECTER STRIPE →
                  </button>
                </form>
              </div>
            )}
            {searchParams?.stripe === "nonconfig" ? (
              <p className="mono mt-3 text-[11px] text-ink-faint">
                Stripe n&apos;est pas encore configuré côté plateforme (clé API manquante).
              </p>
            ) : null}
          </div>

          {/* CONFIGURATION */}
          <div className="border-b border-line px-6 py-7 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ATELIER<Cur /></p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href={`/${org.slug}/cockpit/formulaire`} className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">FORMULAIRE D&apos;INSCRIPTION →</Link>
            </div>
          </div>

          <div className="px-6 pt-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              TOUR DE CONTRÔLE<Cur /> <span className="text-ink-faint">03</span>
            </p>
          </div>
          <div className="px-6 pb-10 pt-3 md:px-10">
            <Ligne idx="01" action>Cotisations en retard — <span className="mono">{s.enRetard}</span> adhérents</Ligne>
            <Ligne idx="02" action>Dossiers en attente — <span className="mono">{s.enAttente}</span> adhérents</Ligne>
            <Ligne idx="03" ok>Paiements à jour — <span className="mono">{s.paye}</span> adhérents</Ligne>
          </div>
        </div>
      </div>

      <div className="mono flex justify-between border-t border-line px-6 py-4 text-[11px] md:px-8">
        <span className="text-ink-soft">JOURNAL DE BORD</span>
        <span className="text-ink-faint">klubster.fr/{org.slug}/cockpit</span>
      </div>
    </main>
  );
}

function Kpi({ n, label }: { n: string; label: string }) {
  return (
    <div className="bg-paper px-5 py-6 md:px-7">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-2 text-[30px] font-bold tracking-[-0.02em]">{n}</div>
    </div>
  );
}

function Ligne({ idx, children, action, ok }: { idx: string; children: React.ReactNode; action?: boolean; ok?: boolean }) {
  return (
    <div className="flex items-center gap-5 border-b border-line py-4 last:border-b-0">
      <span className="mono text-[11px] text-ink-faint">{idx}</span>
      <span className="flex-1 text-[15px]">{children}</span>
      {action ? <button className="mono border border-ink px-3 py-1.5 text-[11px] hover:bg-ink hover:text-paper">RELANCER →</button> : null}
      {ok ? <span className="mono text-[12px] text-brand">✓ À JOUR</span> : null}
    </div>
  );
}
