"use client";

import { useDemo } from "@/components/demo/DemoProvider";
import { EnTeteDemo } from "@/components/demo/Simulation";
import { CLUB, eur } from "@/lib/demo/donnees";
import { jaugeDuCours } from "@/lib/demo/selecteurs";
import { TYPE_LABELS, type ChampDemo } from "@/lib/demo/types";

/**
 * CE QUE L'ATELIER PRODUIT — `src/app/[asso]/inscription/FormulaireInscription.tsx`,
 * lu en LECTURE SEULE.
 *
 * POURQUOI EN LECTURE SEULE, ET PAS UN FORMULAIRE QUI MARCHE
 * Le vrai formulaire crée un compte d'authentification, écrit un adhérent, une adhésion,
 * ses pièces et son questionnaire de santé, puis ouvre un paiement Stripe. Le simuler
 * exigerait de rejouer `register_adherent_full`, un mot de passe, un consentement de
 * santé — et de demander à un visiteur de saisir des données personnelles sur une page
 * de démonstration. Ce n'est pas une question de travail : c'est la seule chose que cette
 * démonstration ne doit PAS proposer.
 *
 * Ce que le visiteur vient vérifier ici est ailleurs : ce que ses réglages de l'atelier
 * changent pour l'adhérent. Chaque bloc est donc rendu à partir de l'état vivant, et
 * bouge dès qu'on modifie le formulaire à côté.
 *
 * L'ORDRE DES BLOCS EST CELUI DU PRODUIT : identité, cours, pages personnalisées,
 * réductions, pièces, responsable légal, autorisations, questionnaire de santé, compte,
 * paiement. Une page vide de champs n'est PAS rendue (`page.champs.length === 0 ? null`).
 *
 * L'ACCENT VIENT DU TENANT, comme sur toute vitrine : `CLUB.couleur`, pas le vert
 * Klubster. Il ne porte aucun texte de lecture ici — seulement les curseurs `_` et les
 * mentions courtes — pour ne pas reconduire le défaut de contraste consigné dans
 * `docs/defauts-a-corriger.md`.
 */

const CADRE = "mt-4 border border-line bg-paper px-5 py-4";
const LABEL = "mono text-[11px] uppercase tracking-label text-ink-soft";

function Legende({ children }: { children: React.ReactNode }) {
  return (
    <legend className="mono text-[12px] uppercase tracking-label text-ink-soft">
      {children}
      <span style={{ color: CLUB.couleur }}>_</span>
    </legend>
  );
}

/** Un champ de la base verrouillée : libellé et cadre, sans saisie possible. */
function Case({ label }: { label: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <p className={LABEL}>{label}</p>
      <div className="mt-2 h-[42px] border border-line bg-bg-alt" aria-hidden />
    </div>
  );
}

/** Un champ venu de l'atelier — le rendu dépend de son type, comme `ChampInput`. */
function ChampApercu({ champ }: { champ: ChampDemo }) {
  const label = `${champ.label || "Champ"}${champ.obligatoire ? " *" : ""}`;

  if (champ.type === "case") {
    return (
      <div className="bg-paper px-5 py-4">
        <span className="flex items-start gap-3 text-[14px]">
          <span className="mt-0.5 inline-block h-4 w-4 shrink-0 border border-line" aria-hidden />
          <span>{label}</span>
        </span>
      </div>
    );
  }

  return (
    <div className="bg-paper px-5 py-4">
      <p className={LABEL}>{label}</p>
      {champ.type === "choix" ? (
        <div className="mono mt-2 flex flex-wrap gap-2 text-[12px] text-ink-soft">
          {(champ.options ?? "")
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
            .map((o) => (
              <span key={o} className="border border-line px-2 py-1">
                {o}
              </span>
            ))}
          {(champ.options ?? "").trim() === "" ? <span className="text-ink-soft">Aucun choix saisi</span> : null}
        </div>
      ) : (
        <>
          <div className="mt-2 h-[42px] border border-line bg-bg-alt" aria-hidden />
          <p className="mono mt-2 text-[11px] text-ink-soft">{TYPE_LABELS[champ.type]}</p>
        </>
      )}
    </div>
  );
}

export default function DemoApercuInscription() {
  const { etat } = useDemo();
  const form = etat.form;

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/inscriptions" libelleRetour="← ATELIER" kicker="INSCRIPTION · APERÇU" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          {CLUB.nom.toUpperCase()}
          <span style={{ color: CLUB.couleur }}>_</span>
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Inscription en ligne.</h1>
        <p className="mt-4 max-w-prose text-ink-soft">
          Voici ce que voient vos adhérents. Modifiez le formulaire dans l’atelier : cette page suit
          immédiatement.
        </p>
        <p className="mono mt-4 border border-line bg-bg-alt px-4 py-3 text-[11px] leading-relaxed text-ink-soft">
          Aperçu en lecture seule. Aucune saisie n’est possible ici : une démonstration publique n’a
          pas à recueillir de nom, d’adresse ni de donnée de santé, fût-ce pour faire joli.
        </p>

        <div className="mt-12 space-y-10">
          <fieldset>
            <Legende>IDENTITÉ</Legende>
            <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              {["PRÉNOM *", "NOM *", "DATE DE NAISSANCE *", "ADRESSE *", "EMAIL *", "TÉLÉPHONE"].map((l) => (
                <Case key={l} label={l} />
              ))}
            </div>
          </fieldset>

          <fieldset>
            <Legende>COURS</Legende>
            <div className={CADRE}>
              <p className={LABEL}>COURS SOUHAITÉ</p>
              {/* Les tarifs viennent des cours vivants : changer un tarif dans la
                  démonstration change ce que lit l'adhérent, sans autre geste. Et
                  « COMPLET (liste d'attente) » est décidé par la jauge, comme dans le
                  produit — jamais par un réglage séparé. */}
              <div className="mono mt-2 divide-y divide-line border border-line">
                {etat.cours.map((c) => {
                  const { complet } = jaugeDuCours(etat, c.id);
                  return (
                    <p key={c.id} className="px-3 py-2.5 text-[13px]">
                      {c.nom} — {eur(c.tarif_centimes)}/an
                      {complet ? " · COMPLET (liste d’attente)" : ""}
                    </p>
                  );
                })}
              </div>
            </div>
          </fieldset>

          {/* Une page sans champ n'est pas rendue : le produit la saute. */}
          {form.pages.map((page) =>
            page.champs.length === 0 ? null : (
              <fieldset key={page.id}>
                <Legende>{(page.titre || "INFORMATIONS").toUpperCase()}</Legende>
                <div className="mt-4 space-y-px border border-line bg-line">
                  {page.champs.map((ch) => (
                    <ChampApercu key={ch.id} champ={ch} />
                  ))}
                </div>
              </fieldset>
            )
          )}

          {form.remises.length > 0 ? (
            <fieldset>
              <Legende>RÉDUCTIONS</Legende>
              <div className="mt-4 divide-y divide-line border border-line bg-paper">
                {form.remises.map((r) => (
                  <div key={r.id} className="px-5 py-4">
                    <span className="flex items-start gap-3">
                      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 border border-line" aria-hidden />
                      <span className="flex-1">
                        <span className="text-[15px]">{r.label || "Réduction"}</span>
                        <span className="mono ml-2 text-[12px]">− {eur(r.montant_centimes)}</span>
                        {r.description ? (
                          <span className="mt-1 block text-[13px] text-ink-soft">{r.description}</span>
                        ) : null}
                        {r.exigeCode ? (
                          <span className="mono mt-2 block text-[11px] uppercase tracking-label text-ink-soft">
                            CODE JUSTIFICATIF DEMANDÉ
                          </span>
                        ) : null}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="mono mt-2 text-[12px] text-ink-soft">
                Le montant est toujours recalculé par le club : une réduction est enregistrée « à
                valider », et l’adhérent règle le plein tarif en attendant.
              </p>
            </fieldset>
          ) : null}

          {form.pieces.length > 0 ? (
            <fieldset>
              <Legende>PIÈCES À FOURNIR</Legende>
              <div className="mt-4 divide-y divide-line border border-line bg-paper">
                {form.pieces.map((pc) => {
                  const coursLie = pc.cours_id ? etat.cours.find((c) => c.id === pc.cours_id) : null;
                  return (
                    <div key={pc.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                      <span>
                        {pc.label || "Pièce"}
                        {pc.obligatoire ? " *" : ""}
                        {coursLie ? (
                          <span className="mono ml-2 text-[11px] uppercase tracking-wider text-ink-soft">
                            {coursLie.nom} uniquement
                          </span>
                        ) : null}
                      </span>
                      <span className="mono text-[11px] uppercase tracking-wider text-ink-soft">À TÉLÉCHARGER</span>
                    </div>
                  );
                })}
              </div>
              <p className="mono mt-2 text-[12px] text-ink-soft">
                À déposer dans votre espace adhérent après inscription.
              </p>
            </fieldset>
          ) : null}

          {/* Le bloc mineur n'a pas de réglage : il apparaît dès que la date de naissance
              indique un mineur, questionnaire de santé ou non. Les autorisations, elles,
              viennent de l'atelier. */}
          <fieldset>
            <Legende>SI L’ADHÉRENT EST MINEUR</Legende>
            <div className={CADRE}>
              <p className="text-[14px] text-ink-soft">
                Le responsable légal — identité, email, téléphone — est demandé automatiquement dès
                que la date de naissance indique un mineur. Ce bloc ne se règle pas dans l’atelier.
              </p>
              {form.autorisations.length > 0 ? (
                <div className="mt-4 divide-y divide-line border border-line">
                  {form.autorisations.map((a) => (
                    <p key={a.id} className="flex items-start gap-3 px-4 py-3 text-[14px]">
                      <span className="mt-0.5 inline-block h-4 w-4 shrink-0 border border-line" aria-hidden />
                      <span>
                        {a.label || "Autorisation"}
                        {a.obligatoire ? " *" : ""}
                      </span>
                    </p>
                  ))}
                </div>
              ) : (
                <p className="mono mt-4 text-[12px] text-ink-soft">
                  Aucune autorisation parentale demandée pour l’instant.
                </p>
              )}
            </div>
          </fieldset>

          {form.sante ? (
            <fieldset>
              <Legende>QUESTIONNAIRE DE SANTÉ</Legende>
              <div className={CADRE}>
                <p className="text-[14px] text-ink-soft">
                  Le QS-SPORT officiel, en version majeur ou mineur selon la date de naissance,
                  signé en ligne. Seul le résultat est conservé — jamais le détail des réponses.
                </p>
              </div>
            </fieldset>
          ) : null}

          <fieldset>
            <Legende>VOTRE COMPTE</Legende>
            <div className={CADRE}>
              <p className={LABEL}>MOT DE PASSE *</p>
              <div className="mt-2 h-[42px] border border-line bg-bg-alt" aria-hidden />
              <p className="mono mt-2 text-[11px] text-ink-soft">
                L’adhérent retrouve son dossier, ses règlements et ses pièces dans son espace.
              </p>
            </div>
          </fieldset>

          <fieldset>
            <Legende>PAIEMENT</Legende>
            <div className="mt-4 divide-y divide-line border border-line bg-paper">
              {[
                ["En ligne (carte bancaire)", "Sécurisé, immédiat."],
                ["Par chèque", "À remettre au club."],
                ["En espèces", "À remettre au club."],
              ].map(([titre, aide]) => (
                <p key={titre} className="flex items-center gap-3 px-5 py-4">
                  <span className="kb-dot inline-block h-4 w-4 shrink-0 border border-line" aria-hidden />
                  <span className="flex-1 text-[15px]">{titre}</span>
                  <span className="mono text-[11px] text-ink-soft">{aide}</span>
                </p>
              ))}
            </div>
            <p className="mono mt-2 text-[12px] text-ink-soft">
              L’argent des cotisations arrive directement sur le compte du club. Klubster ne prend
              aucune commission.
            </p>
          </fieldset>
        </div>
      </div>
    </main>
  );
}
