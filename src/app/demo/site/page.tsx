"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, Cur, EnTeteDemo } from "@/components/demo/Simulation";
import { BIBLIOTHEQUE, LABEL_DEFAUT } from "@/lib/chapitres";
import { CLUB, dateLongue, eur } from "@/lib/demo/donnees";
import {
  actualitesVitrine,
  chapitresDuSite,
  jaugeDuCours,
  liensNavSite,
  NOMS_SECTIONS_DEMO,
  resumeActu,
} from "@/lib/demo/selecteurs";

/**
 * LA VITRINE ET SON MODE ÉDITION — `src/app/[asso]/page.tsx`.
 *
 * C'est l'écran qui explique le produit le plus vite : le club modifie son site DEPUIS
 * son site, pas depuis un panneau d'administration séparé. La démonstration garde donc
 * les deux états sur la même page, avec la bascule « TERMINER → » / « MODIFIER LE
 * SITE ». Le produit les distingue par `?edition=1` ; ici c'est un booléen local, parce
 * qu'aucune URL ne doit porter d'état dans une simulation qui se réinitialise.
 *
 * CE QUE LA COMPOSITION DE LA PAGE FAIT VRAIMENT — `normaliserPageConfig`
 *
 * — Retirer un chapitre standard ne le détruit pas : il entre dans `masquees` et se
 *   réaffiche depuis la barre. Un retrait irréversible aurait été un piège, un club
 *   n'ayant aucun moyen de récupérer son planning.
 * — Un chapitre personnalisé, lui, est bel et bien supprimé.
 * — Les chapitres personnalisés absents de l'ordre sont ajoutés À LA FIN : c'est ainsi
 *   qu'un chapitre neuf apparaît sans qu'on ait à toucher à l'ordre.
 *
 * TROIS CHAPITRES SE MASQUENT D'EUX-MÊMES AU PUBLIC quand ils sont vides — planning,
 * la vie du club, contact — et restent visibles en édition pour qu'on sache où les
 * remplir. « Le club » et « Infos pratiques » disparaissent tout court sans leur texte.
 * Ce n'est pas de la coquetterie : un club qui vient de partager son adresse ne doit pas
 * afficher un titre suivi de vide.
 *
 * CE QUE LA DÉMONSTRATION NE REPREND PAS
 * Les chapitres à PHOTOS — galerie, partenaires, équipe, texte & photo — demandent un
 * envoi de fichier vers le Storage. Ils restent dans la bibliothèque, avec leur
 * description, et le formulaire dit ce qu'il ne peut pas faire ici plutôt que de faire
 * semblant. Les chapitres de texte, eux, s'ajoutent réellement.
 */

/** Les chapitres dont le formulaire réel se limite à du texte. */
const CHAPITRES_TEXTE = new Set(["president", "chiffres", "faq", "resultats", "citation"]);

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
      {children}
      <span style={{ color: CLUB.couleurTexte }}>_</span>
    </p>
  );
}

function Titre({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 text-3xl font-medium leading-tight md:text-4xl">{children}</h2>;
}

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

export default function DemoSite() {
  const { etat, envoyer } = useDemo();
  const [edition, setEdition] = useState(true);
  const [choisi, setChoisi] = useState<string | null>(null);
  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");

  const rendus = chapitresDuSite(etat);
  const liens = liensNavSite(etat);
  const actus = actualitesVitrine(etat);

  const ajouter = () => {
    if (!choisi) return;
    envoyer({
      type: "site/chapitre-ajouter",
      typeChapitre: choisi,
      titre: titre.trim() || LABEL_DEFAUT[choisi] || "Le club",
      texte: texte.trim(),
    });
    setChoisi(null);
    setTitre("");
    setTexte("");
  };

  /** Le contenu d'un chapitre standard. `null` = le produit ne le rend pas ici. */
  const contenu = (cle: string): React.ReactNode => {
    switch (cle) {
      case "presentation":
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>LE CLUB</Label>
            <h2 className="mt-8 max-w-[20ch] text-3xl font-medium leading-tight md:text-4xl">
              À propos de {CLUB.nom}
            </h2>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{CLUB.presentation}</p>
          </div>
        );

      case "cours":
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>DISCIPLINES</Label>
            <Titre>Nos cours.</Titre>
            <div className="mt-10 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
              {etat.cours.map((c, i) => (
                <div key={c.id} className="flex flex-col bg-paper px-6 py-7">
                  <span className="mono text-[12px] tracking-wider text-ink-soft">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-4 text-[16px] font-medium">{c.nom}</div>
                  {c.public_cible ? <div className="mt-1 text-[14px] text-ink-soft">{c.public_cible}</div> : null}
                  {c.creneaux.map((cr, j) => (
                    <p key={j} className="mono mt-2 text-[13px] leading-relaxed text-ink-soft">
                      {cr.jour} {cr.debut}–{cr.fin}
                      {cr.note ? ` · ${cr.note}` : ""}
                    </p>
                  ))}
                  <div className="mono mt-auto pt-5 text-[26px] font-bold tracking-[-0.02em]">
                    {Math.round(c.tarif_centimes / 100)}
                    <span className="text-[12px] font-normal text-ink-soft"> € /an</span>
                  </div>
                  {/* Même lien pour un cours complet : l'inscription bascule d'elle-même
                      en liste d'attente. Seul le libellé change — c'est plus honnête que
                      de fermer la porte. */}
                  <Link
                    href="/demo/inscriptions/apercu"
                    className="mono mt-5 inline-block min-h-[44px] border border-ink px-4 py-3.5 text-center text-[13px] hover:bg-ink hover:text-paper"
                  >
                    {jaugeDuCours(etat, c.id).complet ? "LISTE D’ATTENTE →" : "S’INSCRIRE À CE COURS →"}
                  </Link>
                </div>
              ))}
            </div>
          </div>
        );

      case "planning": {
        // Même règle que « La vie du club » : invisible au public tant qu'aucun cours
        // n'a d'horaire, visible en édition pour qu'on sache où le remplir. Ce cas
        // s'atteint depuis « Cours et tarifs », en retirant les créneaux.
        const aucunCreneau = etat.cours.every((c) => c.creneaux.length === 0);
        if (aucunCreneau && !edition) return null;
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>PLANNING</Label>
            <Titre>Créneaux de la semaine.</Titre>
            {aucunCreneau ? (
              <p className="mono mt-6 text-[13px] leading-relaxed text-ink-soft">
                Ajoutez les horaires de vos cours depuis le cockpit, rubrique Cours et tarifs. Ce
                chapitre reste invisible pour vos visiteurs tant qu’il est vide.
              </p>
            ) : null}
            <div className="mt-10 border-t border-line">
              {JOURS.map((jour) => {
                const duJour = etat.cours.flatMap((c) =>
                  c.creneaux.filter((cr) => cr.jour === jour).map((cr) => ({ nom: c.nom, ...cr }))
                );
                if (duJour.length === 0) return null;
                return (
                  <div key={jour} className="flex flex-wrap gap-x-6 gap-y-2 border-b border-line py-4">
                    <span className="mono w-[110px] text-[12px] uppercase tracking-label text-ink-soft">{jour}</span>
                    <div className="flex-1">
                      {duJour.map((cr, i) => (
                        <p key={i} className="text-[15px]">
                          <span className="mono text-[13px] text-ink-soft">
                            {cr.debut}–{cr.fin}
                          </span>{" "}
                          {cr.nom}
                        </p>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case "tarifs":
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>TARIFS</Label>
            <Titre>Cotisations annuelles.</Titre>
            <div className="mt-10 border-t border-line">
              {etat.cours.map((c) => (
                <div key={c.id} className="flex items-baseline justify-between gap-6 border-b border-line py-4">
                  <span className="text-[16px]">{c.nom}</span>
                  <span className="hidden flex-1 text-[14px] text-ink-soft sm:block">{c.public_cible ?? ""}</span>
                  <span className="mono text-[16px] font-bold">{eur(c.tarif_centimes)}</span>
                </div>
              ))}
            </div>
            <p className="mt-8 max-w-prose text-ink-soft">
              Paiement en ligne sécurisé, en une fois ou en plusieurs échéances. Pass’Sport et
              réductions acceptés.
            </p>
          </div>
        );

      case "actualites":
        // Invisible au public tant qu'il est vide ; visible en édition pour être rempli.
        if (actus.length === 0 && !edition) return null;
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>LA VIE DU CLUB</Label>
            <Titre>Dernières actualités.</Titre>
            {actus.length === 0 ? (
              <p className="mono mt-6 text-[13px] leading-relaxed text-ink-soft">
                Publiez vos actualités depuis le cockpit, rubrique Actualité. Ce chapitre reste
                invisible pour vos visiteurs tant qu’il est vide.
              </p>
            ) : (
              <div
                className={`mt-10 grid grid-cols-1 gap-px border border-line bg-line ${
                  actus.length >= 3 ? "md:grid-cols-3" : actus.length === 2 ? "md:grid-cols-2" : ""
                }`}
              >
                {actus.map((a) => (
                  <article key={a.id} className="flex flex-col bg-paper px-6 py-6">
                    <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
                      {dateLongue(a.publie_le)}
                    </p>
                    <h3 className="mt-3 text-[16px] font-medium leading-snug">{a.titre}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">{resumeActu(a.texte)}</p>
                    <Link href={`/demo/actualites/${a.id}`} className="mono mt-auto inline-block pb-3 pt-5 text-[13px]">
                      LIRE →
                    </Link>
                  </article>
                ))}
              </div>
            )}
          </div>
        );

      case "infos":
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>INFOS PRATIQUES</Label>
            <Titre>Avant de venir.</Titre>
            <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{CLUB.infosPratiques}</p>
          </div>
        );

      case "contact":
        return (
          <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
            <Label>OÙ NOUS TROUVER</Label>
            <div className="mt-8 space-y-6">
              <div>
                <p className="mono text-[12px] uppercase tracking-label text-ink-soft">ADRESSE</p>
                <p className="mt-2">{CLUB.adresse}</p>
              </div>
              <div>
                <p className="mono text-[12px] uppercase tracking-label text-ink-soft">EMAIL</p>
                {/* Adresse en @example.com, et volontairement PAS un lien `mailto:` :
                    un visiteur qui cliquerait ouvrirait sa messagerie sur une adresse
                    qui n'existe pas. */}
                <p className="mt-2">{CLUB.email}</p>
              </div>
              <div>
                <p className="mono text-[12px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</p>
                <p className="mt-2">{CLUB.telephone}</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const chapitrePerso = (cle: string) => {
    const c = etat.site.custom.find((x) => x.id === cle);
    if (!c) return null;
    return (
      <div className="mx-auto max-w-5xl px-6 py-16 md:px-8 md:py-20">
        <Label>{(c.titre || LABEL_DEFAUT[c.type] || "Le club").toUpperCase()}</Label>
        {c.type === "president" || c.type === "citation" ? (
          <p className="mt-10 max-w-[30ch] text-2xl font-medium leading-snug md:text-3xl">« {c.texte} »</p>
        ) : (
          <p className="mt-8 max-w-prose text-lg leading-relaxed text-ink-soft">{c.texte}</p>
        )}
      </div>
    );
  };

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker={edition ? "SITE · MODE ÉDITION" : "SITE · VUE PUBLIQUE"} />

      {/* ——— La barre du mode édition ————————————————————————————————————— */}
      {edition ? (
        <div
          className="border-y-2"
          style={{ borderColor: CLUB.couleur, background: `color-mix(in srgb, ${CLUB.couleur} 10%, #FCFCFA)` }}
        >
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-8">
            <span className="mono flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
              <span
                className="inline-flex items-center gap-2 px-2 py-1 text-[12px] uppercase tracking-label text-paper"
                style={{ background: CLUB.couleurTexte }}
              >
                <span aria-hidden className="kb-dot inline-block h-1.5 w-1.5 animate-pulse" style={{ background: "currentColor" }} />
                Mode édition
              </span>
              <span className="text-ink-soft">
                Vous modifiez le site de {CLUB.nom}. Les zones encadrées sont déplaçables.
              </span>
            </span>
            <div className="flex items-center gap-2">
              <a
                href="#ajouter"
                className="mono min-h-[44px] px-4 py-2 text-[13px] text-paper hover:opacity-90"
                style={{ background: CLUB.couleurTexte }}
              >
                AJOUTER UN CHAPITRE
              </a>
              <button
                type="button"
                onClick={() => setEdition(false)}
                className="mono min-h-[44px] border border-ink px-4 py-2 text-[13px] hover:bg-ink hover:text-paper"
              >
                TERMINER →
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="border-b border-line bg-bg-alt">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-3 md:px-8">
            <span className="mono text-[12px] text-ink-soft">
              Voici ce que voient vos visiteurs. Les chapitres vides ont disparu.
            </span>
            <button
              type="button"
              onClick={() => setEdition(true)}
              className="mono min-h-[44px] border border-ink px-4 py-2 text-[13px] hover:bg-ink hover:text-paper"
            >
              MODIFIER LE SITE →
            </button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-5xl px-6 pt-6 md:px-8">
        <Confirmation />
      </div>

      {/* ——— La navigation du site ———————————————————————————————————————— */}
      <nav aria-label="Chapitres du site" className="border-b border-line">
        <div className="mono mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-4 text-[12px] md:px-8">
          <span className="font-medium">{CLUB.nom}</span>
          {liens.map((l) => (
            <span key={l.cle} className="text-ink-soft">
              {l.label}
            </span>
          ))}
        </div>
      </nav>

      {/* ——— L'en-tête ———————————————————————————————————————————————————— */}
      <section className={edition ? "relative border-b border-line" : "border-b border-line"}>
        {edition ? (
          <span
            className="mono absolute left-3 top-3 z-20 border bg-paper px-2 py-1 text-[12px] uppercase tracking-label"
            style={{ borderColor: CLUB.couleur, color: CLUB.couleurTexte }}
          >
            En-tête
          </span>
        ) : null}
        <div className="mx-auto max-w-5xl px-6 py-20 md:px-8 md:py-24">
          <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
            {CLUB.sport}
            <span style={{ color: CLUB.couleurTexte }}>_</span>
          </p>
          <h1 className="mt-8 max-w-[18ch] text-[38px] font-medium leading-[1.05] tracking-[-0.015em] md:text-[54px]">
            {CLUB.accroche}
          </h1>
          <p className="mt-8 max-w-prose text-lg text-ink-soft">{CLUB.presentation}</p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/demo/inscriptions/apercu"
              className="mono min-h-[44px] px-6 py-3 text-[14px] text-paper transition-opacity hover:opacity-90"
              style={{ background: CLUB.couleurTexte }}
            >
              S’INSCRIRE →
            </Link>
            {/* Le bouton n'existe que si le chapitre « Cours » est rendu : sinon l'ancre
                n'existe pas, et le clic ne ferait rien — pire que l'absence du bouton. */}
            {rendus.some((r) => r.cle === "cours") ? (
              <a href="#cours" className="mono min-h-[44px] border border-ink px-6 py-3 text-[14px] hover:bg-bg-alt">
                DÉCOUVRIR LES COURS
              </a>
            ) : null}
          </div>
        </div>
      </section>

      {/* ——— Les chapitres ———————————————————————————————————————————————— */}
      {rendus.map((r, idx) => {
        const node = r.custom ? chapitrePerso(r.cle) : contenu(r.cle);
        if (!node) return null;
        return (
          <section key={r.cle} id={r.cle} className={`border-b border-line ${edition ? "relative" : ""}`}>
            {edition ? (
              <>
                <span
                  className="mono absolute left-3 top-3 z-20 border bg-paper px-2 py-1 text-[12px] uppercase tracking-label"
                  style={{ borderColor: CLUB.couleur, color: CLUB.couleurTexte }}
                >
                  {r.custom ? "Chapitre" : NOMS_SECTIONS_DEMO[r.cle] ?? r.cle}
                </span>
                <div
                  className="absolute right-3 top-3 z-20 flex flex-wrap justify-end gap-px border bg-line"
                  style={{ borderColor: CLUB.couleur }}
                >
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => envoyer({ type: "site/deplacer", cle: r.cle, sens: -1 })}
                    aria-label={`Remonter « ${NOMS_SECTIONS_DEMO[r.cle] ?? r.cle} »`}
                    className="mono min-h-[44px] bg-paper px-3 py-2 text-[12px] uppercase tracking-wide hover:bg-bg-alt disabled:opacity-25"
                  >
                    ↑ <span className="hidden sm:inline">Monter</span>
                  </button>
                  <button
                    type="button"
                    disabled={idx === rendus.length - 1}
                    onClick={() => envoyer({ type: "site/deplacer", cle: r.cle, sens: 1 })}
                    aria-label={`Descendre « ${NOMS_SECTIONS_DEMO[r.cle] ?? r.cle} »`}
                    className="mono min-h-[44px] bg-paper px-3 py-2 text-[12px] uppercase tracking-wide hover:bg-bg-alt disabled:opacity-25"
                  >
                    ↓ <span className="hidden sm:inline">Descendre</span>
                  </button>
                  {/* Deux libellés, parce que ce sont deux gestes : un chapitre standard
                      est MASQUÉ et récupérable, un chapitre personnalisé est SUPPRIMÉ.
                      Le nom du chapitre est DANS le libellé accessible, là où le produit
                      répète « Retirer ce chapitre de la page » sur chaque section : à la
                      lecture d'écran, huit boutons identiques ne disent pas lequel agit
                      sur quoi. C'est un écart volontaire, du côté de l'utilisable. */}
                  <button
                    type="button"
                    onClick={() =>
                      r.custom
                        ? envoyer({ type: "site/chapitre-supprimer", id: r.cle })
                        : envoyer({ type: "site/retirer", cle: r.cle })
                    }
                    aria-label={`${r.custom ? "Supprimer" : "Retirer"} « ${
                      r.custom ? etat.site.custom.find((c) => c.id === r.cle)?.titre ?? "Chapitre" : NOMS_SECTIONS_DEMO[r.cle] ?? r.cle
                    } »`}
                    title={r.custom ? "Supprimer ce chapitre" : "Retirer ce chapitre de la page (réversible)"}
                    className="mono min-h-[44px] bg-paper px-3 py-2 text-[12px] uppercase tracking-wide hover:bg-bg-alt"
                  >
                    ✕ <span className="hidden sm:inline">{r.custom ? "Supprimer" : "Retirer"}</span>
                  </button>
                </div>
              </>
            ) : null}
            {node}
          </section>
        );
      })}

      {/* ——— Les chapitres retirés ———————————————————————————————————————— */}
      {edition && etat.site.masquees.length > 0 ? (
        <section className="border-b border-line bg-bg-alt">
          <div className="mx-auto max-w-5xl px-6 py-8 md:px-8">
            <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
              CHAPITRES RETIRÉS DE LA PAGE
              <Cur />
            </p>
            <p className="mt-3 text-[15px] text-ink-soft">
              Ils ne sont plus visibles par vos visiteurs. Rien n’est perdu : réaffichez-les quand
              vous voulez.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              {etat.site.masquees.map((cle) => (
                <button
                  key={cle}
                  type="button"
                  onClick={() => envoyer({ type: "site/reafficher", cle })}
                  className="mono min-h-[44px] border border-line bg-paper px-4 py-3 text-[13px] hover:border-ink"
                >
                  ↺ Réafficher « {NOMS_SECTIONS_DEMO[cle] ?? cle} »
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* ——— Ajouter un chapitre ————————————————————————————————————————— */}
      {edition ? (
        <section id="ajouter" className="border-b border-line bg-bg-alt">
          <div className="mx-auto max-w-5xl px-6 py-14 md:px-8">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              AJOUTER UN CHAPITRE
              <Cur />
            </p>

            {!choisi ? (
              <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                {BIBLIOTHEQUE.map((g) => (
                  <div key={g.groupe} className="bg-paper px-5 py-5">
                    <p className="mono text-[10px] uppercase tracking-label text-ink-soft">{g.groupe}</p>
                    <div className="mt-3 space-y-3">
                      {g.chapitres.map((c) => (
                        <button
                          key={c.type}
                          type="button"
                          onClick={() => setChoisi(c.type)}
                          className="group block w-full min-h-[44px] text-left"
                        >
                          <span className="text-[15px] font-medium group-hover:underline">{c.label}</span>
                          <span className="mt-0.5 block text-[12px] text-ink-soft">{c.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-8">
                <div className="flex flex-wrap items-baseline justify-between gap-3">
                  <h2 className="text-2xl font-medium">
                    {BIBLIOTHEQUE.flatMap((g) => g.chapitres).find((c) => c.type === choisi)?.label ?? "Chapitre"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setChoisi(null)}
                    className="mono min-h-[44px] text-[12px] text-ink-soft hover:text-ink"
                  >
                    ← CHOISIR UN AUTRE CHAPITRE
                  </button>
                </div>

                {CHAPITRES_TEXTE.has(choisi) ? (
                  <div className="mt-8 space-y-4">
                    <div>
                      <label htmlFor="ds-titre" className="mono text-[10px] uppercase tracking-label text-ink-soft">
                        TITRE DU CHAPITRE
                      </label>
                      <input
                        id="ds-titre"
                        value={titre}
                        onChange={(e) => setTitre(e.target.value)}
                        placeholder={LABEL_DEFAUT[choisi] || "Le club"}
                        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
                      />
                    </div>
                    <div>
                      <label htmlFor="ds-texte" className="mono text-[10px] uppercase tracking-label text-ink-soft">
                        TEXTE
                      </label>
                      <textarea
                        id="ds-texte"
                        value={texte}
                        rows={4}
                        onChange={(e) => setTexte(e.target.value)}
                        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={ajouter}
                      disabled={texte.trim().length === 0}
                      className="mono min-h-[44px] px-6 py-3 text-[12px] text-paper hover:opacity-90 disabled:cursor-not-allowed disabled:bg-ink/20"
                      style={texte.trim().length === 0 ? undefined : { background: CLUB.couleurTexte }}
                    >
                      SIMULER L’AJOUT DU CHAPITRE →
                    </button>
                  </div>
                ) : (
                  <p className="mono mt-8 max-w-prose border border-line bg-paper px-4 py-3 text-[12px] leading-relaxed text-ink-soft">
                    Ce chapitre demande des photos, et une photo doit être envoyée quelque part. La
                    démonstration ne dépose aucun fichier : elle existe dans votre club, pas ici.
                    Les chapitres de texte — le mot du président, les chiffres clés, les questions
                    fréquentes, les résultats, la grande citation — s’ajoutent réellement.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      ) : null}

      <footer>
        <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-4 px-6 py-12 md:flex-row md:items-center md:px-8">
          <span className="mono text-[13px] text-ink-soft">© 2026 {CLUB.nom}</span>
          <span className="mono text-[13px] text-ink-soft">
            Créé avec{" "}
            <span className="font-logo font-semibold text-ink">
              k<Cur />
            </span>
          </span>
        </div>
      </footer>
    </main>
  );
}
