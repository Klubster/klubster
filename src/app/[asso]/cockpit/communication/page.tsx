import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Communication from "./Communication";
import Historique, { type CampagneListe } from "./Historique";
import { resoudreDestinataires, type AdherentCiblage, type AdhesionCiblage } from "@/lib/ciblage";
import { saisonCourante } from "@/lib/saison";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function MessageriePage(props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/communication`);
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: adhData }, { data: insData }, { data: coursData }, { data: piecesData }] = await Promise.all([
    supabase.from("adherents").select("id, email, date_naissance, infos").eq("organisation_id", org.id),
    supabase.from("adhesions").select("adherent_id, cours_id, saison, statut").eq("organisation_id", org.id),
    supabase.from("cours").select("id, nom").eq("organisation_id", org.id).order("ordre"),
    supabase.from("pieces_adherent").select("adherent_id").eq("organisation_id", org.id)
      .eq("statut", "manquante").eq("obligatoire", true),
  ]);

  // LA MÊME résolution que l'envoi (src/lib/ciblage.ts) : le compteur affiché est,
  // par construction, le nombre qui partirait. Les listes sont précalculées par
  // groupe ; le client ne recalcule rien.
  const donnees = {
    adherents: (adhData ?? []) as AdherentCiblage[],
    adhesions: (insData ?? []) as AdhesionCiblage[],
    incompletIds: new Set(((piecesData ?? []) as { adherent_id: string }[]).map((x) => x.adherent_id)),
    saisonCourante: saisonCourante(org),
  };
  const cours = ((coursData ?? []) as { id: string; nom: string }[]);
  const listes: Record<string, string[]> = {};
  for (const g of ["tous", "parents", "incomplet", ...cours.map((c) => c.id)]) {
    listes[g] = resoudreDestinataires(donnees, g).map((d) => d.email);
  }

  const peutVoirHistorique = !!(await verifierPermission(params.asso, "messages"));
  let campagnes: CampagneListe[] = [];
  if (peutVoirHistorique) {
    const { data: campData } = await supabase
      .from("message_campaigns")
      .select(
        "id, objet, groupe_libelle, auteur_nom, statut, nombre_destinataires, nombre_acceptes, nombre_distribues, nombre_retardes, nombre_echecs, nombre_plaintes, created_at"
      )
      .eq("organisation_id", org.id)
      .order("created_at", { ascending: false })
      .limit(25);
    campagnes = (campData ?? []) as CampagneListe[];
  }
  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MESSAGERIE — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Écrire à vos adhérents.</h1>
        <p className="mt-3 text-ink-soft">
          {process.env.RESEND_API_KEY
            ? "Choisissez un groupe, écrivez votre message : Klubster l'envoie à chaque adhérent, individuellement."
            : "Choisissez un groupe, écrivez votre message : Klubster prépare l'email et l'ouvre dans votre messagerie, les adhérents en copie cachée."}
        </p>

        {listes["tous"].length === 0 && listes["parents"].length === 0 ? (
          <p className="mono mt-8 text-[12px] text-ink-soft">Aucun adhérent avec un email pour le moment.</p>
        ) : (
          <Communication
            listes={listes}
            cours={cours}
            contactEmail={org.email_contact}
            slug={org.slug}
            envoiDirect={!!process.env.RESEND_API_KEY}
          />
        )}

        {peutVoirHistorique ? <Historique campagnes={campagnes} slug={org.slug} /> : null}
      </div>
    </main>
  );
}
