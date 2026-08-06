import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCockpitStats, getCoursByOrganisation, getAujourdhui } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { deconnexion } from "@/app/connexion/actions";
import { connecterStripe, definirEcheancesMax, souscrireAbonnement, gererAbonnement, appliquerCodePromo } from "./stripe-actions";
import { palierPourEffectif, PALIERS, joursEssai, estFondateur, stripeModeTest, stripeCleCoherente, detailCodePromo } from "@/lib/stripe";
import type { CodePromo } from "@/lib/stripe";
import BoutonAttente from "@/components/BoutonAttente";
import { Button, ButtonLink } from "@/components/ui/Button";
import { compteConnecte, statutAbonnement } from "@/lib/stripe-org";
import { formatPrix } from "@/lib/format";
import { peut, libelleRole } from "@/lib/roles";
import { calculerPriorites, filtrerParRole, resumeAttention, type Priorite } from "@/lib/priorites";
import { getRemplissageCours, getLitigesOuverts } from "@/lib/queries";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

export default async function Cockpit(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ stripe?: string; bienvenue?: string; abonnement?: string; code?: string; acces?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();

  const profile = await getProfile();
  const autorise = profile && (profile.organisation_id === org.id || profile.role === "super_admin");
  if (!autorise) redirect(`/connexion?next=/${org.slug}/cockpit`);

  const [s, auj, cours, remplissage, litiges] = await Promise.all([
    getCockpitStats(org.slug),
    getAujourdhui(org.id),
    getCoursByOrganisation(org.id),
    getRemplissageCours(org.id),
    // Un litige n'est lisible que par les rôles financiers : la requête est donc évitée
    // pour les autres plutôt que filtrée après coup.
    peut(profile?.role, "paiements") ? getLitigesOuverts(org.id) : Promise.resolve(0),
  ]);

  const prenom = profile?.prenom?.trim();
  const stripeConnecte = !!compteConnecte(org);
  const connecterAvecSlug = connecterStripe.bind(null, org.slug);
  const definirEcheancesAvecSlug = definirEcheancesMax.bind(null, org.slug);
  const souscrireAvecSlug = souscrireAbonnement.bind(null, org.slug);
  const gererAvecSlug = gererAbonnement.bind(null, org.slug);

  // Code promo appliqué : on redemande son détail à Stripe pour annoncer
  // l'avantage exact. Une panne Stripe ne doit pas casser le cockpit entier.
  let codePromo: CodePromo | null = null;
  if (searchParams?.code) {
    try {
      codePromo = await detailCodePromo(searchParams.code);
    } catch (e) {
      console.error("detail code promo", e);
    }
  }

  // Abonnement Klubster — état lisible pour un bénévole, pas du vocabulaire Stripe.
  const abo = statutAbonnement(org);
  const palier = palierPourEffectif(s.equipage);
  const prixMensuel = PALIERS[palier];
  // Ce que le club voit doit être ce que Stripe applique : la durée vient de
  // `joursEssai(rang)`, la même fonction que le checkout.
  const jrsEssai = joursEssai(org.fondateur_rang);
  const fondateur = estFondateur(org.fondateur_rang);
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

  // Un cours est « presque complet » à deux places près : au-delà, l'alerte crie trop tôt
  // et le président apprend à l'ignorer. Sans capacité déclarée, aucun jugement possible.
  const coursComplets = remplissage
    .filter((c) => c.placesMax != null && c.placesMax > 0 && c.occupees >= c.placesMax)
    .map((c) => c.nom);
  const coursPresqueComplets = remplissage
    .filter((c) => c.placesMax != null && c.placesMax > 0 && c.occupees < c.placesMax && c.placesMax - c.occupees <= 2)
    .map((c) => c.nom);

  // Les priorités sont calculées une fois, puis filtrées par le rôle : un secrétaire ne
  // voit pas les retards de cotisation, un trésorier ne voit pas les dossiers incomplets.
  const toutesPriorites = calculerPriorites({
    slug: org.slug,
    enAttente: s.enAttente,
    enRetard: s.enRetard,
    dossiersIncomplets: auj.dossiersIncomplets,
    nouvelles7j: auj.nouvelles7j,
    litiges,
    coursComplets,
    coursPresqueComplets,
    adherents: s.equipage,
    coursOuverts: cours.length,
  });
  const priorites = filtrerParRole(toutesPriorites, (a) => peut(profile?.role, a));
  const aTraiter = priorites.filter((p) => p.niveau === "traiter");
  const aSurveiller = priorites.filter((p) => p.niveau === "surveiller");
  const infos = priorites.filter((p) => p.niveau === "info");

  // L'état du club, en une phrase — sur les seules choses à traiter par CE rôle.
  const resume = resumeAttention(priorites);
  const titre = resume.titre;
  const sousTitre =
    resume.urgent === 0
      ? coursCeSoir.length > 0
        ? `Tout est à jour pour ${coursCeSoir.length > 1 ? "les cours" : "le cours"} de ce ${jourSemaine}.`
        : "Tous les dossiers sont à jour."
      : "Le détail est juste en dessous — rien ne prend plus de quelques minutes.";

  // DEUX permissions, et pas une. La confusion des deux est ce qui laissait un encadrant
  // lire « 48 190 € encaissés cette saison ».
  //   `peutPaiements` — la trésorerie DU CLUB : encaissements, remises, virements.
  //   `estPresident`  — l'abonnement KLUBSTER et la configuration Stripe. Ce que le club
  //                     paie à son prestataire ne regarde pas son trésorier, et les
  //                     Server Actions correspondantes exigent déjà le président.
  const peutPaiements = peut(profile?.role, "paiements");
  const estPresident = profile?.role === "admin_asso" || profile?.role === "super_admin";

  const NAV: { n: string; label: string; href: string; actif?: boolean }[] = [
    { n: "01", label: "AUJOURD'HUI", href: `/${org.slug}/cockpit`, actif: true },
    { n: "02", label: "INSCRIPTIONS", href: `/${org.slug}/cockpit/formulaire` },
    // « Contrôle » et non « Présences » : le scan vérifie l'inscription, la cotisation
    // et le dossier — la feuille d'appel n'en est qu'un des usages.
    { n: "03", label: "CONTRÔLE", href: `/${org.slug}/cockpit/scanner` },
    { n: "04", label: "PAIEMENTS", href: `/${org.slug}/cockpit/paiements` },
    { n: "05", label: "MESSAGES", href: `/${org.slug}/cockpit/communication` },
    { n: "06", label: "ACTUALITÉS", href: `/${org.slug}/cockpit/actualite` },
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
        {/* Nav : colonne sur desktop, rail horizontal scrollable sur mobile.
            Scrollbar masquée (l'onglet coupé au bord suffit à dire « ça défile »),
            padding porté par les onglets pour des zones tactiles ≥ 44 px, et filet
            accent sous l'onglet actif — le gras seul ne se voit pas en marchant. */}
        <nav className="flex gap-5 overflow-x-auto border-b border-line px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:block md:border-b-0 md:border-r md:px-7 md:py-6">
          {NAV.map((item) => (
            <Link
              key={item.n}
              href={item.href}
              className={`mono whitespace-nowrap border-b-2 py-3.5 text-[12px] tracking-wide md:block md:border-b-0 md:py-[10px] ${item.actif ? "border-brand font-bold text-ink" : "border-transparent text-ink-soft hover:text-ink"}`}
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

          {/* CE QUI DEMANDE VOTRE ATTENTION — trois niveaux, et rien de plus.
              Avant : sept indicateurs sur le même plan, dont trois cartes réservées aux
              rôles financiers — un secrétaire ouvrait un cockpit sans une seule action,
              alors que les dossiers incomplets sont son travail. Le calcul et le filtrage
              par rôle vivent dans `src/lib/priorites.ts`, testés séparément. */}
          {aTraiter.length > 0 ? (
            <div className="border-b border-line px-6 py-8 md:px-10">
              <p className="mono text-[11px] uppercase tracking-label text-danger">
                À TRAITER MAINTENANT<Cur />
              </p>
              <div className="mt-5 flex flex-col gap-px bg-line">
                {aTraiter.map((p) => (
                  <LignePriorite key={p.cle} p={p} accent="text-danger" />
                ))}
              </div>
            </div>
          ) : null}

          {aSurveiller.length > 0 ? (
            <div className="border-b border-line px-6 py-8 md:px-10">
              <p className="mono text-[11px] uppercase tracking-label text-warning">
                À SURVEILLER<Cur />
              </p>
              <div className="mt-5 flex flex-col gap-px bg-line">
                {aSurveiller.map((p) => (
                  <LignePriorite key={p.cle} p={p} accent="text-warning" />
                ))}
              </div>
            </div>
          ) : null}

          {/* LE CLUB AUJOURD'HUI — l'état, sans injonction. */}
          <div className="border-b border-line px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LE CLUB AUJOURD&apos;HUI<Cur /></p>
            <div className="mt-5">
              {infos.map((p) => (
                <Point key={p.cle} etat="neutre">
                  {p.nombre} {p.texte}
                </Point>
              ))}
              {coursCeSoir.length > 0 ? (
                <Point etat="neutre">
                  Ce {jourSemaine} : {coursCeSoir.map((c) => `${c.nom} ${c.debut}–${c.fin}`).join(" · ")}
                </Point>
              ) : null}
              {aTraiter.length === 0 && aSurveiller.length === 0 ? (
                <Point etat="ok">Rien ne demande votre attention aujourd&apos;hui.</Point>
              ) : null}
            </div>
          </div>

          {/* Refus d'accès. Huit redirections du cockpit posaient déjà `?acces=refuse`,
              que PERSONNE ne lisait : le bénévole revenait sur cette page sans un mot,
              persuadé d'avoir mal cliqué. Un échec muet est indiscernable d'un bug — et
              c'est le point d'abandon n°1 relevé sur l'authentification. */}
          {searchParams?.acces === "refuse" ? (
            <div className="border-b border-line px-6 py-5 md:px-10 bg-danger-soft">
              <p className="mono text-[12px] text-danger">
                Cette page n’est pas accessible avec votre rôle ({libelleRole(profile?.role)}).
                Demandez au président de vous l’ouvrir depuis « Votre équipe ».
              </p>
            </div>
          ) : null}


          {/* PAIEMENTS / STRIPE — président uniquement.
              Cette section mêle deux choses, et les deux lui appartiennent : la
              configuration Stripe du club, et l'ABONNEMENT KLUBSTER — son prix, son
              état, le bouton de résiliation, le code promo. Un trésorier gère l'argent
              des cotisations ; il n'a pas à voir ce que le club paie à son prestataire,
              ni à pouvoir cliquer sur des formulaires que les Server Actions lui
              refuseront de toute façon. Le total encaissé de la saison vit ici aussi. */}
          {estPresident ? (
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
              <p className="mono mb-5 text-[12px] text-danger">
                Les paiements ne sont pas encore activés côté plateforme. Écrivez-nous, nous réglons ça.
              </p>
            ) : searchParams?.abonnement === "aucun" ? (
              <p className="mono mb-5 text-[12px] text-ink-soft">
                Aucun abonnement en cours pour l&apos;instant.
              </p>
            ) : searchParams?.abonnement === "codeinconnu" ? (
              <p className="mono mb-5 text-[12px] text-danger">
                Ce code promo n&apos;est pas reconnu (ou n&apos;est plus actif). Vérifiez la saisie, ou laissez le champ vide.
              </p>
            ) : searchParams?.abonnement === "erreur" ? (
              <p className="mono mb-5 text-[12px] text-danger">
                La souscription n&apos;a pas pu démarrer. Réessayez dans un instant ; si cela persiste, écrivez-nous.
              </p>
            ) : null}
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENTS<Cur /></p>
            {/* Aucun euro réel ne circule en mode test : il faut le dire, gros, avant que
                quelqu'un croie avoir encaissé une cotisation. */}
            {stripeModeTest ? (
              <p
                className="mono mb-6 border border-warning px-4 py-3 text-[11px] uppercase tracking-label text-warning"
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
                  {/* Le code se saisit ICI, pas sur la page de paiement, et on annonce
                      ce qu'il offre AVANT de s'engager (demande de Mathieu, 20/07/2026). */}
                  {codePromo ? (
                    <div className="mt-5 border border-line bg-bg-alt px-4 py-3">
                      <p className="mono text-[12px] text-brand">
                        ✓ CODE {codePromo.code} APPLIQUÉ<Cur />
                      </p>
                      {codePromo.nom ? (
                        <p className="mt-2 text-[15px] text-ink">{codePromo.nom}</p>
                      ) : null}
                      <p className="mt-1 text-[15px] text-ink-soft">
                        Vous bénéficiez de <span className="text-ink">{codePromo.avantage}</span>, après vos{" "}
                        {jrsEssai} jours offerts.
                      </p>
                      <Link
                        href={`/${org.slug}/cockpit#paiements`}
                        className="mono mt-2 inline-block text-[11px] text-ink-faint underline underline-offset-2 hover:text-ink"
                      >
                        Retirer ce code
                      </Link>
                    </div>
                  ) : (
                    <form action={appliquerCodePromo.bind(null, org.slug)} className="mt-5 flex flex-wrap items-center gap-3">
                      <input
                        type="text"
                        name="code"
                        placeholder="Code promo (facultatif)"
                        spellCheck={false}
                        autoComplete="off"
                        className="mono w-full border border-line bg-paper px-3 py-3 text-[12px] uppercase outline-none placeholder:normal-case focus:border-ink sm:w-52"
                      />
                      {/* Contrôle tertiaire volontairement plus discret que le CTA de
                          souscription juste en dessous : ghost, pas secondary. */}
                      <BoutonAttente attente="VÉRIFICATION…" variant="ghost" className="border border-line hover:border-ink">
                        APPLIQUER
                      </BoutonAttente>
                    </form>
                  )}

                  <form action={souscrireAvecSlug} className="mt-4">
                    {codePromo ? <input type="hidden" name="code" value={codePromo.code} /> : null}
                    {/* Action principale de la page : pleine largeur au pouce. */}
                    <BoutonAttente
                      attente="OUVERTURE DE STRIPE…"
                      variant="primary"
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      {fondateur ? "COMMENCER LES TROIS MOIS OFFERTS" : "COMMENCER LE MOIS OFFERT"} →
                    </BoutonAttente>
                  </form>
                </div>
              ) : (
                <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="max-w-prose text-[15px]">
                    {abo === "essai" ? (
                      <>
                        <span className="mono text-brand">✓</span>{" "}
                        {fondateur ? "Trois mois offerts en cours" : "Mois offert en cours"}
                        {finEssai ? <> — premier prélèvement le {finEssai}.</> : "."}
                      </>
                    ) : abo === "actif" ? (
                      <>
                        <span className="mono text-brand">✓</span> Abonnement actif —{" "}
                        {(prixMensuel.prixCentimes / 100).toLocaleString("fr-FR")} € par mois. Votre facture
                        vous est envoyée chaque mois par email.
                      </>
                    ) : (
                      <span className="text-danger">
                        Dernier paiement refusé. Mettez à jour votre carte pour éviter la coupure.
                      </span>
                    )}
                  </p>
                  <form action={gererAvecSlug} className="w-full sm:w-auto">
                    <BoutonAttente
                      attente="OUVERTURE DE STRIPE…"
                      variant="secondary"
                      className="w-full whitespace-nowrap sm:w-auto"
                    >
                      FACTURES &amp; RÉSILIATION →
                    </BoutonAttente>
                  </form>
                </div>
              )}
            </div>

            {stripeConnecte ? (
              <>
                <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <p className="max-w-prose text-[15px]">
                    <span className="mono text-brand">✓</span> Stripe connecté. Les cotisations arrivent
                    directement sur le compte du club — <span className="mono">{formatPrix(s.tresorerieCentimes)}</span> encaissés cette saison,
                    0 % de commission.
                  </p>
                  {peutPaiements ? (
                    <ButtonLink
                      variant="ghost"
                      compact
                      href={`/${org.slug}/cockpit/virements`}
                      className="whitespace-nowrap border border-line hover:border-ink"
                    >
                      MES VIREMENTS →
                    </ButtonLink>
                  ) : null}
                </div>

                {/* Le club fixe le plafond ; l'adhérent choisit dans cette limite. */}
                <form action={definirEcheancesAvecSlug} className="mt-6 border-t border-line pt-5">
                  <label htmlFor="echeances_max" className="mono block text-[11px] uppercase tracking-label text-ink-soft">
                    Paiement en plusieurs fois<Cur />
                  </label>
                  <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
                    Jusqu&apos;à combien de mensualités autorisez-vous vos adhérents ? Ils choisiront
                    librement dans cette limite.
                  </p>
                  {/* Seul le fixe par prélèvement entre dans l'arbitrage : le pourcentage
                      Stripe est identique quel que soit le découpage (Mathieu, 20/07/2026). */}
                  <div className="mono mt-4 border border-line bg-bg-alt px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
                    CHAQUE PRÉLÈVEMENT COÛTE <span className="text-ink">0,25 €</span><Cur />
                    <span className="mt-2 block">
                      C&apos;est le seul écart entre payer en une fois ou en plusieurs :
                      en 3 fois, <span className="text-ink">0,50 € de plus</span> ; en 12 fois,{" "}
                      <span className="text-ink">2,75 € de plus</span>, par adhérent.
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
                    <Button variant="secondary" compact>
                      ENREGISTRER
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="mt-4 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-prose text-[15px] text-ink-soft">
                  Connectez Stripe pour encaisser les cotisations en ligne — l&apos;argent arrive
                  directement sur votre compte, <span className="text-ink">0 % de commission</span>.
                </p>
                <form action={connecterAvecSlug} className="w-full sm:w-auto">
                  <BoutonAttente
                    attente="OUVERTURE DE STRIPE…"
                    variant="primary"
                    className="w-full whitespace-nowrap sm:w-auto"
                  >
                    CONNECTER STRIPE →
                  </BoutonAttente>
                </form>
              </div>
            )}
            {searchParams?.stripe === "nonconfig" ? (
              <p className="mono mt-3 text-[11px] text-ink-faint">
                Stripe n&apos;est pas encore configuré côté plateforme (clé API manquante).
              </p>
            ) : null}
            {searchParams?.stripe === "erreur" ? (
              <p className="mono mt-3 text-[11px] text-danger">
                La connexion à Stripe a échoué. Réessayez dans un instant ; si cela persiste, écrivez-nous.
              </p>
            ) : null}
          </div>
          ) : null}

          {/* ACTIONS RAPIDES — des gestes, pas des raccourcis */}
          <div className="border-b border-line px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">ACTIONS RAPIDES<Cur /></p>
            <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              <Geste titre="Gérer les adhérents" desc="Chercher, consulter, modifier une fiche." href={`/${org.slug}/cockpit/adherents`} action="OUVRIR" />
              <Geste titre="Cours et tarifs" desc="Horaires, tarifs, nouvelle activité." href={`/${org.slug}/cockpit/cours`} action="MODIFIER" />
              <Geste titre="Envoyer un message" desc="Aux adhérents, par groupe ou par cours." href={`/${org.slug}/cockpit/communication`} action="OUVRIR" />
              {peutPaiements ? (
                <Geste titre="Encaisser une cotisation" desc="Chèque ou espèces, en deux clics." href={`/${org.slug}/cockpit/paiements`} action="ENCAISSER" />
              ) : null}
              {stripeConnecte && peutPaiements ? (
                <Geste titre="Mes virements" desc="Ce qui arrive sur le compte du club, et quand." href={`/${org.slug}/cockpit/virements`} action="CONSULTER" />
              ) : null}
              <Geste titre="Faire l'appel" desc="Scanner la carte ou chercher un nom." href={`/${org.slug}/cockpit/scanner`} action="SCANNER" />
              <Geste titre="Publier une actualité" desc="À la une du site, et dans « La vie du club »." href={`/${org.slug}/cockpit/actualite`} action="PUBLIER" />
              <Geste titre="Modifier le site" desc="Sections, photos, textes de la vitrine." href={`/${org.slug}?edition=1`} action="ÉDITER" />
              <Geste titre="Formulaire d'inscription" desc="Champs, pièces demandées, questionnaire." href={`/${org.slug}/cockpit/formulaire`} action="CONFIGURER" />
              <Geste titre="Logo &amp; couleur" desc="Le visage du club, modifiable quand vous voulez." href={`/${org.slug}/cockpit/identite`} action="AJUSTER" />
              <Geste titre="Votre domaine" desc="Votre site sur votre propre adresse." href={`/${org.slug}/cockpit/domaine`} action="CONNECTER" />
              <Geste titre="Importer vos adhérents" desc="Depuis votre tableur (CSV) : colonnes reconnues, aperçu avant import." href={`/${org.slug}/cockpit/adherents/import`} action="IMPORTER" />
              <Geste titre="Exporter vos adhérents" desc="La liste complète, en CSV. Vos données restent les vôtres." href={`/${org.slug}/cockpit/export`} action="EXPORTER" />
              {profile?.role === "admin_asso" || profile?.role === "super_admin" ? (
                <>
                  <Geste titre="Votre équipe" desc="Trésorier, secrétaire, encadrant : le juste accès pour chacun." href={`/${org.slug}/cockpit/equipe`} action="GÉRER" />
                  <Geste titre="Emails automatiques" desc="Relances pièces et cotisations : choisissez ce que Klubster envoie à votre place." href={`/${org.slug}/cockpit/emails`} action="RÉGLER" />
                </>
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
                {/* Sur téléphone, l'horodatage passe au-dessus du texte : la colonne
                    fixe de 110 px écrasait les événements sur une ligne de 8 mots. */}
                {auj.evenements.map((e, i) => (
                  <div key={i} className="flex flex-col gap-0.5 border-b border-line py-3.5 sm:flex-row sm:items-baseline sm:gap-5">
                    <span className="mono shrink-0 text-[11px] text-ink-faint sm:w-[110px]">{formatQuand(e.ts)}</span>
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
  // Lot S : classes token au lieu d'hex inline. Le ✓ vert reste `brand` (symbole, pas du
  // texte) ; attention/urgent passent par les tokens de statut, lisibles AA.
  const couleur =
    etat === "ok" ? "text-brand" : etat === "attention" ? "text-warning" : etat === "urgent" ? "text-danger" : "text-ink-faint";
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3 last:border-b-0">
      <span className={`mono text-[13px] ${couleur}`}>{etat === "ok" ? "✓" : "●"}</span>
      <span className="text-[15px]">{children}</span>
    </div>
  );
}

/* Une ligne de priorité : le nombre, la phrase, le geste — et un lien qui filtre déjà.
   Toute la ligne est cliquable : au bord du ring, on vise mal une petite flèche. */
// `accent` est une classe token (`text-danger` / `text-warning`), plus un hex : la
// sémantique des niveaux vit dans les tokens, le composant ne fait que la porter.
function LignePriorite({ p, accent }: { p: Priorite; accent: "text-danger" | "text-warning" }) {
  return (
    <Link
      href={p.href}
      className="group flex min-h-[56px] flex-col gap-1 bg-paper px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6"
    >
      <span className="flex items-baseline gap-4">
        <span className={`mono text-[22px] font-bold tabular-nums ${accent}`}>
          {p.nombre}
        </span>
        <span className="text-[15px] leading-snug">{p.texte}</span>
      </span>
      <span className="mono shrink-0 text-[11px] uppercase tracking-label text-ink-faint group-hover:text-ink">
        {p.action} →
      </span>
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
