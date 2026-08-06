"use client";

import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, Confirmation, Cur, EnTeteDemo, GesteInerte } from "@/components/demo/Simulation";
import { CLUB } from "@/lib/demo/donnees";
import { TYPE_LABELS, type ChampTypeDemo } from "@/lib/demo/types";

/**
 * L'ATELIER DU FORMULAIRE — `cockpit/formulaire/FormBuilder.tsx`.
 *
 * SIX BLOCS, DANS L'ORDRE DU PRODUIT : la base verrouillée, les pages, les réductions,
 * les autorisations parentales, le questionnaire de santé, les pièces, le paiement.
 *
 * CE QUI NE S'INVENTE PAS, ET QUE J'AI RELU DANS LE FICHIER RÉEL
 *
 * — Les RÉDUCTIONS n'ont PAS de flèches de réordonnancement ; les autorisations et les
 *   pièces en ont. Ce n'est pas un oubli du produit, c'est ce qu'il fait.
 * — Une pièce peut être rattachée à UN cours (« Yin Yoga uniquement ») ; un champ, non.
 * — Le questionnaire de santé est une seule case à cocher, avec deux paragraphes
 *   d'explication qui disent quand NE PAS l'activer. Ces paragraphes sont la seule
 *   pédagogie du produit sur un point de droit ; les résumer serait les perdre.
 * — Le bloc PAIEMENT ne règle rien ici : il renvoie au cockpit, et avertit que Stripe
 *   prélève ses frais à chaque échéance. L'avertissement est repris tel quel — c'est
 *   exactement le genre de phrase qu'une démonstration commerciale supprimerait.
 *
 * TROIS ÉCARTS ASSUMÉS, ET LEURS RAISONS
 *
 * 1. LE BROUILLON LOCAL N'EXISTE PAS ICI. Le vrai atelier enregistre le travail en cours
 *    dans `localStorage`, et sa phrase d'accueil le dit. La démonstration s'interdit
 *    toute persistance : reprendre la phrase serait une promesse fausse, la garder sans
 *    le mécanisme serait pire. Elle est remplacée par la vérité de cet écran.
 * 2. LES DEUX MODÈLES DE DÉPART (« ASSOCIATION SPORTIVE », « ASSOCIATION CULTURELLE »)
 *    ne sont pas repris. Ils n'apparaissent dans le produit que sur un formulaire
 *    entièrement vide — ce club en a un — et `formulaireType()` fabrique ses
 *    identifiants avec `Math.random()`, ce que le rendu déterministe de la démonstration
 *    interdit. Les reproduire aurait demandé de réécrire la fonction : deux vérités pour
 *    un seul modèle, c'est la façon la plus sûre de les faire diverger.
 * 3. LE MODÈLE JOINT À UNE PIÈCE reste inerte : le vrai geste envoie un fichier dans le
 *    Storage du club. C'est le seul du bloc qui sorte du navigateur.
 */

const TYPES: ChampTypeDemo[] = ["texte", "zone", "date", "tel", "nombre", "choix", "case"];

const BASE_IDENTITE = ["Prénom *", "Nom *", "Date de naissance *", "Adresse *", "Email *", "Téléphone"];

const BASE_AUTO = [
  "Choix du cours — vos cours et tarifs, à jour en permanence",
  "Responsable légal (identité, email, téléphone) — dès que la date de naissance indique un mineur",
  "Création du compte adhérent (mot de passe) et paiement selon vos réglages",
];

/** Le petit bouton carré du builder : ↑ ↓ ✕. */
function Btn({ onClick, children, titre }: { onClick: () => void; children: React.ReactNode; titre: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={titre}
      title={titre}
      className="mono min-h-[44px] min-w-[44px] border border-line px-2 py-1.5 text-[11px] text-ink-soft hover:border-ink hover:text-ink"
    >
      {children}
    </button>
  );
}

const CHAMP = "border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink";

export default function DemoInscriptions() {
  const { etat, envoyer } = useDemo();
  const form = etat.form;

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker="FORMULAIRE D’INSCRIPTION" />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          ATELIER — {CLUB.nom}
          <Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">
          Votre formulaire d’inscription.
        </h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          La base ci-dessous est intégrée d’office. Ajoutez ensuite vos champs et vos pièces, page
          par page. Dans la démonstration, votre travail vit en mémoire : il disparaît au
          rechargement, et rien n’est enregistré nulle part.
        </p>

        <Confirmation />

        {/* ——— La base verrouillée ————————————————————————————————————————— */}
        <div className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            BASE DU FORMULAIRE — TOUJOURS PRÉSENTE
            <Cur />
          </p>
          <div className="mt-4 border border-line bg-bg-alt">
            <div className="mono flex items-center justify-between border-b border-line px-4 py-2.5 text-[10px] uppercase tracking-label text-ink-soft">
              <span>IDENTITÉ &amp; CONTACT</span>
              <span>VERROUILLÉ</span>
            </div>
            <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
              {BASE_IDENTITE.map((c) => (
                <div key={c} className="bg-bg-alt px-4 py-3 text-[13px] text-ink-soft">
                  {c}
                </div>
              ))}
            </div>
            <div className="mono border-b border-t border-line px-4 py-2.5 text-[10px] uppercase tracking-label text-ink-soft">
              PUIS, AUTOMATIQUEMENT
            </div>
            <div className="divide-y divide-line">
              {BASE_AUTO.map((l) => (
                <div key={l} className="px-4 py-3 text-[13px] text-ink-soft">
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ——— Pages ——————————————————————————————————————————————————————— */}
        <div className="mt-12">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PAGES
            <Cur />
          </p>
          <div className="mt-6 space-y-6">
            {form.pages.map((page, pi) => (
              <div key={page.id} className="border border-line bg-paper">
                {/* `flex-wrap` ET une largeur minimale sur le champ.
                    MESURÉ À 390 px, dans une iframe de cette largeur : sans cela, la
                    ligne « numéro + titre + ↑ ↓ ✕ » débordait de 36 px et faisait
                    défiler toute la page horizontalement. Les trois boutons font 44 px
                    de côté — c'est la bonne taille, et c'est justement ce qui ne rentre
                    pas à côté d'un champ extensible. Le champ passe donc à la ligne
                    au-dessous de 260 px environ. */}
                <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-3">
                  <span className="mono text-[11px] text-ink-soft">{String(pi + 1).padStart(2, "0")}</span>
                  <input
                    value={page.titre}
                    onChange={(e) => envoyer({ type: "form/page-renommer", id: page.id, titre: e.target.value })}
                    placeholder="Titre de la page"
                    aria-label={`Titre de la page ${pi + 1}`}
                    className={`min-w-[140px] flex-1 ${CHAMP}`}
                  />
                  <Btn titre="Monter la page" onClick={() => envoyer({ type: "form/page-deplacer", id: page.id, sens: -1 })}>
                    ↑
                  </Btn>
                  <Btn titre="Descendre la page" onClick={() => envoyer({ type: "form/page-deplacer", id: page.id, sens: 1 })}>
                    ↓
                  </Btn>
                  <Btn titre="Supprimer la page" onClick={() => envoyer({ type: "form/page-supprimer", id: page.id })}>
                    ✕
                  </Btn>
                </div>

                <div className="divide-y divide-line">
                  {page.champs.map((ch) => (
                    <div key={ch.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                      <select
                        value={ch.type}
                        onChange={(e) =>
                          envoyer({
                            type: "form/champ-modifier",
                            pageId: page.id,
                            champId: ch.id,
                            champ: { type: e.target.value as ChampTypeDemo },
                          })
                        }
                        aria-label={`Type du champ « ${ch.label || "sans libellé"} »`}
                        className="min-h-[44px] border border-line bg-paper px-2 py-2 text-[13px] outline-none focus:border-ink"
                      >
                        {TYPES.map((t) => (
                          <option key={t} value={t}>
                            {TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                      <input
                        value={ch.label}
                        onChange={(e) =>
                          envoyer({ type: "form/champ-modifier", pageId: page.id, champId: ch.id, champ: { label: e.target.value } })
                        }
                        placeholder="Libellé du champ"
                        aria-label="Libellé du champ"
                        className={`min-w-[180px] flex-1 ${CHAMP}`}
                      />
                      {/* Le champ des options n'apparaît QUE pour une liste de choix. */}
                      {ch.type === "choix" ? (
                        <input
                          value={ch.options ?? ""}
                          onChange={(e) =>
                            envoyer({ type: "form/champ-modifier", pageId: page.id, champId: ch.id, champ: { options: e.target.value } })
                          }
                          placeholder="Choix (séparés par des virgules)"
                          aria-label="Choix proposés"
                          className={`min-w-[160px] flex-1 ${CHAMP}`}
                        />
                      ) : null}
                      <label className="mono flex min-h-[44px] items-center gap-1.5 text-[11px] text-ink-soft">
                        <input
                          type="checkbox"
                          checked={ch.obligatoire}
                          onChange={(e) =>
                            envoyer({
                              type: "form/champ-modifier",
                              pageId: page.id,
                              champId: ch.id,
                              champ: { obligatoire: e.target.checked },
                            })
                          }
                          className="h-5 w-5 accent-success"
                        />
                        OBLIGATOIRE
                      </label>
                      <Btn titre={`Monter « ${ch.label || "champ sans libellé"} »`} onClick={() => envoyer({ type: "form/champ-deplacer", pageId: page.id, champId: ch.id, sens: -1 })}>
                        ↑
                      </Btn>
                      <Btn titre={`Descendre « ${ch.label || "champ sans libellé"} »`} onClick={() => envoyer({ type: "form/champ-deplacer", pageId: page.id, champId: ch.id, sens: 1 })}>
                        ↓
                      </Btn>
                      <Btn titre={`Supprimer « ${ch.label || "champ sans libellé"} »`} onClick={() => envoyer({ type: "form/champ-supprimer", pageId: page.id, champId: ch.id })}>
                        ✕
                      </Btn>
                    </div>
                  ))}
                </div>

                <div className="border-t border-line px-4 py-3">
                  <Btn titre="Ajouter un champ" onClick={() => envoyer({ type: "form/champ-ajouter", pageId: page.id })}>
                    + AJOUTER UN CHAMP
                  </Btn>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => envoyer({ type: "form/page-ajouter" })}
            className="mono mt-6 min-h-[44px] border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
          >
            + AJOUTER UNE PAGE
          </button>
        </div>

        {/* ——— Réductions —————————————————————————————————————————————————— */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            RÉDUCTIONS
            <Cur />
          </p>
          <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
            L’adhérent sélectionne la réduction qui le concerne et le montant à régler baisse
            d’autant — en ligne comme au club. Exigez un code justificatif (Pass’Sport…) : il sera
            enregistré sur la fiche pour que vous puissiez le vérifier.
          </p>
          <div className="mt-6 divide-y divide-line border border-line bg-paper">
            {form.remises.length === 0 ? (
              <p className="px-4 py-4 text-[14px] text-ink-soft">Aucune réduction pour l’instant.</p>
            ) : null}
            {form.remises.map((r) => (
              <div key={r.id} className="space-y-2 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    value={r.label}
                    onChange={(e) => envoyer({ type: "form/remise-modifier", id: r.id, remise: { label: e.target.value } })}
                    placeholder="Ex. Pass'Sport"
                    aria-label="Libellé de la réduction"
                    className={`min-w-[160px] flex-1 ${CHAMP}`}
                  />
                  <div className="mono flex items-center gap-1 text-[13px]">
                    <span className="text-ink-soft">−</span>
                    <input
                      value={r.montant_centimes ? String(r.montant_centimes / 100) : ""}
                      onChange={(e) => {
                        const v = Math.max(0, Math.round((parseFloat(e.target.value.replace(",", ".")) || 0) * 100));
                        envoyer({ type: "form/remise-modifier", id: r.id, remise: { montant_centimes: v } });
                      }}
                      inputMode="decimal"
                      placeholder="70"
                      aria-label="Montant de la réduction en euros"
                      className={`w-20 text-right ${CHAMP}`}
                    />
                    <span className="text-ink-soft">€</span>
                  </div>
                  <label className="mono flex min-h-[44px] items-center gap-1.5 text-[11px] text-ink-soft">
                    <input
                      type="checkbox"
                      checked={r.exigeCode}
                      onChange={(e) => envoyer({ type: "form/remise-modifier", id: r.id, remise: { exigeCode: e.target.checked } })}
                      className="h-5 w-5 accent-success"
                    />
                    CODE JUSTIFICATIF
                  </label>
                  {/* Pas de flèches ici : le produit n'en met pas sur les réductions. */}
                  <Btn titre="Supprimer la réduction" onClick={() => envoyer({ type: "form/remise-supprimer", id: r.id })}>
                    ✕
                  </Btn>
                </div>
                <input
                  value={r.description}
                  onChange={(e) => envoyer({ type: "form/remise-modifier", id: r.id, remise: { description: e.target.value } })}
                  placeholder="Aide affichée sous la réduction (optionnel) — ex. Réservé aux bénéficiaires du Pass'Sport."
                  aria-label="Aide affichée sous la réduction"
                  className={`w-full text-[13px] ${CHAMP}`}
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => envoyer({ type: "form/remise-ajouter" })}
            className="mono mt-4 min-h-[44px] border border-line px-4 py-2 text-[12px] text-ink-soft hover:border-ink hover:text-ink"
          >
            + AJOUTER UNE RÉDUCTION
          </button>
        </div>

        {/* ——— Autorisations parentales ————————————————————————————————————— */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            AUTORISATIONS PARENTALES — MINEURS
            <Cur />
          </p>
          <p className="mt-2 max-w-prose text-[13px] text-ink-soft">
            Cases à cocher présentées au responsable légal quand l’adhérent est mineur. Une
            autorisation obligatoire bloque l’inscription tant qu’elle n’est pas cochée (ex.
            l’accord pour les premiers soins).
          </p>
          <div className="mt-6 divide-y divide-line border border-line bg-paper">
            {form.autorisations.length === 0 ? (
              <p className="px-4 py-4 text-[14px] text-ink-soft">Aucune autorisation pour l’instant.</p>
            ) : null}
            {form.autorisations.map((a) => (
              <div key={a.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <input
                  value={a.label}
                  onChange={(e) => envoyer({ type: "form/autorisation-modifier", id: a.id, autorisation: { label: e.target.value } })}
                  placeholder="Ex. J'autorise mon enfant à quitter seul le lieu d'entraînement."
                  aria-label="Libellé de l’autorisation"
                  className={`min-w-[220px] flex-1 ${CHAMP}`}
                />
                <label className="mono flex min-h-[44px] items-center gap-1.5 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={a.obligatoire}
                    onChange={(e) =>
                      envoyer({ type: "form/autorisation-modifier", id: a.id, autorisation: { obligatoire: e.target.checked } })
                    }
                    className="h-5 w-5 accent-success"
                  />
                  OBLIGATOIRE
                </label>
                <Btn titre="Monter l’autorisation" onClick={() => envoyer({ type: "form/autorisation-deplacer", id: a.id, sens: -1 })}>
                  ↑
                </Btn>
                <Btn titre="Descendre l’autorisation" onClick={() => envoyer({ type: "form/autorisation-deplacer", id: a.id, sens: 1 })}>
                  ↓
                </Btn>
                <Btn titre="Supprimer l’autorisation" onClick={() => envoyer({ type: "form/autorisation-supprimer", id: a.id })}>
                  ✕
                </Btn>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => envoyer({ type: "form/autorisation-ajouter" })}
            className="mono mt-4 min-h-[44px] border border-line px-4 py-2 text-[12px] text-ink-soft hover:border-ink hover:text-ink"
          >
            + AJOUTER UNE AUTORISATION
          </button>
        </div>

        {/* ——— Questionnaire de santé —————————————————————————————————————— */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            QUESTIONNAIRE DE SANTÉ
            <Cur />
          </p>
          <div className="mt-6 border border-line bg-paper p-5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={form.sante}
                onChange={(e) => envoyer({ type: "form/sante", actif: e.target.checked })}
                className="mt-1 h-5 w-5 accent-success"
              />
              <span>
                <span className="text-[15px] font-medium">Inclure le questionnaire de santé QS-SPORT</span>
                <span className="mt-1.5 block max-w-prose text-[13px] leading-relaxed text-ink-soft">
                  Depuis 2021, ce questionnaire officiel peut remplacer le certificat médical dans
                  certaines disciplines : si l’adhérent répond « non » à toutes les questions, aucun
                  certificat n’est demandé ; au moindre « oui », un certificat devient obligatoire.
                  Version majeur ou mineur choisie automatiquement selon la date de naissance, signée
                  en ligne, et seul le résultat est conservé (jamais le détail des réponses).
                </span>
                <span className="mt-2 block max-w-prose text-[13px] leading-relaxed text-ink-soft">
                  Si votre discipline exige un certificat médical dans tous les cas (sports de
                  combat, compétition…), laissez cette case décochée et demandez le certificat dans
                  les pièces à fournir ci-dessous.
                </span>
              </span>
            </label>
          </div>
        </div>

        {/* ——— Pièces —————————————————————————————————————————————————————— */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PIÈCES À FOURNIR
            <Cur />
          </p>
          <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-soft">
            L’adhérent télécharge ces pièces depuis son espace, après son inscription (PDF, JPG ou
            PNG). Vous pouvez joindre un modèle vierge — un certificat médical à faire remplir, par
            exemple&nbsp;: il lui est envoyé par email avec sa confirmation d’inscription, et reste
            téléchargeable depuis son espace.
          </p>
          <div className="mt-6 divide-y divide-line border border-line bg-paper">
            {form.pieces.length === 0 ? (
              <p className="px-4 py-4 text-[14px] text-ink-soft">Aucune pièce demandée pour l’instant.</p>
            ) : null}
            {form.pieces.map((pc) => (
              <div key={pc.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                <input
                  value={pc.label}
                  onChange={(e) => envoyer({ type: "form/piece-modifier", id: pc.id, piece: { label: e.target.value } })}
                  placeholder="Ex. Certificat médical"
                  aria-label="Libellé de la pièce"
                  className={`min-w-[180px] flex-1 ${CHAMP}`}
                />
                <select
                  value={pc.cours_id ?? ""}
                  onChange={(e) => envoyer({ type: "form/piece-modifier", id: pc.id, piece: { cours_id: e.target.value || null } })}
                  aria-label={`Cours concerné par « ${pc.label || "cette pièce"} »`}
                  title="Cette pièce n'est demandée que pour ce cours"
                  className="min-h-[44px] border border-line bg-paper px-2 py-2 text-[13px] outline-none focus:border-ink"
                >
                  <option value="">Tous les cours</option>
                  {etat.cours.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nom} uniquement
                    </option>
                  ))}
                </select>
                <label className="mono flex min-h-[44px] items-center gap-1.5 text-[11px] text-ink-soft">
                  <input
                    type="checkbox"
                    checked={pc.obligatoire}
                    onChange={(e) => envoyer({ type: "form/piece-modifier", id: pc.id, piece: { obligatoire: e.target.checked } })}
                    className="h-5 w-5 accent-success"
                  />
                  OBLIGATOIRE
                </label>
                <Btn titre={`Monter « ${pc.label || "pièce sans libellé"} »`} onClick={() => envoyer({ type: "form/piece-deplacer", id: pc.id, sens: -1 })}>
                  ↑
                </Btn>
                <Btn titre={`Descendre « ${pc.label || "pièce sans libellé"} »`} onClick={() => envoyer({ type: "form/piece-deplacer", id: pc.id, sens: 1 })}>
                  ↓
                </Btn>
                <Btn titre={`Supprimer « ${pc.label || "pièce sans libellé"} »`} onClick={() => envoyer({ type: "form/piece-supprimer", id: pc.id })}>
                  ✕
                </Btn>

                {/* Le seul geste du bloc qui sorte du navigateur : il dépose un fichier
                    dans le Storage du club. Inerte ici, et dit comme tel. */}
                <div className="mono flex w-full flex-wrap items-center gap-3 pl-1 pt-1 text-[11px]">
                  <GesteInerte
                    libelle="+ JOINDRE UN MODÈLE À TÉLÉCHARGER (PDF, 3 Mo max)"
                    nomAccessible={`Joindre un modèle à « ${pc.label || "cette pièce"} »`}
                    className="min-h-[44px] text-ink-soft underline underline-offset-2 hover:text-ink"
                  />
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => envoyer({ type: "form/piece-ajouter" })}
            className="mono mt-6 min-h-[44px] border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
          >
            + AJOUTER UNE PIÈCE
          </button>
        </div>

        {/* ——— Paiement ———————————————————————————————————————————————————— */}
        <div className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PAIEMENT
            <Cur />
          </p>
          <div className="mt-6 border border-line bg-paper px-5 py-4">
            <p className="text-[15px] font-medium">Paiement en plusieurs fois</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Le nombre maximal de mensualités (jusqu’à 12) se règle dans le cockpit, sous la carte
              Stripe. L’adhérent choisit ensuite librement dans cette limite.
            </p>
            {/* AVERTISSEMENT REPRIS TEL QUEL. C'est le club qui perd de l'argent sur les
                échéances multiples, pas Klubster : le taire dans une démonstration
                commerciale serait exactement ce que ce produit refuse de faire. */}
            <p className="mono mt-4 border-t border-line pt-4 text-[11px] leading-relaxed text-warning">
              ⚠ ATTENTION — Stripe facture des frais à CHAQUE prélèvement (≈ 1,5 % + 0,25 € par
              transaction pour une carte européenne). Plus il y a d’échéances, plus la part fixe est
              prélevée souvent : le club perçoit un peu moins qu’en paiement unique.
            </p>
          </div>
        </div>

        {/* ——— Enregistrer ————————————————————————————————————————————————— */}
        <div className="mt-14 flex flex-wrap items-center gap-5 border-t border-line pt-6">
          <BoutonSimuler
            libelle="SIMULER L’ENREGISTREMENT →"
            onSimuler={() => envoyer({ type: "form/appliquer" })}
            pleineLargeur={false}
          />
          <Link href="/demo/inscriptions/apercu" className="mono ml-auto min-h-[44px] py-3 text-[12px] text-ink-soft hover:text-ink">
            VOIR LE FORMULAIRE →
          </Link>
        </div>
      </div>
    </main>
  );
}
