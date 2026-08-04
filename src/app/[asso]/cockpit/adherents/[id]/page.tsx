import { normaliserCouleur } from "@/lib/contraste";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatPrix, formatMontant } from "@/lib/format";
import { resteAPayer } from "@/lib/finances";
import { saisonCourante } from "@/lib/saison";
import { modifierAdherent, basculerPiece, deposerPieceCockpit, marquerPieceParEmail, changerCours, basculerOppositionCommunications } from "../actions";
import { estFournie, libellePiece } from "@/lib/pieces";
import AjoutReglement from "./AjoutReglement";
import Rgpd from "./Rgpd";
import Remboursement from "./Remboursement";
import DepotPiece from "@/components/cockpit/DepotPiece";
import { peut } from "@/lib/roles";

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
  cours_id?: string | null;
  stripe_payment_intent: string | null;
  litige_le: string | null;
  cours: { nom: string } | null;
};
type Piece = { id: string; cle: string; label: string | null; statut: string | null; chemin: string | null; obligatoire?: boolean | null };
type Reglement = { id: string; adhesion_id: string; montant_centimes: number; mode: string | null; note: string | null; created_at: string };
type Sante = { resultat: string | null; signataire_nom: string | null; created_at: string };

export default async function FicheAdherent(
  props: {
    params: Promise<{ asso: string; id: string }>;
    searchParams: Promise<{ ok?: string; erreur?: string; rembourse?: string; detail?: string; ecart?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents/${params.id}`);
  }

  const supabase = await createSupabaseServerClient();

  // Filtré par organisation : un identifiant deviné ne doit jamais ouvrir la fiche d'un autre club.
  const { data: adherent } = await supabase
    .from("adherents")
    .select("id, prenom, nom, email, telephone, created_at, infos, opposition_communications")
    .eq("id", params.id)
    .eq("organisation_id", org.id)
    .maybeSingle();
  if (!adherent) notFound();

  // Depuis la 0027, `litige_le` et `stripe_payment_intent` ne sont plus lisibles par
  // requête directe : ils passent par `adhesions_finance`, qui vérifie le rôle en base.
  // On lit donc l'adhésion en deux temps — le dossier pour tout le monde, l'argent pour
  // qui y a droit — et on FUSIONNE ensuite. Un secrétaire garde ainsi sa fiche complète
  // côté dossier, sans jamais voir passer une colonne financière.
  const peutVoirArgent = peut(profile.role, "paiements");

  const [{ data: adhesions }, { data: pieces }, { data: sante }] = await Promise.all([
    supabase
      .from("adhesions")
      .select("id, statut, saison, montant_centimes, mode_paiement, created_at, cours_id, cours(nom)")
      .eq("adherent_id", params.id)
      .order("created_at", { ascending: false }),
    supabase.from("pieces_adherent").select("id, cle, label, statut, obligatoire, chemin").eq("adherent_id", params.id),
    supabase
      .from("questionnaires_sante")
      .select("resultat, signataire_nom, created_at")
      .eq("adherent_id", params.id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const base = (adhesions ?? []) as unknown as Adhesion[];
  const listePieces = (pieces ?? []) as unknown as Piece[];
  const questionnaire = ((sante ?? []) as unknown as Sante[])[0];

  // Le volet financier de chaque adhésion, par la RPC qui contrôle le rôle en base.
  const { data: finance } = peutVoirArgent
    ? await supabase.rpc("adhesions_finance", { p_org: org.id }).eq("adherent_id", params.id)
    : { data: [] };
  const financeParId = new Map(
    ((finance ?? []) as { id: string; litige_le: string | null; stripe_payment_intent: string | null }[]).map((f) => [
      f.id,
      f,
    ])
  );
  const listeAdhesions: Adhesion[] = base.map((a) => ({
    ...a,
    litige_le: financeParId.get(a.id)?.litige_le ?? null,
    stripe_payment_intent: financeParId.get(a.id)?.stripe_payment_intent ?? null,
  }));

  // Depuis la migration 0026, `reglements` n'est lisible que par les rôles portant la
  // permission « paiements ». On ne lance donc pas une requête dont on sait qu'elle ne
  // rendra rien — et surtout, on N'AFFICHE PAS les blocs financiers à un rôle qui ne
  // peut pas les lire : un « Réglé : 0 € · Reste 313 € » causé par une RLS serait
  // indiscernable d'un adhérent qui n'a rien payé. Absence plutôt que faux.
  const idsAdhesions = listeAdhesions.map((a) => a.id);
  const { data: reglements } = peutVoirArgent && idsAdhesions.length
    ? await supabase
        .from("reglements")
        .select("id, adhesion_id, montant_centimes, mode, note, created_at")
        .in("adhesion_id", idsAdhesions)
        .order("created_at", { ascending: true })
    : { data: [] };
  const listeReglements = (reglements ?? []) as unknown as Reglement[];

  // Le bloc trésorerie parle de LA saison courante : « Reste 420 € » sur un adhérent
  // à jour depuis deux ans venait d'un total toutes saisons confondues. Le détail par
  // adhésion, lui, garde tout l'historique.
  const saisonActuelle = saisonCourante(org);
  const adhesionsSaison = listeAdhesions.filter((a) => a.saison === saisonActuelle && !["annule", "rembourse", "liste_attente"].includes(a.statut ?? ""));
  const idsSaison = new Set(adhesionsSaison.map((a) => a.id));
  const totalRegle = listeReglements.filter((r) => idsSaison.has(r.adhesion_id)).reduce((s, r) => s + r.montant_centimes, 0);
  const totalDu = adhesionsSaison.reduce((s, a) => s + (a.montant_centimes ?? 0), 0);
  // LA tolérance (5 c) — la même que les RPC d'encaissement : fini l'adhésion à la fois
  // « payée » et « reste 0,03 € » selon l'écran.
  const reste = resteAPayer(totalDu, totalRegle);

  // Solde restant par adhésion : ce que l'ajout de règlement doit cibler.
  const regleParAdhesion = new Map<string, number>();
  for (const r of listeReglements) {
    regleParAdhesion.set(r.adhesion_id, (regleParAdhesion.get(r.adhesion_id) ?? 0) + r.montant_centimes);
  }
  const soldes = listeAdhesions.map((a) => ({
    id: a.id,
    cours: a.cours?.nom ?? a.saison ?? "Adhésion",
    resteCentimes: resteAPayer(a.montant_centimes ?? 0, regleParAdhesion.get(a.id) ?? 0),
  }));

  const infos = (adherent.infos ?? {}) as Record<string, string>;
  const modifier = modifierAdherent.bind(null, org.slug, adherent.id);
  const litige = listeAdhesions.find((a) => a.litige_le);

  // Changement de cours : l'adhésion ACTIVE de la saison courante, et les cours cibles.
  const saisonAct = saisonCourante(org);
  const adhesionCourante = listeAdhesions.find(
    (a) => a.saison === saisonAct && ["en_attente", "paye", "en_retard"].includes(a.statut ?? "")
  ) ?? null;
  const { data: tousCours } = await supabase
    .from("cours").select("id, nom").eq("organisation_id", org.id).order("ordre");
  const autresCours = ((tousCours ?? []) as { id: string; nom: string }[])
    .filter((c) => c.id !== adhesionCourante?.cours_id);

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
        {searchParams.rembourse ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#1E7A4F" }}>
            ✓ Remboursement demandé à Stripe. L’écriture apparaîtra une fois confirmé.
          </p>
        ) : null}
        {searchParams.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "nom"
              ? "Le prénom et le nom sont obligatoires."
              : searchParams.erreur === "piece"
              ? "La pièce n’a pas pu changer d’état. Rechargez la page : elle est restée telle qu’avant."
              : searchParams.erreur === "acces"
                ? "Cette action est réservée au président et au trésorier."
                : searchParams.erreur === "montant"
                  ? "Montant de remboursement invalide (supérieur au paiement ?)."
                  : searchParams.erreur === "remboursement_impossible"
                    ? "Aucun paiement en ligne remboursable pour cette adhésion."
                    : searchParams.erreur === "remboursement"
                      ? "Le remboursement a échoué côté Stripe. Réessayez ou passez par votre tableau de bord."
                      : "L’enregistrement a échoué. Réessayez."}
          </p>
        ) : null}

        {litige ? (
          <div className="mt-6 border px-5 py-4" style={{ borderColor: "#B23B3B", background: "#FBEDED" }}>
            <p className="mono text-[11px] uppercase tracking-label" style={{ color: "#B23B3B" }}>
              LITIGE BANCAIRE<Cur />
            </p>
            <p className="mt-1.5 text-[15px]">
              Un paiement de cet adhérent est contesté (opposition bancaire) depuis le{" "}
              {new Date(litige.litige_le as string).toLocaleDateString("fr-FR")}. Répondez depuis votre
              tableau de bord Stripe — l’adhésion est repassée « en retard » en attendant.
            </p>
          </div>
        ) : null}

        {/* ——— COORDONNÉES ———
            Modifiables par le président et le secrétaire uniquement (matrice
            `adherents_ecriture`, portée en base par `adherents_write_role`). Aux autres
            rôles on montre les valeurs, pas un formulaire : un « ENREGISTRER » qui finit
            en erreur RLS ressemblerait à une panne. Vu en test le 02/08 (Lecture seule). */}
        {peut(profile.role, "adherents_ecriture") ? (
        <form action={modifier} className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COORDONNÉES<Cur />
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="f-prenom" className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM *</label>
              <input id="f-prenom" name="prenom" defaultValue={adherent.prenom} required autoComplete="given-name" className={CHAMP} />
            </div>
            <div>
              <label htmlFor="f-nom" className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM *</label>
              <input id="f-nom" name="nom" defaultValue={adherent.nom} required autoComplete="family-name" className={CHAMP} />
            </div>
            <div>
              <label htmlFor="f-email" className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL</label>
              <input id="f-email" name="email" type="email" defaultValue={adherent.email ?? ""} autoComplete="email" className={CHAMP} />
            </div>
            <div>
              <label htmlFor="f-tel" className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</label>
              <input id="f-tel" name="telephone" type="tel" defaultValue={adherent.telephone ?? ""} autoComplete="tel" className={CHAMP} />
            </div>
          </div>
          <button className="mono mt-6 w-full bg-ink px-6 py-3 text-[12px] text-paper hover:bg-ink/90 sm:w-auto">
            ENREGISTRER LA FICHE
          </button>
        </form>
        ) : (
        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COORDONNÉES<Cur />
          </p>
          <div className="mt-4 grid grid-cols-1 gap-4 border border-line px-5 py-4 sm:grid-cols-2">
            <div>
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM</p>
              <p className="mt-1 text-[15px]">{adherent.prenom}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM</p>
              <p className="mt-1 text-[15px]">{adherent.nom}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL</p>
              <p className="mt-1 text-[15px]">{adherent.email ?? "—"}</p>
            </div>
            <div>
              <p className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</p>
              <p className="mt-1 text-[15px]">{adherent.telephone ?? "—"}</p>
            </div>
          </div>
          <p className="mono mt-2 text-[11px] text-ink-faint">
            La modification des fiches est réservée au président et au secrétaire.
          </p>
        </section>
        )}

        {/* ——— COMMUNICATIONS ———
            Opposition aux messages collectifs uniquement : les relances de dossier et
            de cotisation (nécessaires à l'adhésion) continuent — c'est écrit à l'écran
            pour que le bureau ne promette pas plus que ce que le réglage fait. */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COMMUNICATIONS<Cur />
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-line px-5 py-4">
            <div className="min-w-0">
              {adherent.opposition_communications ? (
                <>
                  <p className="text-[15px] font-medium">Opposé aux messages collectifs</p>
                  <p className="mono mt-0.5 text-[12px] text-ink-soft">
                    enregistré le {new Date(adherent.opposition_communications).toLocaleDateString("fr-FR")} · les
                    relances de dossier et de cotisation continuent
                  </p>
                </>
              ) : (
                <>
                  <p className="text-[15px] font-medium">Reçoit les messages collectifs</p>
                  <p className="mono mt-0.5 text-[12px] text-ink-soft">
                    s&apos;il demande à ne plus les recevoir, enregistrez son opposition ici
                  </p>
                </>
              )}
            </div>
            <form action={basculerOppositionCommunications.bind(null, org.slug, adherent.id)}>
              <button className="mono border border-ink px-4 py-2.5 text-[12px] hover:bg-ink hover:text-paper">
                {adherent.opposition_communications ? "Lever l'opposition" : "Enregistrer l'opposition"}
              </button>
            </form>
          </div>
        </section>

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
                        color:
                          a.statut === "paye" ? "#1E7A4F"
                          : a.statut === "en_retard" ? "#B23B3B"
                          : a.statut === "liste_attente" ? "#6f6f6b"
                          : "#8A6508",
                      }}
                    >
                      {a.statut === "paye" ? "Payé"
                        : a.statut === "en_retard" ? "En retard"
                        : a.statut === "liste_attente" ? "Liste d’attente"
                        : "En attente"}
                    </span>
                  </div>
                  <p className="mono mt-1 text-[12px] text-ink-soft">
                    Saison {a.saison ?? "—"} · {formatPrix(a.montant_centimes ?? 0)}
                    {a.mode_paiement ? ` · ${a.mode_paiement}` : ""}
                    {a.litige_le ? <span style={{ color: "#B23B3B" }}> · litige en cours</span> : null}
                  </p>
                  {peut(profile.role, "paiements") && a.stripe_payment_intent ? (
                    <Remboursement
                      slug={org.slug}
                      adherentId={adherent.id}
                      adhesionId={a.id}
                      montantCentimes={a.montant_centimes ?? 0}
                    />
                  ) : null}
                </div>
              ))}
              <div className="bg-bg-alt px-5 py-4">
                {peutVoirArgent ? (
                  <p className="mono text-[12px]">
                    Saison {saisonActuelle} — réglé : <span className="text-ink">{formatMontant(totalRegle)}</span>
                    {reste > 0 ? (
                      <span style={{ color: "#B23B3B" }}> · Reste {formatMontant(reste)}</span>
                    ) : (
                      <span style={{ color: "#1E7A4F" }}> · Soldé</span>
                    )}
                  </p>
                ) : (
                  // Dire pourquoi la ligne est absente. Un blanc silencieux ferait croire
                  // à un bug ; cette phrase dit que c'est un choix, et lequel.
                  <p className="mono text-[12px] text-ink-faint">
                    Le suivi des règlements est réservé au président et au trésorier.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Encaisser un règlement : président et trésorier seulement. */}
          {peut(profile.role, "paiements") ? (
            <AjoutReglement slug={org.slug} adhesions={soldes} accent={normaliserCouleur(org.couleur_primaire)} />
          ) : null}

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

        {/* ——— CHANGEMENT DE COURS (saison courante, adhésion active) ——— */}
        {searchParams?.ok === "cours" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#1E7A4F" }}>
            ✓ Cours changé.{searchParams?.ecart ? ` Le tarif du nouveau cours diffère de ${(Number(searchParams.ecart) / 100).toLocaleString("fr-FR")} € : ajustez le règlement (avoir ou complément).` : ""}
          </p>
        ) : null}
        {searchParams?.erreur === "cours" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>{searchParams?.detail ?? "Le changement de cours a échoué."}</p>
        ) : null}
        {adhesionCourante && peut(profile.role, "adherents_ecriture") && autresCours.length > 0 ? (
          <details className="mt-8 border border-line bg-paper">
            <summary className="mono cursor-pointer px-5 py-3 text-[11px] uppercase tracking-label text-ink-soft">
              Changer de cours (saison en cours)
            </summary>
            <form action={changerCours.bind(null, org.slug, adherent.id, adhesionCourante.id)} className="flex flex-wrap items-center gap-3 px-5 pb-4">
              <select name="nouveau_cours" required className="min-h-[44px] border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink">
                {autresCours.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom}</option>
                ))}
              </select>
              <button className="mono min-h-[44px] border border-ink px-4 py-2 text-[12px] uppercase hover:bg-ink hover:text-paper">Déplacer →</button>
              <span className="mono w-full text-[11px] text-ink-faint">
                Cours complet = refus. Sans règlement, le montant dû devient le tarif du nouveau cours ; sinon il est conservé et l’écart vous est indiqué.
              </span>
            </form>
          </details>
        ) : null}

        {/* ——— PIÈCES ——— */}
        <section className="mt-14">
          {/* PIECE_MESSAGES — un dépôt doit répondre : succès comme échec. */}
          {searchParams?.ok === "piece" ? (
            <p className="mono mb-3 text-[12px]" style={{ color: "#1E7A4F" }}>✓ Pièce enregistrée dans le dossier.</p>
          ) : null}
          {searchParams?.erreur?.startsWith("piece") ? (
            <p className="mono mb-3 text-[12px]" style={{ color: "#B23B3B" }}>
              {searchParams.erreur === "piece_format"
                ? "Fichier refusé : déposez un PDF, un JPEG ou un PNG de 5 Mo maximum."
                : searchParams.erreur === "piece_vide"
                ? "Le fichier est vide : choisissez un document avant de déposer."
                : "Le dépôt a échoué. Rien n’a été modifié — réessayez."}
            </p>
          ) : null}
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PIÈCES DU DOSSIER<Cur />
          </p>
          {listePieces.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-soft">Aucune pièce demandée pour ce cours.</p>
          ) : (
            <div className="mt-4 border border-line">
              {listePieces.map((p) => (
                <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0">
                  <span className="text-[15px]">
                    {p.label ?? p.cle}
                    {p.obligatoire === false ? <span className="mono ml-2 text-[11px] uppercase text-ink-faint">Facultative</span> : null}
                  </span>
                  <div className="flex items-center gap-5">
                    {/* Le fichier déposé par l'adhérent : consultable seulement par qui a
                        accès aux données de santé, et via une URL signée de courte durée. */}
                    {p.chemin && peut(profile.role, "sante") ? (
                      <a
                        href={`/${org.slug}/cockpit/adherents/${adherent.id}/piece/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono text-[11px] uppercase tracking-wide text-ink-soft underline underline-offset-2 hover:text-ink"
                      >
                        Consulter
                      </a>
                    ) : null}
                    <form action={basculerPiece.bind(null, org.slug, adherent.id, p.id, p.statut ?? "manquante")}>
                      <button
                        className="mono text-[11px] uppercase tracking-wide hover:underline"
                        style={{ color: estFournie(p.statut) ? "#1E7A4F" : "#8A6508" }}
                      >
                        {libellePiece(p.statut)}
                      </button>
                    </form>
                    {/* Reçue par email : le certificat est dans la boîte du club, pas dans
                        l'espace — le cas le plus courant en début de saison. */}
                    {!estFournie(p.statut) ? (
                      <form action={marquerPieceParEmail.bind(null, org.slug, adherent.id, p.id, p.statut ?? "manquante")}>
                        <button className="mono text-[11px] uppercase tracking-wide text-ink-soft hover:underline">
                          ✉ Par email
                        </button>
                      </form>
                    ) : null}
                  </div>
                  {/* Dépôt par un bénévole — promesse publique. Mêmes contrôles que le
                      dépôt adhérent (PDF/JPEG/PNG, 5 Mo, premiers octets). */}
                  <DepotPiece
                    action={deposerPieceCockpit.bind(null, org.slug, adherent.id, p.id)}
                    libelle={p.chemin ? "Remplacer le fichier" : "Déposer pour l’adhérent"}
                  />
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ——— SANTÉ (jamais le détail des réponses ; visible président + secrétaire) ——— */}
        {questionnaire && peut(profile.role, "sante") ? (
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

        {/* ——— RGPD : export et effacement (président + secrétaire) ——— */}
        {peut(profile.role, "adherents_ecriture") ? (
          <Rgpd
            slug={org.slug}
            adherentId={adherent.id}
            nom={`${adherent.prenom} ${adherent.nom}`}
            estPresident={profile.role === "admin_asso" || profile.role === "super_admin"}
          />
        ) : null}
      </div>
    </main>
  );
}
