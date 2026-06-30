import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";
import { marquerEncaisse } from "./actions";

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
    .select("id, montant_centimes, mode_paiement, adherent:adherents(prenom, nom), cours:cours(nom)")
    .eq("organisation_id", org.id).eq("statut", "en_attente").in("mode_paiement", ["cheque", "especes"])
    .order("created_at", { ascending: false });
  const lignes = (data ?? []) as unknown as Array<{
    id: string; montant_centimes: number; mode_paiement: string;
    adherent: { prenom: string; nom: string } | null; cours: { nom: string } | null;
  }>;

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">TRÉSORERIE · ENCAISSEMENTS<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">RÈGLEMENTS À ENCAISSER — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Chèques &amp; espèces.</h1>
        <p className="mt-3 text-ink-soft">Marquez un règlement comme reçu : l&apos;adhésion passe en « payé ».</p>

        <div className="mt-10 divide-y divide-line border border-line bg-paper">
          {lignes.length === 0 ? (
            <p className="px-5 py-6 text-[15px] text-ink-soft">Aucun règlement en attente. Tout est à jour.</p>
          ) : null}
          {lignes.map((l) => (
            <div key={l.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
              <div className="flex-1">
                <div className="text-[15px] font-medium">{l.adherent ? `${l.adherent.prenom} ${l.adherent.nom}` : "Adhérent"}</div>
                <div className="text-[13px] text-ink-soft">{l.cours?.nom ?? "—"} · {l.mode_paiement === "cheque" ? "Chèque" : "Espèces"}</div>
              </div>
              <span className="mono text-[15px] font-bold">{formatPrix(l.montant_centimes)}</span>
              <form action={marquerEncaisse.bind(null, org.slug, l.id)}>
                <button className="mono border border-ink px-4 py-2 text-[11px] hover:bg-ink hover:text-paper">MARQUER ENCAISSÉ →</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
