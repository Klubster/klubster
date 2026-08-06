import { normaliserCouleur } from "@/lib/contraste";
import { Button } from "@/components/ui/Button";
import Link from "next/link";
import QRCode from "qrcode";
import { saisonCourante } from "@/lib/saison";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { deconnexion } from "@/app/connexion/actions";
import { updateInfos, uploadPiece } from "./actions";
import { formatPrix } from "@/lib/format";
import { texteAttestation, type QSType, type QSResultat } from "@/lib/sante";
import { libelleAdhesion, classeTexteAdhesion } from "@/components/ui/StatutBadge";

export const dynamic = "force-dynamic";

// S7 : la table locale des libellés est morte — libelleAdhesion (ui/StatutBadge) est
// LA source, la même que le cockpit. Plus jamais deux orthographes pour un statut.

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
  const accent = normaliserCouleur(org.couleur_primaire);

  const supabase = await createSupabaseServerClient();
  const { data: adherent } = await supabase
    .from("adherents").select("*").eq("user_id", user.id).eq("organisation_id", org.id).maybeSingle();

  if (!adherent) {
    return (
      <Shell org={org} accent={accent}>
        <h1 className="mt-6 text-3xl font-medium">Aucun dossier ici.</h1>
        <p className="mt-4 text-ink-soft">Ce compte n&apos;est pas rattaché à un adhérent de {org.nom}.</p>
        <Link href={`/${org.slug}/inscription`} className="mono mt-8 inline-block px-6 py-3 text-[13px] text-white" style={{ background: accent }}>S&apos;INSCRIRE →</Link>
      </Shell>
    );
  }

  const a = adherent as { id: string; prenom: string; nom: string; email: string | null; telephone: string | null; infos: Record<string, string> };
  const qrSvg = await QRCode.toString(a.id, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  // S7 : TOUTES les adhésions, plus seulement la dernière. Un adhérent inscrit à deux
  // cours voyait le paiement de l'un sous le nom de l'autre ; les saisons passées
  // disparaissaient. La saison courante s'affiche en premier, les autres se replient.
  const { data: adhesionsData } = await supabase
    .from("adhesions").select("id, statut, montant_centimes, mode_paiement, cours_id, saison")
    .eq("adherent_id", a.id).order("created_at", { ascending: false });
  const adhesions = (adhesionsData ?? []) as {
    id: string; statut: string | null; montant_centimes: number; mode_paiement: string | null;
    cours_id: string | null; saison: string | null;
  }[];
  const saison = saisonCourante(org);
  const courantes = adhesions.filter((x) => x.saison === saison);
  const anciennes = adhesions.filter((x) => x.saison !== saison);
  // L'adhésion « de référence » de la carte : la première de la saison courante,
  // sinon la plus récente — même logique que la fiche cockpit.
  const adhesion = courantes[0] ?? adhesions[0] ?? null;
  const coursIds = [...new Set(adhesions.map((x) => x.cours_id).filter((x): x is string => !!x))];
  const nomsCours = new Map<string, string>();
  if (coursIds.length > 0) {
    const { data: cs } = await supabase.from("cours").select("id, nom").in("id", coursIds);
    for (const c of (cs ?? []) as { id: string; nom: string }[]) nomsCours.set(c.id, c.nom);
  }
  const coursNom = adhesion?.cours_id ? nomsCours.get(adhesion.cours_id) ?? "" : "";
  const { data: piecesData } = await supabase
    .from("pieces_adherent").select("id, label, statut, obligatoire").eq("adherent_id", a.id).order("created_at");
  const pieces = (piecesData ?? []) as { id: string; label: string; statut: string; obligatoire: boolean | null }[];
  // RÈGLE PRODUIT (04/08/2026) : seules les pièces OBLIGATOIRES manquantes rendent
  // le dossier incomplet. Une facultative absente ne génère ni compteur ni relance.
  const manquantes = pieces.filter((p) => p.statut === "manquante" && p.obligatoire !== false).length;

  const { data: qsanteData } = await supabase
    .from("questionnaires_sante")
    .select("type, resultat, signataire_nom, signature, created_at")
    .eq("adherent_id", a.id).order("created_at", { ascending: false }).limit(1).maybeSingle();
  const qsante = qsanteData as
    | { type: QSType; resultat: QSResultat; signataire_nom: string | null; signature: string | null; created_at: string }
    | null;

  return (
    <Shell org={org} accent={accent} deconnexion>
      <p className="mono text-[12px] uppercase tracking-label text-ink-soft">MON ESPACE<span style={{ color: accent }}>_</span></p>
      <h1 className="mt-4 text-3xl font-medium md:text-4xl">Bonjour, {a.prenom}.</h1>
      {manquantes > 0 ? (
        <p className="mt-3">
          <a href="#pieces" className="text-ink underline decoration-line underline-offset-4 hover:decoration-ink">
            Il vous reste {manquantes} pièce{manquantes > 1 ? "s" : ""} à fournir →
          </a>
        </p>
      ) : (
        <p className="mt-3 text-ink-soft">Votre dossier est complet.</p>
      )}
      {/* CARTE DE MEMBRE — l'objet de la page, montré en premier : c'est elle qu'on
          ouvre à l'accueil pour l'appel. Inversée (bg-ink/text-paper), elle ressort
          sur les deux modes de thème puisque ink et paper permutent avec lui. */}
      <div className="mt-10">
        <p className="mono text-[12px] uppercase tracking-label text-ink-soft">CARTE DE MEMBRE<span style={{ color: accent }}>_</span></p>
        <div className="mt-4 bg-ink text-paper">
          <div aria-hidden style={{ background: accent, height: 3 }} />
          <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between md:p-8">
            <div className="min-w-0">
              <div className="mono text-[11px] uppercase tracking-label text-paper/60">{org.nom}</div>
              <div className="mt-2 text-2xl font-medium leading-tight">{a.prenom} {a.nom}</div>
              <div className="mono mt-1 text-[13px] uppercase tracking-wide text-paper/60">Saison {saisonCourante(org)}</div>
              {/* S7 : une place en liste d'attente ou une adhésion annulée n'est pas une
                  carte valide — le dire ICI, avant que l'adhérent la présente à l'accueil. */}
              {adhesion?.statut === "liste_attente" ? (
                <p className="mono mt-5 max-w-[36ch] text-[12px] uppercase leading-relaxed tracking-wide text-paper/80">
                  ⏳ En liste d’attente — votre carte s’activera dès qu’une place se libère.
                </p>
              ) : adhesion?.statut === "annule" ? (
                <p className="mono mt-5 max-w-[36ch] text-[12px] uppercase leading-relaxed tracking-wide text-paper/80">
                  Adhésion annulée — cette carte n’est plus active.
                </p>
              ) : (
                <p className="mono mt-5 max-w-[36ch] text-[12px] leading-relaxed text-paper/50">
                  Présentez ce code à l&apos;accueil pour l&apos;appel.
                </p>
              )}
              <Link
                href={`/${org.slug}/espace/facture`}
                className="mono mt-5 inline-block border border-paper/40 px-4 py-2 text-[13px] hover:bg-paper hover:text-ink"
              >
                VOIR MON REÇU →
              </Link>
            </div>
            {/* QR généré sur notre serveur : l'identifiant de l'adhérent n'a rien à faire
                chez un service tiers, et la carte s'affiche même sans réseau extérieur.
                Cadre blanc garanti : lisible au scan quel que soit le thème du club. */}
            <div
              className="h-[166px] w-[166px] shrink-0 self-center bg-white p-2 [&>svg]:h-full [&>svg]:w-full"
              aria-label="QR de membre"
              role="img"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>
        </div>
      </div>
      {/* ADHÉSION — S7 : une adhésion = trois repères ; plusieurs = une ligne par cours,
          chacune avec SON règlement. Le statut porte la teinte sémantique (succès/attente/
          retard), jamais la couleur du club : elle décore, elle ne juge pas. */}
      <div className="mt-12">
        <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
          {courantes.length > 1 ? <>MES ADHÉSIONS — SAISON {saison}</> : <>MON ADHÉSION</>}
          <span style={{ color: accent }}>_</span>
        </p>
        {courantes.length > 1 ? (
          <div className="mt-4 divide-y divide-line border border-line bg-paper">
            {courantes.map((x) => (
              <div key={x.id} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                <span className="text-[15px] font-medium">{(x.cours_id && nomsCours.get(x.cours_id)) || "Cours"}</span>
                <span className="mono text-[13px]">
                  {formatPrix(x.montant_centimes)}
                  <span className={`ml-3 uppercase tracking-wide ${classeTexteAdhesion(x.statut)}`}>
                    {libelleAdhesion(x.statut)}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
            <Kpi label="COURS" value={coursNom || "—"} />
            <Kpi label="COTISATION" value={adhesion ? formatPrix(adhesion.montant_centimes) : "—"} />
            <Kpi
              label="RÈGLEMENT"
              value={adhesion ? libelleAdhesion(adhesion.statut) : "—"}
              classe={adhesion ? classeTexteAdhesion(adhesion.statut) : undefined}
            />
          </div>
        )}
        {anciennes.length > 0 ? (
          // Repliées sans JavaScript : l'historique rassure sans encombrer.
          <details className="mt-3 border border-line bg-paper">
            <summary className="mono cursor-pointer px-5 py-3 text-[12px] uppercase tracking-label text-ink-soft hover:text-ink">
              Saisons précédentes ({anciennes.length})
            </summary>
            <div className="divide-y divide-line border-t border-line">
              {anciennes.map((x) => (
                <div key={x.id} className="flex flex-col gap-1 px-5 py-3 text-ink-soft sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="text-[14px]">
                    {(x.cours_id && nomsCours.get(x.cours_id)) || "Cours"}
                    <span className="mono ml-2 text-[11px] uppercase">{x.saison ?? "—"}</span>
                  </span>
                  <span className="mono text-[12px] uppercase tracking-wide">{libelleAdhesion(x.statut)}</span>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
      {/* INFOS */}
      <div className="mt-12">
        <p className="mono text-[12px] uppercase tracking-label text-ink-soft">MES INFORMATIONS<span style={{ color: accent }}>_</span></p>
        <form action={updateInfos.bind(null, org.slug, a.id)} className="mt-4 border border-line bg-paper">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
            <Champ label="EMAIL" name="email" type="email" defaultValue={a.email ?? ""} />
            <Champ label="TÉLÉPHONE" name="tel" type="tel" defaultValue={a.telephone ?? ""} />
          </div>
          {Object.keys(a.infos ?? {}).length > 0 ? (
            <div className="divide-y divide-line border-t border-line">
              {/* Certaines clés sont longues (« Autorisation — … ») : on empile sur
                  téléphone au lieu d'écraser les deux colonnes l'une contre l'autre. */}
              {Object.entries(a.infos).map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 px-5 py-3 text-[14px] sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
                  <span className="min-w-0 break-words text-ink-soft">{k}</span>
                  <span className="min-w-0 break-words sm:text-right">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : null}
          <div className="border-t border-line px-5 py-3">
            <Button compact className="text-[13px]">ENREGISTRER →</Button>
          </div>
        </form>
      </div>
      {/* PIÈCES */}
      {pieces.length > 0 ? (
        <div className="mt-12" id="pieces">
          <p className="mono text-[12px] uppercase tracking-label text-ink-soft">MES PIÈCES<span style={{ color: accent }}>_</span></p>
          <div className="mt-4 divide-y divide-line border border-line bg-paper">
            {pieces.map((p) => (
              // Une ligne = une pièce. Sur téléphone, le libellé au-dessus et les
              // actions en dessous : l'input fichier natif débordait de l'écran.
              <div key={p.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:gap-4">
                <span className="flex-1 text-[15px]">
                  {p.label}
                  {p.obligatoire === false ? <span className="mono ml-2 text-[11px] uppercase text-ink-faint">Facultative</span> : null}
                </span>
                {/* Une pièce fournie reste remplaçable : mauvaise photo, mauvais scan,
                    certificat mis à jour — deux dépôts font deux objets, rien n'est
                    écrasé, la fiche pointe simplement vers le dernier. */}
                {p.statut === "fournie" || p.statut === "par_email" ? (
                  <span className="mono text-[13px]" style={{ color: accent }}>
                    {p.statut === "par_email" ? "✉ REÇUE PAR EMAIL" : "✓ FOURNIE"}
                  </span>
                ) : null}
                {p.statut !== "par_email" ? (
                  <form action={uploadPiece.bind(null, org.slug)} className="flex min-w-0 flex-wrap items-center gap-2">
                    <input type="hidden" name="pieceId" value={p.id} />
                    <input
                      type="file"
                      name="file"
                      accept="application/pdf,image/png,image/jpeg"
                      className="mono w-full max-w-[240px] text-[12px] text-ink-soft file:mr-2 file:cursor-pointer file:border file:border-line file:bg-transparent file:px-3 file:py-1.5 file:font-[inherit] file:text-[12px] file:text-ink"
                    />
                    <Button variant="secondary" compact className="px-3 py-1.5">{p.statut === "fournie" ? "REMPLACER" : "DÉPOSER"}</Button>
                  </form>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
      {/* QUESTIONNAIRE DE SANTÉ */}
      {qsante ? (
        <div className="mt-12">
          <p className="mono text-[12px] uppercase tracking-label text-ink-soft">QUESTIONNAIRE DE SANTÉ<span style={{ color: accent }}>_</span></p>
          <div className="mt-4 border border-line bg-paper px-5 py-5" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
            <p className="text-[14px] leading-relaxed">{texteAttestation(qsante.type, qsante.resultat)}</p>
            <div className="mono mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[12px] text-ink-soft">
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
    </Shell>
  );
}

function Shell({ org, accent, deconnexion: withLogout, children }: { org: { slug: string; nom: string }; accent: string; deconnexion?: boolean; children: React.ReactNode }) {
  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono min-w-0 truncate text-[13px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <div className="flex shrink-0 items-center gap-5">
          {/* Sur téléphone, le nom du club à gauche suffit : le kicker redondant
              poussait le bouton de déconnexion hors de l'écran. */}
          <span className="mono hidden text-[12px] uppercase tracking-label text-ink-soft sm:inline">ESPACE ADHÉRENT<span style={{ color: accent }}>_</span></span>
          {withLogout ? (
            <form action={deconnexion}>
              <button className="mono text-[12px] uppercase tracking-label text-ink-soft hover:text-ink">DÉCONNEXION</button>
            </form>
          ) : null}
        </div>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
        {children}
        <div className="mt-14 border-t border-line pt-6">
          <Link href={`/${org.slug}/installer`} className="mono text-[13px] text-ink-soft hover:text-ink">
            Installer l&apos;app sur mon téléphone →
          </Link>
        </div>
      </div>
    </main>
  );
}

// S7 : le Kpi prend une CLASSE sémantique (text-success/warning/danger), plus la couleur
// du club — « Payé » en couleur d'accent laissait croire que le vert du thème jugeait.
function Kpi({ label, value, classe }: { label: string; value: string; classe?: string }) {
  return (
    <div className="bg-paper px-5 py-5">
      <div className="mono text-[11px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className={`mt-2 text-[18px] font-medium ${classe ?? ""}`}>{value}</div>
    </div>
  );
}

function Champ({ label, name, type, defaultValue }: { label: string; name: string; type: string; defaultValue: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input name={name} type={type} defaultValue={defaultValue} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
    </div>
  );
}
