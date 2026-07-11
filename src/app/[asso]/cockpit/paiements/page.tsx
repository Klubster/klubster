import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import PaiementsClient, { type LignePaiement } from "./PaiementsClient";
import { definirSaison } from "./actions";
import { peut } from "@/lib/roles";

export const dynamic = "force-dynamic";

function Cur() { return <span className="cur">_</span>; }

const eur = (c: number) => (c / 100).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
const LIBELLE_MODE: Record<string, string> = {
  especes: "Espèces",
  cheque: "Chèques",
  en_ligne: "En ligne (carte)",
  autre: "Autre (chèques vacances, aides…)",
  remboursement: "Remboursements",
};

export default async function PaiementsPage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/paiements`);
  }
  // Trésorerie réservée au président et au trésorier.
  if (!peut(profile.role, "paiements")) redirect(`/${org.slug}/cockpit?acces=refuse`);

  const supabase = createSupabaseServerClient();

  // Totaux par moyen de paiement, bornés à la saison si elle est configurée.
  let reqTotaux = supabase.from("reglements").select("mode, montant_centimes").eq("organisation_id", org.id);
  if (org.saison_debut) reqTotaux = reqTotaux.gte("created_at", org.saison_debut);
  if (org.saison_fin) reqTotaux = reqTotaux.lte("created_at", `${org.saison_fin}T23:59:59`);
  const { data: regl } = await reqTotaux;
  const totaux = new Map<string, number>();
  for (const r of (regl ?? []) as { mode: string; montant_centimes: number }[]) {
    totaux.set(r.mode, (totaux.get(r.mode) ?? 0) + r.montant_centimes);
  }
  const totalGeneral = [...totaux.values()].reduce((s, v) => s + v, 0);
  const saisonAvecSlug = definirSaison.bind(null, org.slug);
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

        <Link
          href={`/${org.slug}/cockpit/paiements/remise`}
          className="mono mt-6 inline-block border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
        >
          PRÉPARER UNE REMISE DE CHÈQUES →
        </Link>

        {/* CONTRÔLE — total par moyen de paiement, sur la saison. */}
        <section className="mt-12 border border-line">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-line px-5 py-3">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              ENCAISSÉ PAR MOYEN DE PAIEMENT<Cur />
            </p>
            <p className="mono text-[11px] text-ink-soft">
              {org.saison_debut || org.saison_fin
                ? `Saison ${org.saison_debut ?? "…"} → ${org.saison_fin ?? "…"}`
                : "Depuis le début"}
            </p>
          </div>
          {totaux.size === 0 ? (
            <p className="px-5 py-4 text-[15px] text-ink-soft">Aucun règlement enregistré sur la période.</p>
          ) : (
            <div className="divide-y divide-line">
              {["especes", "cheque", "en_ligne", "autre", "remboursement"]
                .filter((m) => totaux.has(m))
                .map((m) => (
                  <div key={m} className="flex items-center justify-between px-5 py-2.5">
                    <span className="text-[14px]">{LIBELLE_MODE[m] ?? m}</span>
                    <span className="mono text-[14px] font-medium">{eur(totaux.get(m) ?? 0)}</span>
                  </div>
                ))}
              <div className="flex items-center justify-between bg-bg-alt px-5 py-3">
                <span className="mono text-[12px] uppercase tracking-label text-ink-soft">Total encaissé</span>
                <span className="mono text-[16px] font-bold">{eur(totalGeneral)}</span>
              </div>
            </div>
          )}
        </section>

        {/* Configuration de la saison. */}
        <form action={saisonAvecSlug} className="mt-6 border border-line bg-bg-alt px-5 py-4">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SAISON<Cur /></p>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="block">
              <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Début</span>
              <input type="date" name="debut" defaultValue={org.saison_debut ?? ""} className="mt-1.5 block border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </label>
            <label className="block">
              <span className="mono text-[10px] uppercase tracking-label text-ink-soft">Fin</span>
              <input type="date" name="fin" defaultValue={org.saison_fin ?? ""} className="mt-1.5 block border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </label>
            <button className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">ENREGISTRER</button>
          </div>
          <p className="mono mt-3 text-[11px] text-ink-faint">
            Les totaux ci-dessus se limitent à cette période. Laissez vide pour compter depuis le début.
          </p>
        </form>

        <PaiementsClient slug={org.slug} nomClub={org.nom} lignes={lignes} />
      </div>
    </main>
  );
}
