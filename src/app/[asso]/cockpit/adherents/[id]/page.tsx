import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix, formatMontant } from "@/lib/format";
import { modifierAdherent, basculerPiece } from "../actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const CHAMP = "mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink";

type Adhesion = {
  id: string;
  statut: string | null;
  saison: string | null;
  montant_centimes: number | null;
  mode_paiement: string | null;
  created_at: string;
  cours: { nom: string } | null;
};
type Piece = { id: string; cle: string; label: string | null; statut: string | null };
type Reglement = { id: string; montant_centimes: number; mode: string | null; note: string | null; created_at: string };
type Sante = { resultat: string | null; signataire_nom: string | null; created_at: string };

export default async function FicheAdherent({
  params,
  searchParams,
}: {
  params: { asso: string; id: string };
  searchParams: { ok?: string; erreur?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents/${params.id}`);
  }

  const supabase = createSupabaseServerClient();

  // Filtré par organisation : un identifiant deviné ne doit jamais ouvrir la fiche d'un autre club.
  const { data: adherent } = await supabase
    .from("adherents")
    .select("id, prenom, nom, email, telephone, created_at, infos")
    .eq("id", params.id)
    .eq("organisation_id", org.id)
    .maybeSingle();
  if (!adherent) notFound();

  const [{ data: adhesions }, { data: pieces }, { data: sante }] = await Promise.all([
    supabase
      .from("adhesions")
      .select("id, statut, saison, montant_centimes, mode_paiement, created_at, cours(nom)")
      .eq("adherent_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("pieces_adherent").select("id, cle, label, statut").eq("adherent_id", params.id),
    supabase
      .from("questionnaires_sante")
      .select("resultat, signataire_nom, created_at")
      .eq("adherent_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const listeAdhesions = (adhesions ?? []) as unknown as Adhesion[];
  const listePieces = (pieces ?? []) as unknown as Piece[];
  const questionnaire = ((sante ?? []) as unknown as Sante[])[0];

  const idsAdhesions = listeAdhesions.map((a) => a.id);
  const { data: reglements } = idsAdhesions.length
    ? await supabase
        .from("reglements")
        .select("id, montant_centimes, mode, note, created_at")
        .in("adhesion_id", idsAdhesions)
        .order("created_at", { ascending: true })
    : { data: [] };
  const listeReglements = (reglements ?? []) as unknown as Reglement[];

  const totalRegle = listeReglements.reduce((s, r) => s + r.montant_centimes, 0);
  const totalDu = listeAdhesions.reduce((s, a) => s + (a.montant_centimes ?? 0), 0);
  const reste = Math.max(totalDu - totalRegle, 0);

  const infos = (adherent.infos ?? {}) as Record<string, string>;
  const modifier = modifierAdherent.bind(null, org.slug, adherent.id);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit/adherents`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← ADHÉRENTS
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          FICHE ADHÉRENT<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">
          {adherent.prenom} {adherent.nom}
        </h1>
        <p className="mono mt-2 text-[11px] uppercase tracking-label text-ink-soft">
          Inscrit le {new Date(adherent.created_at).toLocaleDateString("fr-FR")}
        </p>

        {searchParams.ok ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#1E7A4F" }}>
            ✓ Fiche enregistrée.
          </p>
        ) : null}
        {searchParams.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "nom"
              ? "Le prénom et le nom sont obligatoires."
              : "L’enregistrement a échoué. Réessayez."}
          </p>
        ) : null}

        {/* ——— COORDONNÉES (modifiables) ——— */}
        <form action={modifier} className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COORDONNÉES<Cur />
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM *</label>
              <input name="prenom" defaultValue={adherent.prenom} required className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM *</label>
              <input name="nom" defaultValue={adherent.nom} required className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL</label>
              <input name="email" type="email" defaultValue={adherent.email ?? ""} className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</label>
              <input name="telephone" defaultValue={adherent.telephone ?? ""} className={CHAMP} />
            </div>
          </div>
          <button className="mono mt-6 bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90">
            ENREGISTRER LA FICHE
          </button>
        </form>

        {/* ——— ADHÉSION & TRÉSORERIE ——— */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ADHÉSION<Cur />
          </p>
          {listeAdhesions.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-soft">Aucune adhésion enregistrée.</p>
          ) : (
            <div className="mt-4 border border-line">
              {listeAdhesions.map((a) => (
                <div key={a.id} className="border-b border-line px-5 py-4 last:border-b-0">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-[15px] font-medium">{a.cours?.nom ?? "Cours"}</span>
                    <span
                      className="mono text-[11px] uppercase tracking-wide"
                      style={{
                        color: a.statut === "paye" ? "#1E7A4F" : a.statut === "en_retard" ? "#B23B3B" : "#8A6508",
                      }}
                    >
                      {a.statut === "paye" ? "Payé" : a.statut === "en_retard" ? "En retard" : "En attente"}
                    </span>
                  </div>
                  <p className="mono mt-1 text-[12px] text-ink-soft">
                    Saison {a.saison ?? "—"} · {formatPrix(a.montant_centimes ?? 0)}
                    {a.mode_paiement ? ` · ${a.mode_paiement}` : ""}
                  </p>
                </div>
              ))}
              <div className="bg-bg-alt px-5 py-4">
                <p className="mono text-[12px]">
                  Réglé : <span className="text-ink">{formatMontant(totalRegle)}</span>
                  {reste > 0 ? (
                    <span style={{ color: "#B23B3B" }}> · Reste {formatMontant(reste)}</span>
                  ) : (
                    <span style={{ color: "#1E7A4F" }}> · Soldé</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {listeReglements.length > 0 ? (
            <div className="mt-4 border border-line">
              {listeReglements.map((r) => (
                <p key={r.id} className="mono border-b border-line px-5 py-3 text-[12px] last:border-b-0">
                  <span className="text-ink-soft">{new Date(r.created_at).toLocaleDateString("fr-FR")}</span>
                  {" — "}
                  {formatMontant(r.montant_centimes)}
                  {r.mode ? ` (${r.mode})` : ""}
                  {r.note ? <span className="text-ink-soft"> · {r.note}</span> : null}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        {/* ——— PIÈCES ——— */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PIÈCES DU DOSSIER<Cur />
          </p>
          {listePieces.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-soft">Aucune pièce demandée pour ce cours.</p>
          ) : (
            <div className="mt-4 border border-line">
              {listePieces.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                  <span className="text-[15px]">{p.label ?? p.cle}</span>
                  <form action={basculerPiece.bind(null, org.slug, adherent.id, p.id, p.statut ?? "manquante")}>
                    <button
                      className="mono text-[11px] uppercase tracking-wide hover:underline"
                      style={{ color: p.statut === "recue" ? "#1E7A4F" : "#8A6508" }}
                    >
                      {p.statut === "recue" ? "✓ Reçue" : "○ Manquante"}
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ——— SANTÉ (jamais le détail des réponses) ——— */}
        {questionnaire ? (
          <section className="mt-14">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              QUESTIONNAIRE DE SANTÉ<Cur />
            </p>
            <p className="mt-4 text-[15px]">
              {questionnaire.resultat === "certificat_requis"
                ? "Un certificat médical est demandé."
                : "Attestation signée — aucun certificat requis."}
            </p>
            <p className="mono mt-1 text-[12px] text-ink-soft">
              Signé par {questionnaire.signataire_nom ?? "l’adhérent"} le{" "}
              {new Date(questionnaire.created_at).toLocaleDateString("fr-FR")}. Le détail des réponses n’est
              jamais conservé.
            </p>
          </section>
        ) : null}

        {/* ——— INFOS DU FORMULAIRE ——— */}
        {Object.keys(infos).length > 0 ? (
          <section className="mt-14">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              INFORMATIONS COMPLÉMENTAIRES<Cur />
            </p>
            <div className="mt-4 border border-line">
              {Object.entries(infos).map(([cle, valeur]) => (
                <p key={cle} className="border-b border-line px-5 py-3 text-[14px] last:border-b-0">
                  <span className="mono text-[11px] uppercase tracking-wide text-ink-soft">{cle}</span>
                  <span className="mt-0.5 block">{valeur}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
