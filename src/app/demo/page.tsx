"use client";

import Link from "next/link";
import RailDemo from "./RailDemo";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, Cur } from "@/components/demo/Simulation";
import { chiffresDuClub, dateDemo, jourEtCours } from "@/lib/demo/selecteurs";
import { calculerPriorites, resumeAttention, type Priorite } from "@/lib/priorites";
import { CLUB } from "@/lib/demo/donnees";

/**
 * « Aujourd'hui » — le hub, repris de `cockpit/page.tsx`.
 *
 * TOUS LES CHIFFRES VIENNENT DES SÉLECTEURS, aucun n'est écrit en dur. C'est ce qui fait
 * que le hub bouge quand le visiteur agit ailleurs : ajouter un adhérent fait monter
 * l'effectif, encaisser fait baisser les dossiers à terminer, cocher une pièce fait
 * baisser les dossiers incomplets. Un chiffre recopié aurait rendu la démonstration
 * morte au premier geste — et c'est exactement ce qui distingue une simulation d'une
 * maquette.
 *
 * Le rail est rendu ICI et nulle part ailleurs, comme dans le produit.
 */

function Point({ etat, children }: { etat: "ok" | "attention" | "urgent" | "neutre"; children: React.ReactNode }) {
  // S8 : mêmes classes token que le Point du cockpit réel — la démo suit, ne recopie pas.
  const couleur =
    etat === "ok" ? "text-brand" : etat === "attention" ? "text-warning" : etat === "urgent" ? "text-danger" : "text-ink-faint";
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3 last:border-b-0">
      <span className={`mono text-[13px] ${couleur}`}>
        {etat === "ok" ? "✓" : "●"}
      </span>
      <span className="text-[15px]">{children}</span>
    </div>
  );
}


function Geste({ titre, desc, href, action }: { titre: string; desc: string; href: string; action: string }) {
  return (
    <Link
      href={href}
      className="group bg-paper px-5 py-5 outline-success focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
    >
      <div className="text-[15px] font-medium">{titre}</div>
      <div className="mt-1 text-[13px] text-ink-soft">{desc}</div>
      <div className="mono mt-3 text-[11px] text-ink-faint group-hover:text-ink">{action} →</div>
    </Link>
  );
}

/* Une ligne de priorité — même rendu que `LignePriorite` du cockpit réel. */
// S8 : `accent` est une classe token, comme LignePriorite du cockpit réel.
function LigneDemo({ p, accent }: { p: Priorite; accent: "text-danger" | "text-warning" }) {
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

export default function DemoAujourdhui() {
  const { etat } = useDemo();
  const c = chiffresDuClub(etat);

  const { jourSemaine, coursDuJour } = jourEtCours(etat);
  const { dateLongue, salut } = dateDemo();

  // La phrase d'état, calculée comme dans le produit : dossiers en attente, cotisations
  // en retard, et PIÈCES attendues — des pièces, pas des dossiers. J'avais d'abord
  // additionné les dossiers incomplets, ce qui faussait le titre sans que rien ne le
  // signale : un adhérent à qui il manque deux pièces ne compte pas pour un.
  // LA MÊME hiérarchie que le cockpit réel (lot #15) : `calculerPriorites` est une
  // fonction pure, sans Supabase — la démonstration peut donc l'appeler telle quelle.
  // Avant ce raccord, la démo montrait trois cartes sur le même plan, c'est-à-dire
  // l'écran d'AVANT la refonte : un prospect découvrait après inscription un cockpit
  // qui ne ressemblait pas à celui qu'on lui avait montré.
  const priorites = calculerPriorites({
    slug: "demo",
    enAttente: c.enAttente,
    enRetard: c.enRetard,
    dossiersIncomplets: c.dossiersIncomplets,
    nouvelles7j: c.nouvelles7j,
    litiges: 0,
    // Cours au complet : même définition que le produit — les statuts qui occupent
    // une place, comparés à `places_max`.
    coursComplets: etat.cours
      .filter((co) => co.places_max != null &&
        etat.adhesions.filter((a) => a.cours_id === co.id && ["en_attente", "paye", "en_retard"].includes(a.statut)).length >= co.places_max)
      .map((co) => co.nom),
    coursPresqueComplets: [],
    adherents: c.adherents,
    coursOuverts: etat.cours.length,
  }).map((pr) => ({ ...pr, href: pr.href.replace("/demo/cockpit", "/demo") }));
  const aTraiter = priorites.filter((pr) => pr.niveau === "traiter");
  const aSurveiller = priorites.filter((pr) => pr.niveau === "surveiller");
  const infos = priorites.filter((pr) => pr.niveau === "info");
  const attention = aTraiter.length;
  const titre = resumeAttention(priorites).titre;
  const sousTitre =
    attention === 0
      ? coursDuJour.length > 0
        ? `Tout est à jour pour ${coursDuJour.length > 1 ? "les cours" : "le cours"} de ce ${jourSemaine}.`
        : "Tous les dossiers sont à jour."
      : "Le détail est juste en dessous — rien ne prend plus de quelques minutes.";

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
      <RailDemo />

      <div className="min-w-0">
        {/* L'ÉTAT DU CLUB — une phrase, pas un tableau de bord */}
        <div className="border-b border-line px-6 py-10 md:px-10 md:py-14">
          {/* Jamais écrit en dur : la salutation et la date viennent de `dateDemo()`,
              seule source de vérité sur l'horloge figée. La version précédente disait
              « LUNDI 20 OCTOBRE » — le 20 octobre 2026 est un mardi. */}
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            {salut.toUpperCase()} · {dateLongue.toUpperCase()}
            <Cur />
          </p>
          <h1 className="mt-6 max-w-[22ch] text-[30px] font-medium leading-[1.1] tracking-[-0.01em] md:text-[38px]">
            {titre}
          </h1>
          <p className="mt-4 max-w-prose text-ink-soft">{sousTitre}</p>

          <Confirmation />
        </div>

        {/* CE QUI DEMANDE VOTRE ATTENTION — la MÊME hiérarchie que le cockpit réel.
            Trois cartes sur le même plan, c'était l'écran d'avant le lot #15 : un
            chiffre neutre y pesait autant qu'une urgence. La démonstration doit
            montrer le produit qu'on livre, pas celui d'il y a trois semaines. */}
        {aTraiter.length > 0 ? (
          <div className="border-b border-line px-6 py-8 md:px-10">
            <p className="mono text-[11px] uppercase tracking-label text-danger">
              À TRAITER MAINTENANT<Cur />
            </p>
            <div className="mt-5 flex flex-col gap-px bg-line">
              {aTraiter.map((pr) => (
                <LigneDemo key={pr.cle} p={pr} accent="text-danger" />
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
              {aSurveiller.map((pr) => (
                <LigneDemo key={pr.cle} p={pr} accent="text-warning" />
              ))}
            </div>
          </div>
        ) : null}

        {/* LE CLUB AUJOURD'HUI */}
        <div className="border-b border-line px-6 py-8 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            LE CLUB AUJOURD&apos;HUI<Cur />
          </p>
          {/* CINQ LIGNES, celles du produit, dans son ordre. J'en avais écrit six
              autres — effectif, dossiers incomplets, reste à encaisser, chèques à
              remettre, liste d'attente. Utiles, sans doute, et absentes du cockpit :
              c'était une meilleure version hypothétique du produit, pas son jumeau.
              Une démonstration qui améliore ce qu'elle montre ment sur ce qu'on achète. */}
          <div className="mt-5">
            {/* Les lignes d'état viennent du niveau `info` des MÊMES priorités : le
                cockpit fait exactement cela. Les recopier ici les ferait apparaître
                DEUX FOIS — une fois en priorité, une fois en état — et diverger au
                premier changement de vocabulaire. */}
            {infos.map((pr) => (
              <Point key={pr.cle} etat="neutre">
                {pr.nombre} {pr.texte}
              </Point>
            ))}
            {coursDuJour.length > 0 ? (
              <Point etat="neutre">
                Ce {jourSemaine} : {coursDuJour.map((co) => `${co.nom} ${co.debut}–${co.fin}`).join(" · ")}
              </Point>
            ) : null}
            {aTraiter.length === 0 && aSurveiller.length === 0 ? (
              <Point etat="ok">Rien ne demande votre attention aujourd&apos;hui.</Point>
            ) : null}
          </div>
        </div>

        {/* ACTIONS RAPIDES — des gestes, pas des raccourcis.
            C'est ici, et pas dans le rail, qu'on atteint les adhérents et les cours :
            le rail réel n'a que sept entrées, et « Adhérents » n'en fait pas partie. */}
        <div className="border-b border-line px-6 py-8 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ACTIONS RAPIDES<Cur />
          </p>
          <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            <Geste titre="Gérer les adhérents" desc="Chercher, consulter, modifier une fiche." href="/demo/adherents" action="OUVRIR" />
            <Geste titre="Cours et tarifs" desc="Horaires, tarifs, nouvelle activité." href="/demo/cours" action="MODIFIER" />
            <Geste titre="Envoyer un message" desc="Aux adhérents, par groupe ou par cours." href="/demo/messages" action="OUVRIR" />
            <Geste titre="Encaisser une cotisation" desc="Chèque ou espèces, en deux clics." href="/demo/paiements" action="ENCAISSER" />
            <Geste titre="Faire l'appel" desc="Scanner la carte ou chercher un nom." href="/demo/controle" action="SCANNER" />
            <Geste titre="Publier une actualité" desc="À la une du site, et dans « La vie du club »." href="/demo/actualites" action="PUBLIER" />
            <Geste titre="Modifier le site" desc="Sections, photos, textes de la vitrine." href="/demo/site" action="ÉDITER" />
            <Geste titre="Formulaire d'inscription" desc="Champs, pièces demandées, questionnaire." href="/demo/inscriptions" action="CONFIGURER" />
            <Geste titre="Importer vos adhérents" desc="Depuis votre tableur (CSV) : colonnes reconnues, aperçu avant import." href="/demo/adherents/import" action="IMPORTER" />
          </div>
        </div>

        {/* PAS DE BLOC « DANS VOTRE CLUB, PAS DANS LA DÉMONSTRATION ».
            Il n'existe nulle part dans le cockpit. Stripe, le domaine et l'équipe
            appartiennent au bloc « Premiers pas », qui DISPARAÎT dès que le club compte
            un adhérent — celui-ci en a trente-quatre. Afficher quatre boutons inertes
            revenait à inventer une section pour justifier ce qu'on ne simule pas. */}

        <div className="mono flex justify-between border-t border-line px-6 py-4 text-[11px] md:px-8">
          <span className="text-ink-soft">
            AUJOURD&apos;HUI<Cur />
          </span>
          <span className="text-ink-faint">{CLUB.nom}</span>
        </div>
      </div>
    </div>
  );
}
