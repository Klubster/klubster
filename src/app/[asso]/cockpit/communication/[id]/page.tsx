import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const ETAT_LIGNE: Record<string, { texte: string; classe: string }> = {
  prepare: { texte: "Non envoyé", classe: "text-ink-soft" },
  accepte: { texte: "Accepté", classe: "text-ink" },
  distribue: { texte: "Distribué", classe: "text-brand-dark" },
  retarde: { texte: "Retardé", classe: "text-warning" },
  rejete: { texte: "Rejeté", classe: "text-danger" },
  echec: { texte: "Échec", classe: "text-danger" },
  plainte: { texte: "Signalé comme indésirable", classe: "text-danger" },
  supprime: { texte: "Adresse supprimée", classe: "text-ink-soft" },
};

/**
 * Détail d'une campagne.
 *
 * La permission `messages` est exigée ici comme à l'envoi : la liste des destinataires
 * porte les adresses des adhérents, et un encadrant ou un accès en lecture seule n'a
 * aucune raison d'y accéder. La RLS cloisonne déjà par organisation, mais elle ne
 * distingue pas les rôles au sein du club — c'est ce contrôle qui le fait.
 */
export default async function DetailCampagne(props: {
  params: Promise<{ asso: string; id: string }>;
}) {
  const { asso, id } = await props.params;
  const org = await getOrganisationBySlug(asso);
  if (!org) notFound();

  const ctx = await verifierPermission(asso, "messages");
  if (!ctx) redirect(`/connexion?next=/${asso}/cockpit/communication`);

  const supabase = await createSupabaseServerClient();

  const { data: camp } = await supabase
    .from("message_campaigns")
    .select("*")
    .eq("id", id)
    .eq("organisation_id", org.id) // seconde barrière : jamais la campagne d'un autre club
    .maybeSingle();
  if (!camp) notFound();

  const c = camp as {
    objet: string; corps: string; groupe_libelle: string; auteur_nom: string | null;
    statut: string; nombre_destinataires: number; nombre_acceptes: number;
    nombre_distribues: number; nombre_retardes: number; nombre_echecs: number;
    nombre_plaintes: number; created_at: string; derniere_erreur: string | null;
  };

  const { data: destData } = await supabase
    .from("message_recipients")
    .select("id, email, statut, erreur")
    .eq("campaign_id", id)
    .eq("organisation_id", org.id)
    .order("statut");
  const destinataires = (destData ?? []) as Array<{ id: string; email: string | null; statut: string; erreur: string | null }>;

  const d = new Date(c.created_at);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${asso}/cockpit/communication`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← MESSAGERIE
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">CAMPAGNE<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          {c.groupe_libelle.toUpperCase()}<Cur />
        </p>
        <h1 className="mt-4 text-2xl font-medium md:text-3xl">{c.objet}</h1>
        <p className="mono mt-3 text-[11px] text-ink-soft">
          {d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })} à{" "}
          {d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }).replace(":", " h ")}
          {c.auteur_nom ? ` · ${c.auteur_nom}` : ""}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-4">
          {[
            [c.nombre_destinataires, "DESTINATAIRES", false],
            [c.nombre_acceptes, "ACCEPTÉS", false],
            [c.nombre_distribues, "DISTRIBUÉS", false],
            [c.nombre_echecs + c.nombre_plaintes, "ÉCHECS", true],
          ].map(([n, label, alerte]) => (
            <div key={label as string} className="bg-paper px-4 py-4">
              <div className={`mono text-[20px] leading-none ${alerte && (n as number) > 0 ? "text-danger" : "text-ink"}`}>{n as number}</div>
              <div className="mono mt-2 text-[10px] uppercase tracking-label text-ink-soft">{label as string}</div>
            </div>
          ))}
        </div>

        {c.derniere_erreur ? (
          <p className="mono mt-5 border border-line px-4 py-3 text-[12px] text-danger">{c.derniere_erreur}</p>
        ) : null}

        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGE ENVOYÉ<Cur /></p>
          <p className="mt-4 whitespace-pre-wrap border border-line bg-bg-alt px-4 py-4 text-[14px] leading-relaxed text-ink-soft">
            {c.corps}
          </p>
        </section>

        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">DESTINATAIRES<Cur /></p>
          <div className="mt-4 border border-line">
            {destinataires.map((r) => {
              const e = ETAT_LIGNE[r.statut] ?? ETAT_LIGNE.prepare;
              return (
                <div key={r.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line px-4 py-2.5 last:border-b-0">
                  {/* Une adresse effacée au titre du droit à l'effacement laisse la ligne
                      en place : le club garde son compte, pas l'identité. */}
                  <span className="mono flex-1 truncate text-[12px]">{r.email ?? "— adresse effacée —"}</span>
                  <span className={`mono text-[11px] ${e.classe}`}>{e.texte}</span>
                </div>
              );
            })}
          </div>
          {destinataires.some((r) => r.erreur) ? (
            <p className="mono mt-3 text-[11px] text-ink-faint">
              Les rejets viennent le plus souvent d’une adresse erronée ou d’une boîte pleine.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
