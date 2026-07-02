import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PaiementsClient, { type LignePaiement } from "./PaiementsClient";

export const dynamic = "force-dynamic";

function Cur() { return <span className="cur">_</span>; }

export default async function PaiementsPage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/paiements`);
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("adhesions")
    .select("id, montant_centimes, mode_paiement, statut, created_at, adherent:adherents(prenom, nom, email), cours:cours(nom), reglements(montant_centimes)")
    .eq("organisation_id", org.id)
    .in("statut", ["en_attente", "en_retard"])
    .in("mode_paiement", ["cheque", "especes"])
    .order("created_at", { ascending: false });

  const brut = (data ?? []) as unknown as Array<{
    id: string;
    montant_centimes: number;
    mode_paiement: string;
    statut: string;
    created_at: string;
    adherent: { prenom: string; nom: string; email: string | null } | null;
    cours: { nom: string } | null;
    reglements: Array<{ montant_centimes: number }> | null;
  }>;

  const lignes: LignePaiement[] = brut.map((l) => ({
    id: l.id,
    prenom: l.adherent?.prenom ?? "Adhérent",
    nom: l.adherent?.nom ?? "",
    email: l.adherent?.email ?? null,
    cours: l.cours?.nom ?? "—",
    mode: l.mode_paiement,
    statut: l.statut,
    montantCentimes: l.montant_centimes,
    regleCentimes: (l.reglements ?? []).reduce((s, r) => s + r.montant_centimes, 0),
    inscritLe: l.created_at,
  }));

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">TRÉSORERIE · ENCAISSEMENTS<Cur /></span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">RÈGLEMENTS À ENCAISSER — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Chèques &amp; espèces.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Encaissez en une ou plusieurs fois : chaque acompte est noté sur la fiche, le solde suit tout
          seul. Sélectionnez des lignes pour relancer ou exporter.
        </p>

        <PaiementsClient slug={org.slug} nomClub={org.nom} lignes={lignes} />
      </div>
    </main>
  );
}
