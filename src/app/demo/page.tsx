"use client";

import Link from "next/link";
import RailDemo from "./RailDemo";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, Cur, GesteInerte } from "@/components/demo/Simulation";
import { chiffresDuClub } from "@/lib/demo/selecteurs";
import { CLUB, eur } from "@/lib/demo/donnees";

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

  // La phrase d'état, calculée comme dans le produit : la somme de ce qui attend.
  const attention = c.enAttente + c.enRetard + c.dossiersIncomplets;
  const titre =
    attention === 0
      ? "Le club est prêt."
      : `${attention} chose${attention > 1 ? "s" : ""} mérite${attention > 1 ? "nt" : ""} votre attention.`;

  // Le cours du soir : lundi, dans l'horloge figée de la démonstration.
  const coursCeSoir = etat.cours.flatMap((co) =>
    co.creneaux.filter((k) => k.jour === "lundi").map((k) => ({ nom: co.nom, debut: k.debut, fin: k.fin }))
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr]">
      <RailDemo />

      <div className="min-w-0">
        {/* L'ÉTAT DU CLUB — une phrase, pas un tableau de bord */}
        <div className="border-b border-line px-6 py-10 md:px-10 md:py-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            BONSOIR · LUNDI 20 OCTOBRE<Cur />
          </p>
          <h1 className="mt-6 max-w-[22ch] text-[30px] font-medium leading-[1.1] tracking-[-0.01em] md:text-[38px]">
            {titre}
          </h1>
          <p className="mt-4 max-w-prose text-ink-soft">
            {attention === 0
              ? "Tous les dossiers sont à jour."
              : "Le détail est juste en dessous — rien ne prend plus de quelques minutes."}
          </p>

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
          <Carte
            n={String(c.dossiersIncomplets)}
            label={`DOSSIER${c.dossiersIncomplets > 1 ? "S" : ""} INCOMPLET${c.dossiersIncomplets > 1 ? "S" : ""}`}
            href="/demo/adherents?statut=&incomplet=1"
            action="VÉRIFIER"
            vide={c.dossiersIncomplets === 0}
          />
        </div>

        {/* LE CLUB AUJOURD'HUI */}
        <div className="border-b border-line px-6 py-8 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            LE CLUB AUJOURD&apos;HUI<Cur />
          </p>
          <div className="mt-5">
            <Point etat={c.adherents > 0 ? "ok" : "neutre"}>
              {c.adherents} adhérent{c.adherents > 1 ? "s" : ""} cette saison
            </Point>
            <Point etat={c.dossiersIncomplets === 0 ? "ok" : "attention"}>
              {c.dossiersIncomplets === 0
                ? "Tous les dossiers sont complets"
                : `${c.dossiersIncomplets} dossier${c.dossiersIncomplets > 1 ? "s" : ""} incomplet${c.dossiersIncomplets > 1 ? "s" : ""}`}
            </Point>
            <Point etat={c.enRetard === 0 ? "ok" : "urgent"}>
              {c.enRetard === 0
                ? "Aucune cotisation en retard"
                : `${c.enRetard} cotisation${c.enRetard > 1 ? "s" : ""} en retard · ${eur(c.resteAEncaisser)} à encaisser`}
            </Point>
            <Point etat={c.chequesARemettre === 0 ? "ok" : "attention"}>
              {c.chequesARemettre === 0
                ? "Aucun chèque en attente de remise"
                : `${c.chequesARemettre} chèque${c.chequesARemettre > 1 ? "s" : ""} encaissé${c.chequesARemettre > 1 ? "s" : ""}, pas encore déposé${c.chequesARemettre > 1 ? "s" : ""}`}
            </Point>
            {c.listeAttente > 0 ? (
              <Point etat="attention">
                {c.listeAttente} personne{c.listeAttente > 1 ? "s" : ""} en liste d’attente
              </Point>
            ) : null}
            {coursCeSoir.length > 0 ? (
              <Point etat="neutre">
                Ce soir : {coursCeSoir.map((k) => `${k.nom} ${k.debut}–${k.fin}`).join(", ")}
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

        {/* LES QUATRE GESTES HORS PÉRIMÈTRE.
            Ils dépendent tous d'un tiers ou d'une adresse réelle : les simuler ne
            montrerait rien, et les faire marcher exigerait de sortir de la
            démonstration. Ils sont visibles parce qu'ils existent dans le cockpit —
            les cacher donnerait une fausse idée de ce que contient le produit. */}
        <div className="px-6 py-8 md:px-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            DANS VOTRE CLUB, PAS DANS LA DÉMONSTRATION<Cur />
          </p>
          <div className="mono mt-5 flex flex-col gap-4 text-[12px] text-ink-soft">
            <GesteInerte libelle="CONNECTER STRIPE →" className="min-h-[44px] self-start border border-line px-4 py-3 hover:border-ink" />
            <GesteInerte libelle="VOTRE DOMAINE →" className="min-h-[44px] self-start border border-line px-4 py-3 hover:border-ink" />
            <GesteInerte libelle="VOTRE ÉQUIPE →" className="min-h-[44px] self-start border border-line px-4 py-3 hover:border-ink" />
            <GesteInerte libelle="EMAILS AUTOMATIQUES →" className="min-h-[44px] self-start border border-line px-4 py-3 hover:border-ink" />
          </div>
          <p className="mono mt-6 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Ces quatre-là demandent un compte Stripe, un nom de domaine ou une vraie adresse email.
            Ils fonctionnent dans votre club, pas dans une démonstration.
          </p>
        </div>

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
