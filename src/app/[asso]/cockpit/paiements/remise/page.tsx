import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import RemiseClient, { type Cheque } from "./RemiseClient";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function RemisePage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/paiements/remise`);
  }

  const supabase = createSupabaseServerClient();
  // Chèques encaissés mais pas encore remis en banque.
  const { data } = await supabase
    .from("reglements")
    .select("id, montant_centimes, created_at, adhesion:adhesions(adherent:adherents(prenom, nom), cours:cours(nom))")
    .eq("organisation_id", org.id)
    .eq("mode", "cheque")
    .is("remis_le", null)
    .order("created_at", { ascending: true });

  const brut = (data ?? []) as unknown as Array<{
    id: string;
    montant_centimes: number;
    created_at: string;
    adhesion: { adherent: { prenom: string; nom: string } | null; cours: { nom: string } | null } | null;
  }>;

  const cheques: Cheque[] = brut.map((r) => ({
    id: r.id,
    prenom: r.adhesion?.adherent?.prenom ?? "Adhérent",
    nom: r.adhesion?.adherent?.nom ?? "",
    cours: r.adhesion?.cours?.nom ?? "—",
    montantCentimes: r.montant_centimes,
    recuLe: r.created_at,
  }));

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8 print:hidden">
        <Link href={`/${org.slug}/cockpit/paiements`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← ENCAISSEMENTS
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          REMISE DE CHÈQUES<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft print:hidden">
          BORDEREAU DE REMISE — {org.nom}<Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl print:hidden">Préparer une remise.</h1>
        <p className="mt-3 max-w-prose text-ink-soft print:hidden">
          Voici les chèques encaissés qui n’ont pas encore été déposés en banque. Décochez ceux que vous
          gardez pour plus tard, puis imprimez le bordereau à joindre à votre remise.
        </p>

        <RemiseClient slug={org.slug} nomClub={org.nom} cheques={cheques} />
      </div>
    </main>
  );
}
