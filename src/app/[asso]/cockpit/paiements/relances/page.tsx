import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { peut } from "@/lib/roles";
import { relancerImpaye, relancerTousImpayes } from "../actions";

export const dynamic = "force-dynamic";

function Cur() { return <span className="cur">_</span>; }

const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });

type Ligne = {
  id: string;
  montant_centimes: number | null;
  statut: string | null;
  derniere_relance: string | null;
  adherent: { id: string; prenom: string; nom: string; email: string | null } | null;
  cours: { nom: string } | null;
  reglements: Array<{ montant_centimes: number }> | null;
};

function depuis(dateIso: string): string {
  const jours = Math.floor((Date.now() - new Date(dateIso).getTime()) / 86_400_000);
  if (jours <= 0) return "aujourd’hui";
  if (jours === 1) return "hier";
  if (jours < 30) return `il y a ${jours} j`;
  return `le ${new Date(dateIso).toLocaleDateString("fr-FR")}`;
}

export default async function RelancesPage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { relance?: string; relances?: string; erreur?: string; partiel?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/paiements/relances`);
  }
  if (!peut(profile.role, "paiements")) redirect(`/${org.slug}/cockpit?acces=refuse`);

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, statut, derniere_relance, adherent:adherents(id, prenom, nom, email), cours:cours(nom), reglements(montant_centimes)")
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"])
    .order("created_at", { ascending: true });

  const reste = (l: Ligne) => (l.montant_centimes ?? 0) - (l.reglements ?? []).reduce((s, r) => s + r.montant_centimes, 0);
  const impayes = ((data ?? []) as unknown as Ligne[])
    .map((l) => ({ ...l, reste: reste(l) }))
    .filter((l) => l.reste > 0)
    .sort((a, b) => (a.adherent?.nom ?? "").localeCompare(b.adherent?.nom ?? ""));

  const avecEmail = impayes.filter((l) => l.adherent?.email);
  const sansEmail = impayes.filter((l) => !l.adherent?.email);
  const totalReste = impayes.reduce((s, l) => s + l.reste, 0);

  const relancerTous = relancerTousImpayes.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit/paiements`} className="mono text-[12px] text-ink-soft hover:text-ink">← TRÉSORERIE</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">RELANCES<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">COTISATIONS NON SOLDÉES — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Relancer les impayés.</h1>

        {searchParams.relance ? (
          <p className="mono mt-6 text-[13px]" style={{ color: "#1E7A4F" }}>✓ Relance envoyée.</p>
        ) : null}
        {searchParams.relances !== undefined ? (
          <p className="mono mt-6 text-[13px]" style={{ color: searchParams.relances === "0" ? "#8A6508" : "#1E7A4F" }}>
            {searchParams.relances === "0"
              ? "Personne à relancer par email (aucun impayé avec adresse email)."
              : `✓ ${searchParams.relances} relance(s) envoyée(s).`}
            {searchParams.partiel ? " Une partie n’a pas pu partir (limite d’envoi ?)." : ""}
          </p>
        ) : null}
        {searchParams.erreur ? (
          <p className="mono mt-6 text-[13px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "email"
              ? "Cette personne n’a pas d’email, ou n’a plus rien à régler."
              : "L’envoi a échoué. Réessayez."}
          </p>
        ) : null}

        {impayes.length === 0 ? (
          <p className="mt-10 text-lg text-ink-soft">Tout le monde est à jour. Rien à relancer.</p>
        ) : (
          <>
            <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border border-line bg-bg-alt px-5 py-4">
              <div>
                <p className="text-[15px] font-medium">{impayes.length} impayé{impayes.length > 1 ? "s" : ""} · {eur(totalReste)} à encaisser</p>
                <p className="mono mt-1 text-[12px] text-ink-soft">
                  {avecEmail.length} avec email{sansEmail.length ? ` · ${sansEmail.length} sans email (à voir en personne)` : ""}
                </p>
              </div>
              {avecEmail.length > 0 ? (
                <form action={relancerTous}>
                  <button className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                    RELANCER LES {avecEmail.length} PAR EMAIL →
                  </button>
                </form>
              ) : null}
            </div>

            <div className="mt-6 border border-line">
              {impayes.map((l) => {
                const email = l.adherent?.email ?? null;
                const relancerUn = relancerImpaye.bind(null, org.slug, l.id);
                return (
                  <div key={l.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0">
                    <div className="min-w-0">
                      <Link href={`/${org.slug}/cockpit/adherents/${l.adherent?.id}`} className="text-[15px] font-medium hover:underline">
                        {l.adherent?.prenom} {l.adherent?.nom}
                      </Link>
                      <p className="mono mt-0.5 text-[12px] text-ink-soft">
                        {l.cours?.nom ?? "—"} · reste <span className="text-ink">{eur(l.reste)}</span>
                        {l.derniere_relance ? ` · relancé ${depuis(l.derniere_relance)}` : ""}
                      </p>
                    </div>
                    {email ? (
                      <form action={relancerUn}>
                        <button className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">
                          {l.derniere_relance ? "Relancer à nouveau" : "Relancer"}
                        </button>
                      </form>
                    ) : (
                      <span className="mono text-[11px] uppercase tracking-wide text-ink-faint">Pas d’email</span>
                    )}
                  </div>
                );
              })}
            </div>

            <p className="mono mt-6 text-[11px] leading-relaxed text-ink-faint">
              Chaque personne reçoit un email individuel, avec son propre montant restant. Les réponses arrivent
              sur l’adresse du club. Une relance déjà partie est datée pour éviter de solliciter deux fois de suite.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
