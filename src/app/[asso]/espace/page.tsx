import Link from "next/link";
import QRCode from "qrcode";
import { saisonCourante } from "@/lib/saison";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deconnexion } from "@/app/connexion/actions";
import { updateInfos, marquerPieceEmail, uploadPiece } from "./actions";
import { formatPrix } from "@/lib/format";
import { texteAttestation, type QSType, type QSResultat } from "@/lib/sante";

export const dynamic = "force-dynamic";

const STATUT_LABEL: Record<string, string> = {
  paye: "Payé", en_attente: "En attente", en_retard: "En retard", rembourse: "Remboursé", annule: "Annulé",
};

export default async function EspacePage(props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;

  // Connexion d'ABORD : `getOrganisationBySlug` fait un select("*") que la
  // restriction des colonnes publiques (migration 0015) refuse à un visiteur
  // anonyme — l'org revenait null et la page répondait « introuvable » au lieu
  // de renvoyer vers la connexion (lien « OUVRIR MON ESPACE » des emails,
  // constaté le 24/07/2026).
  const user = await getUser();
  if (!user) redirect(`/connexion?next=/${params.asso}/espace`);

  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const accent = org.couleur_primaire ?? "#111111";

  const supabase = await createSupabaseServerClient();
  const { data: adherent } = await supabase
    .from("adherents").select("*").eq("user_id", user.id).eq("organisation_id", org.id).maybeSingle();

  if (!adherent) {
    return (
      <Shell org={org} accent={accent}>
        <h1 className="mt-6 text-3xl font-medium">Aucun dossier ici.</h1>
        <p className="mt-4 text-ink-soft">Ce compte n&apos;est pas rattaché à un adhérent de {org.nom}.</p>
        <Link href={`/${org.slug}/inscription`} className="mono mt-8 inline-block px-6 py-3 text-[12px] text-white" style={{ background: accent }}>S&apos;INSCRIRE →</Link>
      </Shell>
    );
  }

  const a = adherent as { id: string; prenom: string; nom: string; email: string | null; telephone: string | null; infos: Record<string, string> };
  const qrSvg = await QRCode.toString(a.id, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const { data: adhesion } = await supabase
    .from("adhesions").select("id, statut, montant_centimes, mode_paiement, cours_id")
    .eq("adherent_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  let coursNom = "";
  if (adhesion?.cours_id) {
    const { data: c } = await supabase.from("cours").select("nom").eq("id", adhesion.cours_id).maybeSingle();
    coursNom = (c as { nom?: string } | null)?.nom ?? "";
  }
  const { data: piecesData } = await supabase
    .from("pieces_adherent").select("id, label, statut").eq("adherent_id", a.id).order("created_at");
  const pieces = (piecesData ?? []) as { id: string; label: string; statut: string }[];
  const manquantes = pieces.filter((p) => p.statut === "manquante").length;

  const { data: qsanteData } = await supabase
    .from("questionnaires_sante")
    .select("type, resultat, signataire_nom, signature, created_at")
    .eq("adherent_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const qsante = qsanteData as
    | { type: QSType; resultat: QSResultat; signataire_nom: string | null; signature: string | null; created_at: string }
    | null;

  return (
    <Shell org={org} accent={accent} deconnexion>
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MON ESPACE<span style={{ color: accent }}>_</span></p>
      <h1 className="mt-4 text-3xl font-medium md:text-4xl">Bonjour, {a.prenom}.</h1>
      <p className="mt-3 text-ink-soft">
        {manquantes > 0 ? `Il vous reste ${manquantes} pièce${manquantes > 1 ? "s" : ""} à fournir.` : "Votre dossier est complet."}
      </p>
      {/* DOSSIER */}
      <div className="mt-12 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-3">
        <Kpi label="COURS" value={coursNom || "—"} />
        <Kpi label="COTISATION" value={adhesion ? formatPrix(adhesion.montant_centimes) : "—"} />
        <Kpi label="RÈGLEMENT" value={adhesion ? (STATUT_LABEL[adhesion.statut] ?? adhesion.statut) : "—"} accent={adhesion?.statut === "paye" ? accent : undefined} />
      </div>
      {/* INFOS */}
      <div className="mt-12">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MES INFORMATIONS<span style={{ color: accent }}>_</span></p>
        <form action={updateInfos.bind(null, org.slug, a.id)} className="mt-4 border border-line bg-paper">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
            <Champ label="EMAIL" name="email" type="email" defaultValue={a.email ?? ""} />
            <Champ label="TÉLÉPHONE" name="tel" type="tel" defaultValue={a.telephone ?? ""} />
          </div>
          {Object.keys(a.infos ?? {}).length > 0 ? (
            <div className="divide-y divide-line border-t border-line">
              {Object.entries(a.infos).map(([k, v]) => (
                <div key={k} className="flex items-baseline justify-between gap-4 px-5 py-3 text-[14px]">
                  <span className="text-ink-soft">{k}</span><span>{String(v)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="border-t border-line px-5 py-3">
            <button className="mono bg-ink px-5 py-2.5 text-[12px] text-paper hover:bg-ink/90">ENREGISTRER →</button>
          </div>
        </form>
      </div>
      {/* PIÈCES */}
      {pieces.length > 0 ? (
        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">MES PIÈCES<span style={{ color: accent }}>_</span></p>
          <div className="mt-4 divide-y divide-line border border-line bg-paper">
            {pieces.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                <span className="flex-1 text-[15px]">{p.label}</span>
                {p.statut === "fournie" ? (
                  <span className="mono text-[12px]" style={{ color: accent }}>✓ FOURNIE</span>
                ) : p.statut === "par_email" ? (
                  <span className="mono text-[11px] text-ink-soft">ENVOYÉE PAR EMAIL</span>
                ) : (
                  <>
                    <form action={uploadPiece.bind(null, org.slug)} className="flex items-center gap-2">
                      <input type="hidden" name="pieceId" value={p.id} />
                      <input type="file" name="file" className="text-[12px]" />
                      <button className="mono border border-ink px-3 py-1.5 text-[11px] hover:bg-ink hover:text-paper">TÉLÉVERSER</button>
                    </form>
                    <form action={marquerPieceEmail.bind(null, org.slug, p.id)}>
                      <button className="mono text-[11px] text-ink-soft hover:text-ink">ou par email</button>
                    </form>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* QUESTIONNAIRE DE SANTÉ */}
      {qsante ? (
        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">QUESTIONNAIRE DE SANTÉ<span style={{ color: accent }}>_</span></p>
          <div className="mt-4 border border-line bg-paper px-5 py-5" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
            <p className="text-[14px] leading-relaxed">{texteAttestation(qsante.type, qsante.resultat)}</p>
            <div className="mono mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-ink-soft">
              <span>{qsante.type === "mineur" ? "MINEUR" : "MAJEUR"}</span>
              {qsante.signataire_nom ? <span>SIGNÉ : {qsante.signataire_nom}</span> : null}
              <span>{new Date(qsante.created_at).toLocaleDateString("fr-FR")}</span>
            </div>
            {qsante.signature ? (
              // eslint-disable-next-line @next/next/no-img-element
              (<img src={qsante.signature} alt="Signature" width={220} height={90} className="mt-3 border border-line bg-white" />)
            ) : null}
          </div>
        </div>
      ) : null}
      {/* CARTE / QR */}
      <div className="mt-12">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">CARTE DE MEMBRE<span style={{ color: accent }}>_</span></p>
        <div className="mt-4 flex flex-col items-start gap-6 border border-line bg-paper p-6 sm:flex-row sm:items-center">
          {/* QR généré sur notre serveur : l'identifiant de l'adhérent n'a rien à faire
              chez un service tiers, et la carte s'affiche même sans réseau extérieur. */}
          <div
            className="h-[150px] w-[150px] border border-line [&>svg]:h-full [&>svg]:w-full"
            aria-label="QR de membre"
            role="img"
            dangerouslySetInnerHTML={{ __html: qrSvg }}
          />
          <div>
            <div className="text-lg font-medium">{a.prenom} {a.nom}</div>
            <div className="text-ink-soft">{org.nom} · Saison {saisonCourante(org)}</div>
            <p className="mono mt-3 text-[11px] text-ink-faint">Présentez ce code à l&apos;accueil pour l&apos;appel.</p>
            <Link href={`/${org.slug}/espace/facture`} className="mono mt-4 inline-block border border-ink px-4 py-2 text-[12px] hover:bg-ink hover:text-paper">VOIR MON REÇU →</Link>
          </div>
        </div>
      </div>
    </Shell>
  );
}

function Shell({ org, accent, deconnexion: withLogout, children }: { org: { slug: string; nom: string }; accent: string; deconnexion?: boolean; children: React.ReactNode }) {
  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <div className="flex items-center gap-5">
          <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ESPACE ADHÉRENT<span style={{ color: accent }}>_</span></span>
          {withLogout ? (
            <form action={deconnexion}>
              <button className="mono text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">DÉCONNEXION</button>
            </form>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
        {children}
        <div className="mt-14 border-t border-line pt-6">
          <Link href={`/${org.slug}/installer`} className="mono text-[12px] text-ink-soft hover:text-ink">
            Installer l&apos;app sur mon téléphone →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-paper px-5 py-5">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mt-2 text-[18px] font-medium" style={accent ? { color: accent } : undefined}>{value}</div>
    </div>
  );
}

function Champ({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
    </div>
  );
}
