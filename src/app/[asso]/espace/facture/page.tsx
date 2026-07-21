import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix } from "@/lib/format";
import { saisonCourante } from "@/lib/saison";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

/** Intitulé lisible du moyen de paiement enregistré. */
function modeLabel(mode: string | null): string {
  switch (mode) {
    case "en_ligne": return "Carte bancaire (en ligne)";
    case "cheque": return "Chèque";
    case "especes": return "Espèces";
    case "virement": return "Virement";
    default: return "—";
  }
}

export default async function RecuPage({ params }: { params: { asso: string } }) {
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

  // Un reçu est un justificatif de paiement : il ne se fonde pas sur le montant DÛ,
  // mais sur ce qui a réellement été encaissé. On lit les règlements de l'adhésion ;
  // s'ils ne sont pas lisibles côté adhérent (RLS), on retombe sur l'adhésion elle-même
  // quand elle est marquée « payé ».
  const { data: reglementsData } = await supabase
    .from("reglements")
    .select("montant_centimes, mode, created_at")
    .eq("adhesion_id", adhesion.id)
    .order("created_at", { ascending: true });
  const reglements = (reglementsData ?? []) as { montant_centimes: number; mode: string | null; created_at: string }[];

  const netRegle = reglements.reduce((s, r) => s + (r.montant_centimes || 0), 0);
  const paye = adhesion.statut === "paye";
  // Montant du reçu : somme réellement encaissée, ou repli sur le montant de l'adhésion si
  // le détail des règlements n'est pas accessible mais que l'adhésion est acquittée.
  const montantRecu = netRegle > 0 ? netRegle : paye ? adhesion.montant_centimes : 0;

  // Pas de paiement encaissé → pas de justificatif à émettre.
  if (montantRecu <= 0) {
    return (
      <main className="min-h-screen bg-paper text-ink">
        <div className="mx-auto max-w-2xl px-6 py-10 md:px-8">
          <div className="print:hidden">
            <Link href={`/${org.slug}/espace`} className="mono text-[12px] text-ink-soft hover:text-ink">← MON ESPACE</Link>
          </div>
          <div className="mt-8 border border-line bg-surface p-8 md:p-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">REÇU DE PAIEMENT<span className="cur">_</span></p>
            <p className="mt-6 text-[15px] leading-relaxed">
              Aucun paiement n’est encore enregistré pour votre adhésion. Votre reçu sera
              disponible ici automatiquement dès que votre cotisation aura été réglée.
            </p>
            <p className="mono mt-8 text-[10px] text-ink-faint">Émis avec klubster<span className="cur">_</span></p>
          </div>
        </div>
      </main>
    );
  }

  const dateEmission = reglements.length > 0 ? reglements[reglements.length - 1].created_at : adhesion.created_at;
  const dateFr = new Date(dateEmission).toLocaleDateString("fr-FR");
  const annee = new Date(dateEmission).getFullYear();
  const numero = `REC-${annee}-${String(adhesion.id).replace(/-/g, "").slice(0, 8).toUpperCase()}`;

  // Moyens de paiement distincts, pour la mention « réglé par … ».
  const modes = Array.from(new Set(reglements.map((r) => r.mode))).filter(Boolean) as string[];
  const modesLisibles = modes.map(modeLabel).join(", ");

  // Reste éventuel : un reçu peut porter sur un acompte / paiement partiel.
  const reste = adhesion.montant_centimes - montantRecu;
  const partiel = reste > 0;

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
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">REÇU DE PAIEMENT<span className="cur">_</span></p>
              <p className="mono mt-2 text-[13px]">{numero}</p>
              <p className="mono text-[12px] text-ink-soft">Émis le {dateFr}</p>
            </div>
            <div className="text-right">
              <div className="font-medium">{org.nom}</div>
              {org.adresse ? <div className="text-[13px] text-ink-soft">{org.adresse}</div> : null}
              {org.email_contact ? <div className="text-[13px] text-ink-soft">{org.email_contact}</div> : null}
            </div>
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <p className="mono text-[10px] uppercase tracking-label text-ink-soft">REÇU DE</p>
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
                <td className="py-4">Cotisation — {coursNom}<div className="text-[12px] text-ink-soft">Saison {saisonCourante(org)}</div></td>
                <td className="mono py-4 text-right">{formatPrix(montantRecu)}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td className="py-4 text-right font-medium">Somme réglée</td>
                <td className="mono py-4 text-right text-[18px] font-bold">{formatPrix(montantRecu)}</td>
              </tr>
            </tfoot>
          </table>

          {reglements.length > 1 ? (
            <div className="mt-2 border-t border-line pt-4">
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">Détail des règlements</p>
              <ul className="mt-2 space-y-1">
                {reglements.map((r, i) => (
                  <li key={i} className="flex justify-between text-[13px] text-ink-soft">
                    <span>{new Date(r.created_at).toLocaleDateString("fr-FR")} — {modeLabel(r.mode)}</span>
                    <span className="mono">{formatPrix(r.montant_centimes)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-[14px]">
              Reçu de <span className="font-medium">{a.prenom} {a.nom}</span> la somme de{" "}
              <span className="mono font-medium">{formatPrix(montantRecu)}</span>
              {modesLisibles ? <> par {modesLisibles.toLowerCase()}</> : null}, au titre de sa cotisation.
            </p>
            <p className="mono mt-3 text-[12px]" style={{ color: partiel ? "#8C8C88" : "#279B65" }}>
              {partiel ? `○ PAIEMENT PARTIEL — reste ${formatPrix(reste)} à régler` : "✓ INTÉGRALEMENT RÉGLÉ"}
            </p>
          </div>

          <p className="mt-8 text-[11px] leading-relaxed text-ink-faint">
            Association à but non lucratif — TVA non applicable. Ce document vaut justificatif de paiement.
          </p>
          <p className="mono mt-6 text-[10px] text-ink-faint">Émis avec klubster<span className="cur">_</span></p>
        </div>
      </div>
    </main>
  );
}
