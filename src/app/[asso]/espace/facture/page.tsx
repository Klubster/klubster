import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";
import { saisonCourante } from "@/lib/saison";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function FacturePage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${org.slug}/espace/facture`);

  const supabase = createSupabaseServerClient();
  const { data: adherent } = await supabase.from("adherents").select("id, prenom, nom, email").eq("user_id", user.id).eq("organisation_id", org.id).maybeSingle();
  if (!adherent) redirect(`/${org.slug}/espace`);
  const a = adherent as { id: string; prenom: string; nom: string; email: string | null };

  const { data: adhesion } = await supabase.from("adhesions").select("id, statut, montant_centimes, cours_id, created_at").eq("adherent_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!adhesion) redirect(`/${org.slug}/espace`);
  let coursNom = "Cotisation";
  if (adhesion.cours_id) {
    const { data: c } = await supabase.from("cours").select("nom").eq("id", adhesion.cours_id).maybeSingle();
    coursNom = (c as { nom?: string } | null)?.nom ?? coursNom;
  }

  const numero = `FAC-2026-${String(adhesion.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;
  const date = new Date(adhesion.created_at).toLocaleDateString("fr-FR");
  const paye = adhesion.statut === "paye";

  return (
    <main className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
        <div className="flex items-center justify-between print:hidden">
          <Link href={`/${org.slug}/espace`} className="mono text-[12px] text-ink-soft hover:text-ink">← MON ESPACE</Link>
          <PrintButton />
        </div>

        <div className="mt-8 border border-line bg-surface p-8 md:p-10">
          <div className="flex items-start justify-between">
            <div>
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">FACTURE<span className="cur">_</span></p>
              <p className="mono mt-2 text-[13px]">{numero}</p>
              <p className="mono text-[12px] text-ink-soft">{date}</p>
            </div>
            <div className="text-right">
              <div className="font-medium">{org.nom}</div>
              {org.adresse ? <div className="text-[13px] text-ink-soft">{org.adresse}</div> : null}
              {org.email_contact ? <div className="text-[13px] text-ink-soft">{org.email_contact}</div> : null}
            </div>
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">ADHÉRENT</p>
            <div className="mt-1 text-[15px]">{a.prenom} {a.nom}</div>
            {a.email ? <div className="text-[13px] text-ink-soft">{a.email}</div> : null}
          </div>

          <table className="mt-8 w-full text-left text-sm">
            <thead className="border-y border-line">
              <tr className="mono text-[11px] uppercase tracking-wider text-ink-soft">
                <th className="py-3">Désignation</th>
                <th className="py-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line">
                <td className="py-4">Cotisation annuelle — {coursNom}<div className="text-[12px] text-ink-soft">Saison {saisonCourante(org)}</div></td>
                <td className="mono py-4 text-right">{formatPrix(adhesion.montant_centimes)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="py-4 text-right font-medium">Total</td>
                <td className="mono py-4 text-right text-[18px] font-bold">{formatPrix(adhesion.montant_centimes)}</td>
              </tr>
            </tfoot>
          </table>

          <div className="mt-6 border-t border-line pt-4">
            <span className="mono text-[12px]" style={{ color: paye ? "#279B65" : "#8C8C88" }}>
              {paye ? "✓ ACQUITTÉE" : "○ EN ATTENTE DE RÈGLEMENT"}
            </span>
          </div>

          <p className="mono mt-10 text-[10px] text-ink-faint">Émis avec klubster<span className="cur">_</span></p>
        </div>
      </div>
    </main>
  );
}
