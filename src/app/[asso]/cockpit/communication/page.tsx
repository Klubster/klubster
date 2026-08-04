import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { verifierPermission } from "@/lib/garde";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import Communication from "./Communication";
import Historique, { type CampagneListe } from "./Historique";

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
  const { data: adhData } = await supabase
    .from("adherents")
    .select("id, email, date_naissance")
    .eq("organisation_id", org.id);
  const { data: insData } = await supabase.from("adhesions").select("adherent_id, cours_id").eq("organisation_id", org.id);
  const { data: coursData } = await supabase.from("cours").select("id, nom").eq("organisation_id", org.id).order("ordre");

  // L'historique n'est chargé QUE si le profil a la permission « messages ». La RLS le
  // refuserait de toute façon depuis la 0025, mais on ne lance pas une requête dont on
  // sait qu'elle ne doit rien rendre — et l'absence de section vaut mieux qu'une section
  // vide qui laisserait croire qu'aucun message n'a jamais été envoyé.
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
  // Dossiers incomplets : les adhérents dont une pièce n'est pas encore reçue.
  const { data: piecesData } = await supabase
    .from("pieces_adherent")
    .select("adherent_id, statut")
    .eq("organisation_id", org.id)
    .eq("statut", "manquante")
      // règle du 04/08 : le ciblage « dossiers incomplets » ne vise que les obligatoires
      .eq("obligatoire", true);

  const adherents = (adhData ?? []) as { id: string; email: string | null; date_naissance: string | null }[];
  const adhesions = (insData ?? []) as { adherent_id: string; cours_id: string | null }[];
  const cours = (coursData ?? []) as { id: string; nom: string }[];
  const incompletIds = new Set((piecesData ?? []).map((p) => (p as { adherent_id: string }).adherent_id));

  const coursByAdh = new Map<string, string[]>();
  for (const r of adhesions) {
    if (!r.cours_id) continue;
    const arr = coursByAdh.get(r.adherent_id) ?? [];
    arr.push(r.cours_id);
    coursByAdh.set(r.adherent_id, arr);
  }

  // Mineur = né il y a moins de 18 ans. Même règle que côté serveur, pour un compte cohérent.
  const seuilMineur = new Date();
  seuilMineur.setFullYear(seuilMineur.getFullYear() - 18);

  const membres = adherents
    .filter((a) => a.email)
    .map((a) => ({
      email: a.email as string,
      coursIds: coursByAdh.get(a.id) ?? [],
      mineur: a.date_naissance ? new Date(a.date_naissance) > seuilMineur : false,
      incomplet: incompletIds.has(a.id),
    }));

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

        {membres.length === 0 ? (
          <p className="mono mt-8 text-[12px] text-ink-soft">Aucun adhérent avec un email pour le moment.</p>
        ) : (
          <Communication
            membres={membres}
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
