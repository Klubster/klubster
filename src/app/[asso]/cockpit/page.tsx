import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCockpitStats, getCoursByOrganisation, getAujourdhui } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { deconnexion } from "@/app/connexion/actions";
import { connecterStripe, definirEcheancesMax, souscrireAbonnement, gererAbonnement } from "./stripe-actions";
import { palierPourEffectif, PALIERS, JOURS_ESSAI, stripeModeTest, stripeCleCoherente } from "@/lib/stripe";
import { compteConnecte, statutAbonnement } from "@/lib/stripe-org";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function Cockpit({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { stripe?: string; bienvenue?: string; abonnement?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  const profile = await getProfile();
  const autorise = profile && (profile.organisation_id === org.id || profile.role === "super_admin");
  if (!autorise) redirect(`/connexion?next=/${org.slug}/cockpit`);

  const [s, auj, cours] = await Promise.all([
    getCockpitStats(org.slug),
    getAujourdhui(org.id),
    getCoursByOrganisation(org.id),
  ]);

  const prenom = profile?.prenom?.trim();
  const stripeConnecte = !!compteConnecte(org);
  const connecterAvecSlug = connecterStripe.bind(null, org.slug);
  const definirEcheancesAvecSlug = definirEcheancesMax.bind(null, org.slug);
  const souscrireAvecSlug = souscrireAbonnement.bind(null, org.slug);
  const gererAvecSlug = gererAbonnement.bind(null, org.slug);

  // Abonnement Klubster — état lisible pour un bénévole, pas du vocabulaire Stripe.
  const abo = statutAbonnement(org);
  const palier = palierPourEffectif(s.equipage);
  const prixMensuel = PALIERS[palier];
  const finEssai = org.abonnement_essai_fin
    ? new Date(org.abonnement_essai_fin).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : null;

  // Heure et jour à Paris — le cockpit parle du réel.
  const maintenant = new Date();
  const heure = Number(maintenant.toLocaleString("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", hour12: false }));
  const salut = heure >= 18 || heure < 4 ? "Bonsoir" : "Bonjour";
  const jourSemaine = maintenant.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long" });
  const dateLongue = maintenant.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris", weekday: "long", day: "numeric", month: "long" });

  // Cours du jour (créneaux réels).
  const coursCeSoir = cours
    .flatMap((c) => (c.creneaux ?? []).filter((k) => k.jour === jourSemaine).map((k) => ({ nom: c.nom, debut: k.debut, fin: k.fin })))
    .sort((a, b) => (a.debut < b.debut ? -1 : 1));

  // L'état du club, en une phrase.
  const attention = s.enAttente + s.enRetard + auj.piecesAttendues;
  const titre =
    attention === 0
      ? "Le club est prêt."
      : `${attention} chose${attention > 1 ? "s" : ""} mérite${attention > 1 ? "nt" : ""} votre attention.`;
  const sousTitre =
    attention === 0
      ? coursCeSoir.length > 0
        ? `Tout est à jour pour ${coursCeSoir.length > 1 ? "les cours" : "le cours"} de ce ${jourSemaine}.`
        : "Tous les dossiers sont à jour."
      : "Le détail est juste en dessous — rien ne prend plus de quelques minutes.";

  const NAV: { n: string; label: string; href: string; actif?: boolean }[] = [
    { n: "01", label: "AUJOURD'HUI", href: `/${org.slug}/cockpit`, actif: true },
    { n: "02", label: "INSCRIPTIONS", href: `/${org.slug}/cockpit/formulaire` },
    // « Contrôle » et non « Présences » : le scan vérifie l'inscription, la cotisation
    // et le dossier — la feuille d'appel n'en est qu'un des usages.
    { n: "03", label: "CONTRÔLE", href: `/${org.slug}/cockpit/scanner` },
    { n: "04", label: "PAIEMENTS", href: `/${org.slug}/cockpit/paiements` },
    { n: "05", label: "MESSAGES", href: `/${org.slug}/cockpit/communication` },
    { n: "06", label: "ACTUALITÉ", href: `/${org.slug}/cockpit/actualite` },
    { n: "07", label: "SITE", href: `/${org.slug}` },
  ];

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <div className="flex min-w-0 items-center gap-5">
          <span className="mono hidden truncate text-[11px] uppercase tracking-label text-ink-soft sm:block">{org.nom}</span>
          <form action={deconnexion}>
            <button className="mono whitespace-nowrap text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">DÉCONNEXION</button>
          </form>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
        {/* Nav : colonne sur desktop, rail horizontal scrollable sur mobile */}
        <nav className="flex gap-5 overflow-x-auto border-b border-line px-6 py-4 md:block md:border-b-0 md:border-r md:px-7 md:py-6">
          {NAV.map((item) => (
            <Link
              key={item.n}
              href={item.href}
              className={`mono whitespace-nowrap py-[10px] text-[12px] tracking-wide md:block ${item.actif ? "font-bold text-ink" : "text-ink-soft hover:text-ink"}`}
            >
              {item.n} {item.label}
              {item.actif ? <Cur /> : <span className="text-ink-faint">_</span>}
            </Link>
          ))}
          <div className="mono mt-6 hidden border-t border-line pt-5 md:block">
            <div className="text-[10px] uppercase tracking-label text-ink-soft">TRÉSORERIE</div>
            <div className="mt-2 text-[12px] text-brand">✓ reversée direct</div>
            <div className="mt-0.5 text-[11px] text-ink-faint">0 % commission</div>
          </div>
        </nav>

        <div>
          {/* L'ÉTAT DU CLUB — une phrase, pas un tableau de bord */}
          <div className="border-b border-line px-6 py-10 md:px-10 md:py-14">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              {salut.toUpperCase()}{prenom ? `, ${prenom.toUpperCase()}` : ""} · {dateLongue.toUpperCase()}<Cur />
            </p>
            <h1 className="mt-6 max-w-[22ch] text-[30px] font-medium leading-[1.1] tracking-[-0.01em] md:text-[38px]">
              {titre}
            </h1>
            <p className="mt-4 max-w-prose text-lg text-ink-soft">{sousTitre}</p>
          </div>

          {/* PREMIERS PAS — accompagnement de la première connexion. Visible tant que
              le club n'a aucun adhérent : dès que la vie du club commence, il s'efface
              (filtre « 18h » : ne montrer que ce qui sert ce soir). Liste volontairement
              extensible — les étapes suivantes s'ajouteront après les tests de Mathieu. */}
          {s.equipage === 0 ? (
            <div className="border-b border-line bg-bg-alt px-6 py-8 md:px-10">
              {searchParams?.bienvenue ? (
                <p className="mono text-[12px] text-brand">
                  ✓ Votre club est en ligne sur klubster.fr/{org.slug}{" "}
                  <Link href={`/${org.slug}`} className="ml-2 underline underline-offset-2 hover:text-ink">
                    VOIR MON SITE →
                  </Link>
                </p>
              ) : null}
              <p className={`mono text-[11px] uppercase tracking-label text-ink-soft ${searchParams?.bienvenue ? "mt-6" : ""}`}>
                PREMIERS PAS<Cur />
              </p>
              <div className="mt-5 divide-y divide-line border border-line bg-paper">
                {(() => {
                  const fc = org.form_config;
                  const formulaireConfigure =
                    (fc?.pages?.length ?? 0) > 0 ||
                    (fc?.pieces?.length ?? 0) > 0 ||
                    (fc?.mineur?.autorisations?.length ?? 0) > 0;
                  return (
                    <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-[16px] font-medium">
                          <span className="mono mr-2 text-[12px] text-brand">{formulaireConfigure ? "✓" : "01"}</span>
                          Construisez votre fiche d&apos;inscription personnalisée.
                        </p>
                        <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                          Les champs à remplir, les pièces à demander, les autorisations :
                          c&apos;est ce que verront vos adhérents avant même la salle.
                        </p>
                      </div>
                      <Link
                        href={`/${org.slug}/cockpit/formulaire`}
                        className={`mono shrink-0 px-5 py-3 text-center text-[12px] ${formulaireConfigure ? "border border-line text-ink hover:border-ink" : "bg-brand-dark text-white hover:opacity-90"}`}
                      >
                        {formulaireConfigure ? "REVOIR →" : "CONFIGURER →"}
                      </Link>
                    </div>
                  );
                })()}
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-medium">
                      <span className="mono mr-2 text-[12px] text-brand">02</span>
                      Remplissez votre équipe.
                    </p>
                    <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                      Trésorier, secrétaire, encadrant : chacun son accès au cockpit —
                      fini le mot de passe qui circule.
                    </p>
                  </div>
                  <Link
                    href={`/${org.slug}/cockpit/equipe`}
                    className="mono shrink-0 border border-line px-5 py-3 text-center text-[12px] text-ink hover:border-ink"
                  >
                    INVITER →
                  </Link>
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-medium">
                      <span className="mono mr-2 text-[12px] text-brand">{stripeConnecte ? "✓" : "03"}</span>
                      Connectez Stripe.
                    </p>
                    <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                      Les cotisations en ligne arrivent directement sur le compte du club —
                      0 % de commission Klubster.
                    </p>
                  </div>
                  <a
                    href="#paiements"
                    className={`mono shrink-0 px-5 py-3 text-center text-[12px] ${stripeConnecte ? "border border-line text-ink hover:border-ink" : "border border-ink text-ink hover:bg-ink hover:text-paper"}`}
                  >
                    {stripeConnecte ? "VOIR →" : "CONNECTER →"}
                  </a>
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-medium">
                      <span className="mono mr-2 text-[12px] text-brand">04</span>
                      Personnalisez votre site.
                    </p>
                    <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                      Mot du président, photos, questions fréquentes — et votre logo,
                      police et couleurs dans Identité.
                    </p>
                  </div>
                  <Link
                    href={`/${org.slug}?edition=1`}
                    className="mono shrink-0 border border-line px-5 py-3 text-center text-[12px] text-ink hover:border-ink"
                  >
                    ÉDITER →
                  </Link>
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-medium">
                      <span className="mono mr-2 text-[12px] text-brand">{org.domaine_custom ? "✓" : "05"}</span>
                      Un nom de domaine ? Connectez-le.
                    </p>
                    <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                      Votre site vit sur klubster.fr/{org.slug} — il peut aussi répondre
                      sur votre propre adresse (monclub.fr).
                    </p>
                  </div>
                  <Link
                    href={`/${org.slug}/cockpit/domaine`}
                    className="mono shrink-0 border border-line px-5 py-3 text-center text-[12px] text-ink hover:border-ink"
                  >
                    {org.domaine_custom ? "VOIR →" : "CONNECTER →"}
                  </Link>
                </div>
                <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[16px] font-medium">
                      <span className="mono mr-2 text-[12px] text-brand">06</span>
                      Importez vos adhérents.
                    </p>
                    <p className="mt-1.5 max-w-prose text-[14px] text-ink-soft">
                      Depuis votre tableur (fichier CSV) : Klubster fait correspondre vos
                      colonnes aux siennes, vous vérifiez avant d&apos;enregistrer.
                    </p>
                  </div>
                  <Link
                    href={`/${org.slug}/cockpit/adherents/import`}
                    className="mono shrink-0 border border-line px-5 py-3 text-center text-[12px] text-ink hover:border-ink"
                  >
                    IMPORTER →
                  </Link>
                </div>
              </div>
            </div>
          ) : null}

          {/* LE CLUB AUJOURD'HUI — l'essentiel en 3 secondes */}
          <div className="border-b border-line px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE CLUB AUJOURD&apos;HUI<Cur /></p>
            <div className="mt-5">
              <Point etat={auj.nouvelles7j > 0 ? "ok" : "neutre"}>
                {auj.nouvelles7j > 0 ? (
                  <>{auj.nouvelles7j} nouvelle{auj.nouvelles7j > 1 ? "s" : ""} inscription{auj.nouvelles7j > 1 ? "s" : ""} cette semaine</>
                ) : (
                  <>Pas de nouvelle inscription cette semaine</>
                )}
              </Point>
              <Point etat={s.enRetard > 0 ? "urgent" : "ok"}>
                {s.enRetard > 0 ? (
                  <>{s.enRetard} cotisation{s.enRetard > 1 ? "s" : ""} en retard</>
                ) : s.enAttente > 0 ? (
                  <>Aucune cotisation en retard</>
                ) : (
                  <>Tous les paiements sont à jour</>
                )}
              </Point>
              <Point etat={s.enAttente > 0 ? "attention" : "ok"}>
                {s.enAttente > 0 ? (
                  <>{s.enAttente} dossier{s.enAttente > 1 ? "s" : ""} en attente de règlement</>
                ) : (
                  <>Aucun dossier en attente</>
                )}
              </Point>
              {auj.piecesAttendues > 0 ? (
                <Point etat="attention">
                  {auj.piecesAttendues} pièce{auj.piecesAttendues > 1 ? "s" : ""} de dossier attendue{auj.piecesAttendues > 1 ? "s" : ""}
                </Point>
              ) : null}
              {coursCeSoir.length > 0 ? (
                <Point etat="neutre">
                  Ce {jourSemaine} : {coursCeSoir.map((c) => `${c.nom} ${c.debut}–${c.fin}`).join(" · ")}
                </Point>
              ) : null}
            </div>
          </div>

          {/* À FAIRE — l'action avant la statistique */}
          <div className="grid grid-cols-1 gap-px border-b border-line bg-line sm:grid-cols-3">
            <Carte
              n={String(s.enAttente)}
              label={`DOSSIER${s.enAttente > 1 ? "S" : ""} À TERMINER`}
              href={`/${org.slug}/cockpit/paiements`}
              action="OUVRIR"
              vide={s.enAttente === 0}
            />
            <Carte
              n={String(s.enRetard)}
              label={`COTISATION${s.enRetard > 1 ? "S" : ""} À RELANCER`}
              href={`/${org.slug}/cockpit/communication`}
              action="RELANCER"
              vide={s.enRetard === 0}
            />
            <Carte
              n={String(auj.nouvelles7j)}
              label={`INSCRIPTION${auj.nouvelles7j > 1 ? "S" : ""} · 7 JOURS`}
              href={`/${org.slug}/cockpit/paiements`}
              action="VÉRIFIER"
              vide={auj.nouvelles7j === 0}
            />
          </div>

          {/* PAIEMENTS / STRIPE */}
          <div id="paiements" className="border-b border-line px-6 py-7 md:px-10">
            {/* Retours de l'abonnement Klubster. Sans ces messages, un échec de
                souscription rechargeait la page à l'identique : le bouton semblait
                ne rien faire (constaté par Mathieu, 15/07/2026). */}
            {searchParams?.abonnement === "ok" ? (
              <p className="mono mb-5 text-[12px] text-brand">
                ✓ Abonnement souscrit. Votre facture est disponible dans le portail Stripe.
              </p>
            ) : searchParams?.abonnement === "annule" ? (
              <p className="mono mb-5 text-[12px] text-ink-soft">
                Souscription abandonnée — vous pourrez la reprendre quand vous voudrez.
              </p>
            ) : searchParams?.abonnement === "nonconfig" ? (
              <p className="mono mb-5 text-[12px]" style={{ color: "#B23B3B" }}>
                Les paiements ne sont pas encore activés côté plateforme. Écrivez-nous, nous réglons ça.
              </p>
            ) : searchParams?.abonnement === "aucun" ? (
              <p className="mono mb-5 text-[12px] text-ink-soft">
                Aucun abonnement en cours pour l&apos;instant.
              </p>
            ) : searchParams?.abonnement === "codeinconnu" ? (
              <p className="mono mb-5 text-[12px]" style={{ color: "#B23B3B" }}>
                Ce code promo n&apos;est pas reconnu (ou n&apos;est plus actif). Vérifiez la saisie, ou laissez le champ vide.
              </p>
            ) : searchParams?.abonnement === "erreur" ? (
              <p className="mono mb-5 text-[12px]" style={{ color: "#B23B3B" }}>
                La souscription n&apos;a pas pu démarrer. Réessayez dans un instant ; si cela persiste, écrivez-nous.
              </p>
            ) : null}
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENTS<Cur /></p>
            {/* Aucun euro réel ne circule en mode test : il faut le dire, gros, avant que
                quelqu'un croie avoir encaissé une cotisation. */}
            {stripeModeTest ? (
              <p
                className="mono mb-6 border px-4 py-3 text-[11px] uppercase tracking-label"
                style={{ borderColor: "#8A6508", color: "#8A6508" }}
              >
                ⚠ Stripe en mode test — aucun paiement réel.
                {!stripeCleCoherente() ? " La clé configurée ne correspond pas au mode : vérifiez les variables d’environnement." : ""}
              </p>
            ) : null}

            {/* ABONNEMENT KLUBSTER — distinct des cotisations. Un bénévole confond vite les deux. */}
            <div className="mb-8 border-b border-line pb-8">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                VOTRE ABONNEMENT KLUBSTER<Cur />
              </p>

              {abo === "aucun" || abo === "resilie" ? (
                <div className="mt-4">
                  <p className="max-w-prose text-[15px] text-ink-soft">
                    <span className="text-ink">Le premier mois est offert — sans carte bancaire.</span> Ensuite{" "}
                    {(prixMensuel.prixCentimes / 100).toLocaleString("fr-FR")} € par mois — {prixMensuel.libelle.toLowerCase()}.
                    Sans engagement, résiliable en un clic.
                  </p>
                  {/* Le code se saisit ICI, pas sur la page de paiement : la réduction
                      est déjà appliquée quand le président arrive chez Stripe. */}
                  <form action={souscrireAvecSlug} className="mt-5 flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      name="code"
                      placeholder="Code promo (facultatif)"
                      spellCheck={false}
                      autoComplete="off"
                      className="mono w-52 border border-line bg-paper px-3 py-3 text-[12px] uppercase outline-none placeholder:normal-case focus:border-ink"
                    />
                    <button className="mono whitespace-nowrap bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                      COMMENCER LE MOIS OFFERT →
                    </button>
                  </form>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-prose text-[15px]">
                    {abo === "essai" ? (
                      <>
                        <span className="mono text-brand">✓</span> Mois offert en cours
                        {finEssai ? <> — premier prélèvement le {finEssai}.</> : "."}
                      </>
                    ) : abo === "actif" ? (
                      <>
                        <span className="mono text-brand">✓</span> Abonnement actif —{" "}
                        {(prixMensuel.prixCentimes / 100).toLocaleString("fr-FR")} € par mois. Votre facture
                        vous est envoyée chaque mois par email.
                      </>
                    ) : (
                      <span style={{ color: "#B23B3B" }}>
                        Dernier paiement refusé. Mettez à jour votre carte pour éviter la coupure.
                      </span>
                    )}
                  </p>
                  <form action={gererAvecSlug}>
                    <button className="mono whitespace-nowrap border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper">
                      FACTURES & RÉSILIATION →
                    </button>
                  </form>
                </div>
              )}
            </div>

            {stripeConnecte ? (
              <>
                <p className="mt-4 text-[15px]">
                  <span className="mono text-brand">✓</span> Stripe connecté. Les cotisations arrivent
                  directement sur le compte du club — <span className="mono">{formatPrix(s.tresorerieCentimes)}</span> encaissés cette saison,
                  0 % de commission.
                </p>

                {/* Le club fixe le plafond ; l'adhérent choisit dans cette limite. */}
                <form action={definirEcheancesAvecSlug} className="mt-6 border-t border-line pt-5">
                  <label htmlFor="echeances_max" className="mono block text-[11px] uppercase tracking-label text-ink-soft">
                    Paiement en plusieurs fois<Cur />
                  </label>
                  <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
                    Jusqu&apos;à combien de mensualités autorisez-vous vos adhérents ? Ils choisiront
                    librement dans cette limite.
                  </p>
                  {/* Le coût réel, chiffré : « des frais » ne permet pas de décider.
                      Demandé par Mathieu le 20/07/2026. */}
                  <div className="mono mt-4 border border-line bg-bg-alt px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
                    CE QUE PRÉLÈVE STRIPE<Cur />
                    <span className="mt-2 block">
                      <span className="text-ink">1,5 % + 0,25 €</span> par paiement (carte européenne standard).
                      Les 0,25 € reviennent <span className="text-ink">à chaque échéance</span>, le pourcentage ne bouge pas.
                    </span>
                    <span className="mt-2 block">
                      Sur une cotisation de 160 € : <span className="text-ink">2,65 €</span> en une fois,{" "}
                      <span className="text-ink">3,15 €</span> en 3 fois, <span className="text-ink">5,15 €</span> en 12 fois.
                      Soit <span className="text-ink">2,50 € de plus</span> pour douze prélèvements.
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <select
                      id="echeances_max"
                      name="echeances_max"
                      defaultValue={org.echeances_max ?? 1}
                      className="border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
                    >
                      <option value={1}>Comptant uniquement</option>
                      {Array.from({ length: 11 }, (_, i) => i + 2).map((v) => (
                        <option key={v} value={v}>
                          Jusqu&apos;à {v} mensualités
                        </option>
                      ))}
                    </select>
                    <button className="mono border border-ink px-5 py-2.5 text-[12px] hover:bg-ink hover:text-paper">
                      ENREGISTRER
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-prose text-[15px] text-ink-soft">
                  Connectez Stripe pour encaisser les cotisations en ligne — l&apos;argent arrive
                  directement sur votre compte, <span className="text-ink">0 % de commission</span>.
                </p>
                <form action={connecterAvecSlug}>
                  <button className="mono whitespace-nowrap bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
                    CONNECTER STRIPE →
                  </button>
                </form>
              </div>
            )}
            {searchParams?.stripe === "nonconfig" ? (
              <p className="mono mt-3 text-[11px] text-ink-faint">
                Stripe n&apos;est pas encore configuré côté plateforme (clé API manquante).
              </p>
            ) : null}
            {searchParams?.stripe === "erreur" ? (
              <p className="mono mt-3 text-[11px]" style={{ color: "#B23B3B" }}>
                La connexion à Stripe a échoué. Réessayez dans un instant ; si cela persiste, écrivez-nous.
              </p>
            ) : null}
          </div>

          {/* ACTIONS RAPIDES — des gestes, pas des raccourcis */}
          <div className="border-b border-line px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ACTIONS RAPIDES<Cur /></p>
            <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              <Geste titre="Gérer les adhérents" desc="Chercher, consulter, modifier une fiche." href={`/${org.slug}/cockpit/adherents`} action="OUVRIR" />
              <Geste titre="Cours et tarifs" desc="Horaires, tarifs, nouvelle activité." href={`/${org.slug}/cockpit/cours`} action="MODIFIER" />
              <Geste titre="Envoyer un message" desc="Aux adhérents, par groupe ou par cours." href={`/${org.slug}/cockpit/communication`} action="OUVRIR" />
              <Geste titre="Encaisser une cotisation" desc="Chèque ou espèces, en deux clics." href={`/${org.slug}/cockpit/paiements`} action="ENCAISSER" />
              <Geste titre="Faire l'appel" desc="Scanner la carte ou chercher un nom." href={`/${org.slug}/cockpit/scanner`} action="SCANNER" />
              <Geste titre="Publier une actualité" desc="À la une du site du club." href={`/${org.slug}/cockpit/actualite`} action="PUBLIER" />
              <Geste titre="Modifier le site" desc="Sections, photos, textes de la vitrine." href={`/${org.slug}?edition=1`} action="ÉDITER" />
              <Geste titre="Formulaire d'inscription" desc="Champs, pièces demandées, questionnaire." href={`/${org.slug}/cockpit/formulaire`} action="CONFIGURER" />
              <Geste titre="Logo &amp; couleur" desc="Le visage du club, modifiable quand vous voulez." href={`/${org.slug}/cockpit/identite`} action="AJUSTER" />
              <Geste titre="Votre domaine" desc="Votre site sur votre propre adresse." href={`/${org.slug}/cockpit/domaine`} action="CONNECTER" />
              <Geste titre="Importer vos adhérents" desc="Depuis votre tableur (CSV) : colonnes reconnues, aperçu avant import." href={`/${org.slug}/cockpit/adherents/import`} action="IMPORTER" />
              <Geste titre="Exporter vos adhérents" desc="La liste complète, en CSV. Vos données restent les vôtres." href={`/${org.slug}/cockpit/export`} action="EXPORTER" />
              {profile?.role === "admin_asso" || profile?.role === "super_admin" ? (
                <Geste titre="Votre équipe" desc="Trésorier, secrétaire, encadrant : le juste accès pour chacun." href={`/${org.slug}/cockpit/equipe`} action="GÉRER" />
              ) : null}
            </div>
          </div>

          {/* LA VIE DU CLUB — timeline des événements réels */}
          <div className="px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LA VIE DU CLUB<Cur /></p>
            {auj.evenements.length === 0 ? (
              <p className="mt-5 max-w-prose text-[15px] text-ink-soft">
                Rien à signaler pour l&apos;instant. Les inscriptions, présences et pièces déposées
                apparaîtront ici, au fil de l&apos;eau.
              </p>
            ) : (
              <div className="mt-5 border-t border-line">
                {auj.evenements.map((e, i) => (
                  <div key={i} className="flex items-baseline gap-5 border-b border-line py-3.5">
                    <span className="mono w-[110px] shrink-0 text-[11px] text-ink-faint">{formatQuand(e.ts)}</span>
                    <span className="text-[15px]">{e.texte}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mono flex justify-between border-t border-line px-6 py-4 text-[11px] md:px-8">
        <span className="text-ink-soft">AUJOURD&apos;HUI<Cur /></span>
        <span className="text-ink-faint">klubster.fr/{org.slug}/cockpit</span>
      </div>
    </main>
  );
}

/* Point d'état — vert prêt, orange attention, rouge urgent. Avec retenue. */
function Point({ etat, children }: { etat: "ok" | "attention" | "urgent" | "neutre"; children: React.ReactNode }) {
  const couleur = etat === "ok" ? "#279B65" : etat === "attention" ? "#8A6508" : etat === "urgent" ? "#B23B3B" : "#C2C2BD";
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3 last:border-b-0">
      <span className="mono text-[13px]" style={{ color: couleur }}>{etat === "ok" ? "✓" : "●"}</span>
      <span className="text-[15px]">{children}</span>
    </div>
  );
}

/* Carte d'action : le chiffre, la tâche, le geste. */
function Carte({ n, label, href, action, vide }: { n: string; label: string; href: string; action: string; vide?: boolean }) {
  return (
    <Link href={href} className={`group bg-paper px-6 py-7 md:px-7 ${vide ? "opacity-50" : ""}`}>
      <div className="mono text-[34px] font-bold tracking-[-0.02em]">{n}</div>
      <div className="mono mt-1 text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-4 text-[11px] text-ink-faint group-hover:text-ink">→ {action}</div>
    </Link>
  );
}

/* Action rapide : un geste du mercredi soir. */
function Geste({ titre, desc, href, action }: { titre: string; desc: string; href: string; action: string }) {
  return (
    <Link href={href} className="group bg-paper px-5 py-5">
      <div className="text-[15px] font-medium">{titre}</div>
      <div className="mt-1 text-[13px] text-ink-soft">{desc}</div>
      <div className="mono mt-3 text-[11px] text-ink-faint group-hover:text-ink">{action} →</div>
    </Link>
  );
}

/* "17:12" si c'est aujourd'hui (Paris), sinon "mar. 30 juin · 17:12". */
function formatQuand(iso: string): string {
  const d = new Date(iso);
  const tz = "Europe/Paris";
  const aujourdhui = new Date().toLocaleDateString("fr-FR", { timeZone: tz });
  const jour = d.toLocaleDateString("fr-FR", { timeZone: tz });
  const heureTxt = d.toLocaleTimeString("fr-FR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  if (jour === aujourdhui) return heureTxt;
  const court = d.toLocaleDateString("fr-FR", { timeZone: tz, weekday: "short", day: "numeric", month: "short" });
  return `${court} · ${heureTxt}`;
}
