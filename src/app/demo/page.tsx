"use client";

import Link from "next/link";
import RailDemo from "./RailDemo";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, Cur } from "@/components/demo/Simulation";
import { chiffresDuClub, dateDemo, jourEtCours } from "@/lib/demo/selecteurs";
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
  const couleur = etat === "ok" ? "#279B65" : etat === "attention" ? "#8A6508" : etat === "urgent" ? "#B23B3B" : "#C2C2BD";
  return (
    <div className="flex items-baseline gap-4 border-b border-line py-3 last:border-b-0">
      <span className="mono text-[13px]" style={{ color: couleur }}>
        {etat === "ok" ? "✓" : "●"}
      </span>
      <span className="text-[15px]">{children}</span>
    </div>
  );
}

function Carte({ n, label, href, action, vide }: { n: string; label: string; href: string; action: string; vide?: boolean }) {
  return (
    <Link
      href={href}
      className={`group bg-paper px-6 py-7 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] md:px-7 ${vide ? "opacity-50" : ""}`}
      style={{ outlineColor: "#1E7A4F" }}
    >
      <div className="mono text-[34px] font-bold tracking-[-0.02em]">{n}</div>
      <div className="mono mt-1 text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-4 text-[11px] text-ink-faint group-hover:text-ink">→ {action}</div>
    </Link>
  );
}

function Geste({ titre, desc, href, action }: { titre: string; desc: string; href: string; action: string }) {
  return (
    <Link
      href={href}
      className="group bg-paper px-5 py-5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
      style={{ outlineColor: "#1E7A4F" }}
    >
      <div className="text-[15px] font-medium">{titre}</div>
      <div className="mt-1 text-[13px] text-ink-soft">{desc}</div>
      <div className="mono mt-3 text-[11px] text-ink-faint group-hover:text-ink">{action} →</div>
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
  const attention = c.enAttente + c.enRetard + c.piecesAttendues;
  const titre =
    attention === 0
      ? "Le club est prêt."
      : `${attention} chose${attention > 1 ? "s" : ""} mérite${attention > 1 ? "nt" : ""} votre attention.`;
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

        {/* À FAIRE — l'action avant la statistique */}
        <div className="grid grid-cols-1 gap-px border-b border-line bg-line sm:grid-cols-3">
          <Carte
            n={String(c.enAttente)}
            label={`DOSSIER${c.enAttente > 1 ? "S" : ""} À TERMINER`}
            href="/demo/paiements"
            action="OUVRIR"
            vide={c.enAttente === 0}
          />
          <Carte
            n={String(c.enRetard)}
            label={`COTISATION${c.enRetard > 1 ? "S" : ""} À RELANCER`}
            href="/demo/messages"
            action="RELANCER"
            vide={c.enRetard === 0}
          />
          {/* La troisième carte compte les INSCRIPTIONS des sept derniers jours, et mène
              aux paiements. J'y avais mis les dossiers incomplets : c'était une carte
              de mon invention. Les dossiers incomplets restent visibles là où ils sont
              utiles — dans la fiche et dans les listes. */}
          <Carte
            n={String(c.nouvelles7j)}
            label={`INSCRIPTION${c.nouvelles7j > 1 ? "S" : ""} · 7 JOURS`}
            href="/demo/paiements"
            action="VÉRIFIER"
            vide={c.nouvelles7j === 0}
          />
        </div>

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
            <Point etat={c.nouvelles7j > 0 ? "ok" : "neutre"}>
              {c.nouvelles7j > 0
                ? `${c.nouvelles7j} nouvelle${c.nouvelles7j > 1 ? "s" : ""} inscription${c.nouvelles7j > 1 ? "s" : ""} cette semaine`
                : "Pas de nouvelle inscription cette semaine"}
            </Point>
            <Point etat={c.enRetard > 0 ? "urgent" : "ok"}>
              {c.enRetard > 0
                ? `${c.enRetard} cotisation${c.enRetard > 1 ? "s" : ""} en retard`
                : c.enAttente > 0
                  ? "Aucune cotisation en retard"
                  : "Tous les paiements sont à jour"}
            </Point>
            <Point etat={c.enAttente > 0 ? "attention" : "ok"}>
              {c.enAttente > 0
                ? `${c.enAttente} dossier${c.enAttente > 1 ? "s" : ""} en attente de règlement`
                : "Aucun dossier en attente"}
            </Point>
            {c.piecesAttendues > 0 ? (
              <Point etat="attention">
                {c.piecesAttendues} pièce{c.piecesAttendues > 1 ? "s" : ""} de dossier attendue
                {c.piecesAttendues > 1 ? "s" : ""}
              </Point>
            ) : null}
            {coursDuJour.length > 0 ? (
              <Point etat="neutre">
                Ce {jourSemaine} : {coursDuJour.map((k) => `${k.nom} ${k.debut}–${k.fin}`).join(" · ")}
              </Point>
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
