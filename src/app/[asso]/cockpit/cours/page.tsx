import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import CoursEditeur, { type CoursLigne } from "@/components/site/CoursEditeur";
import { ajouterCoursSimple, promouvoirAttente } from "./actions";
import { peut } from "@/lib/roles";
import { saisonCourante } from "@/lib/saison";
import type { Creneau } from "@/types/db";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function CoursPage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { ok?: string; erreur?: string; promo?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/cours`);
  }

  const supabase = createSupabaseServerClient();
  const { data } = await supabase
    .from("cours")
    .select("id, nom, public_cible, tarif_centimes, creneaux, ordre, places_max")
    .eq("organisation_id", org.id)
    .order("ordre", { ascending: true, nullsFirst: false });

  // Un cours qu'on ne peut pas supprimer sans casser des dossiers : on compte d'abord.
  // On récupère aussi de quoi calculer la jauge (inscrits actifs vs liste d'attente) et
  // afficher la liste d'attente de la saison en cours.
  const saison = saisonCourante(org);
  const { data: adhesions } = await supabase
    .from("adhesions")
    .select("id, cours_id, statut, saison, created_at, adherent:adherents(id, prenom, nom)")
    .eq("organisation_id", org.id);

  type LigneAdh = {
    id: string;
    cours_id: string | null;
    statut: string | null;
    saison: string | null;
    created_at: string;
    adherent: { id: string; prenom: string; nom: string } | null;
  };
  const toutes = (adhesions ?? []) as unknown as LigneAdh[];

  const parCours = new Map<string, number>();
  const actifsParCours = new Map<string, number>();
  const attenteParCours = new Map<string, number>();
  for (const a of toutes) {
    if (!a.cours_id) continue;
    parCours.set(a.cours_id, (parCours.get(a.cours_id) ?? 0) + 1);
    if (a.saison !== saison) continue;
    if (a.statut === "liste_attente") attenteParCours.set(a.cours_id, (attenteParCours.get(a.cours_id) ?? 0) + 1);
    else if (["en_attente", "en_retard", "paye"].includes(a.statut ?? "")) actifsParCours.set(a.cours_id, (actifsParCours.get(a.cours_id) ?? 0) + 1);
  }

  const cours: CoursLigne[] = ((data ?? []) as unknown as {
    id: string;
    nom: string;
    public_cible: string | null;
    tarif_centimes: number;
    creneaux: Creneau[] | null;
    places_max: number | null;
  }[]).map((c) => ({
    id: c.id,
    nom: c.nom,
    public_cible: c.public_cible,
    tarif_centimes: c.tarif_centimes ?? 0,
    creneaux: c.creneaux ?? [],
    adherents: parCours.get(c.id) ?? 0,
    places_max: c.places_max ?? null,
    actifs: actifsParCours.get(c.id) ?? 0,
    attente: attenteParCours.get(c.id) ?? 0,
  }));

  const nomCours = new Map(cours.map((c) => [c.id, c.nom]));
  // Liste d'attente de la saison, la plus ancienne d'abord (premier arrivé, premier servi).
  const listeAttente = toutes
    .filter((a) => a.statut === "liste_attente" && a.saison === saison && a.adherent)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const peutPromouvoir = peut(profile.role, "adherents_ecriture");
  const accent = org.couleur_primaire ?? "#111111";
  const ajouter = ajouterCoursSimple.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← COCKPIT
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          COURS ET TARIFS<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">
          {cours.length} cours
        </h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Les horaires changent, les tarifs augmentent, une activité s’ajoute en janvier.
          Tout se modifie ici, et votre site comme vos inscriptions suivent immédiatement.
        </p>

        {searchParams?.ok ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#1E7A4F" }}>
            Cours ajouté.
          </p>
        ) : null}
        {searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "promo"
              ? "La promotion a échoué. Réessayez."
              : "L’ajout a échoué. Vérifiez le nom du cours."}
          </p>
        ) : null}
        {searchParams?.promo === "1" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#1E7A4F" }}>
            ✓ Place donnée. La personne a été prévenue par email.
          </p>
        ) : null}

        <div className="mt-10 space-y-4">
          {cours.map((c) => (
            <CoursEditeur key={c.id} slug={org.slug} cours={c} accent={accent} />
          ))}
        </div>

        {/* Liste d'attente — premier arrivé, premier servi. Donner une place prévient la personne. */}
        {listeAttente.length > 0 ? (
          <section className="mt-12">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              LISTE D’ATTENTE — {listeAttente.length} personne{listeAttente.length > 1 ? "s" : ""}<Cur />
            </p>
            <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
              Inscrites quand leur cours était complet. Donnez une place dès qu’une se libère : la personne
              est prévenue par email et son adhésion devient « en attente » de règlement.
            </p>
            <div className="mt-4 border border-line">
              {listeAttente.map((a) => {
                const promouvoir = promouvoirAttente.bind(null, org.slug, a.id);
                return (
                  <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0">
                    <div>
                      <Link href={`/${org.slug}/cockpit/adherents/${a.adherent?.id}`} className="text-[15px] font-medium hover:underline">
                        {a.adherent?.prenom} {a.adherent?.nom}
                      </Link>
                      <p className="mono mt-0.5 text-[12px] text-ink-soft">
                        {a.cours_id ? nomCours.get(a.cours_id) ?? "—" : "—"} · en attente depuis le{" "}
                        {new Date(a.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    {peutPromouvoir ? (
                      <form action={promouvoir}>
                        <button className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">
                          Donner une place →
                        </button>
                      </form>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* Ajout minimal : un nom, un tarif. Les créneaux se posent ensuite, dans la fiche. */}
        <form action={ajouter} className="mt-10 border border-line bg-bg-alt px-5 py-5">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">Ajouter un cours<Cur /></p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block flex-1 min-w-[200px]">
              <span className="mono text-[11px] text-ink-soft">Nom</span>
              <input
                name="nom"
                required
                placeholder="Boxe loisirs"
                className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
              />
            </label>
            <label className="block w-[140px]">
              <span className="mono text-[11px] text-ink-soft">Tarif (€)</span>
              <input
                name="tarif"
                inputMode="decimal"
                defaultValue="0"
                className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
              />
            </label>
            <button className="mono bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90">AJOUTER →</button>
          </div>
        </form>

        <p className="mono mt-10 text-[11px] leading-relaxed text-ink-soft">
          Un cours qui compte des adhérents ne peut pas être supprimé : leurs dossiers y sont rattachés.
          Déplacez-les d’abord, depuis leur fiche.
        </p>
      </div>
    </main>
  );
}
