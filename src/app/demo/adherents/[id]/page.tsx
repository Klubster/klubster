"use client";

import { use, useMemo, useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, CHAMP_DEMO, Confirmation, Cur, EnTeteDemo, LABEL_DEMO } from "@/components/demo/Simulation";
import { regleDe, resteDe } from "@/lib/demo/selecteurs";
import { CLUB, dateFr, eur } from "@/lib/demo/donnees";
import type { ModeReglement } from "@/lib/demo/types";

/**
 * La fiche d'un adhérent, reprise de `cockpit/adherents/[id]/page.tsx`.
 *
 * L'ORDRE DES BLOCS EST CELUI DU PRODUIT : identité et date d'inscription, confirmation,
 * litige éventuel, coordonnées, adhésions et trésorerie, puis l'ajout de règlement,
 * l'historique, les pièces, le questionnaire, les informations complémentaires et le
 * RGPD.
 *
 * SEULS QUATRE CHAMPS SONT MODIFIABLES : prénom, nom, email, téléphone. Pas de date de
 * naissance — elle existe en base et n'est ni affichée ni éditable ici. Pas de
 * représentant légal, pas de changement de cours : ils sont en feuille de route.
 *
 * LA FICHE NE CRÉE RIEN AU PREMIER RENDU. Elle lit, elle n'écrit pas — le bouton d'une
 * pièce ne fait que basculer une pièce DÉJÀ existante.
 */

/**
 * Le formulaire de coordonnées, isolé dans son composant.
 *
 * POURQUOI ISOLÉ, ET PAS UN `useEffect` DE RESYNCHRONISATION
 * Il faut que les champs suivent la fiche enregistrée quand elle change — après une
 * anonymisation, le titre devenait « Adhérent anonymisé » pendant que les champs
 * montraient encore le vrai nom, juste au-dessus d'une phrase promettant l'inverse.
 *
 * La réponse idiomatique de React n'est pas un effet qui appelle `setState` : c'est une
 * `key`. Quand la clé change, React démonte et remonte, et les `useState` se
 * réinitialisent tout seuls. L'effet aurait produit un rendu de trop, un avertissement
 * de lint mérité, et surtout le risque exact que Mathieu a nommé : une dépendance trop
 * large effaçant la saisie en cours dès qu'une pièce est cochée ailleurs sur la fiche.
 *
 * Ici, la clé ne dépend QUE des quatre valeurs enregistrées. Taper dans un champ ne la
 * change pas ; cocher une pièce non plus.
 */
function Coordonnees({
  prenomInitial,
  nomInitial,
  emailInitial,
  telephoneInitial,
  onEnregistrer,
}: {
  prenomInitial: string;
  nomInitial: string;
  emailInitial: string;
  telephoneInitial: string;
  onEnregistrer: (v: { prenom: string; nom: string; email: string; telephone: string }) => void;
}) {
  const [prenom, setPrenom] = useState(prenomInitial);
  const [nom, setNom] = useState(nomInitial);
  const [email, setEmail] = useState(emailInitial);
  const [telephone, setTelephone] = useState(telephoneInitial);
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="f-prenom" className={LABEL_DEMO}>
            PRÉNOM *
          </label>
          <input id="f-prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={CHAMP_DEMO} />
        </div>
        <div>
          <label htmlFor="f-nom" className={LABEL_DEMO}>
            NOM *
          </label>
          <input id="f-nom" value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP_DEMO} />
        </div>
        <div>
          <label htmlFor="f-email" className={LABEL_DEMO}>
            EMAIL
          </label>
          <input id="f-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CHAMP_DEMO} />
        </div>
        <div>
          <label htmlFor="f-tel" className={LABEL_DEMO}>
            TÉLÉPHONE
          </label>
          <input id="f-tel" type="tel" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={CHAMP_DEMO} />
        </div>
      </div>

      {erreur ? (
        <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>
          {erreur}
        </p>
      ) : null}

      <BoutonSimuler
        libelle="SIMULER L’ENREGISTREMENT DE LA FICHE"
        onSimuler={() => {
          // Le produit rejette explicitement un prénom ou un nom vide. Sans ce contrôle,
          // la liste affichait une ligne vide et cliquable, sans rien pour l'expliquer.
          if (!prenom.trim() || !nom.trim()) {
            setErreur("Le prénom et le nom sont obligatoires.");
            return;
          }
          setErreur(null);
          onEnregistrer({ prenom, nom, email, telephone });
        }}
      />
    </>
  );
}

/**
 * L'encart d'encaissement, isolé lui aussi.
 *
 * Sa clé porte l'adhésion ciblée ET son reste : le montant se re-remplit donc au
 * changement d'adhésion comme après chaque encaissement, sans effet ni `setState`
 * différé. Le solde est VRAIMENT dans le champ, pas en filigrane — un `placeholder`
 * avait l'air identique et se comportait autrement, puisqu'un champ vide encaissait
 * silencieusement la totalité au lieu d'être refusé.
 */
function EncartReglement({
  dues,
  nomDuCours,
  cible,
  onCible,
  resteCible,
  onEnregistrer,
}: {
  dues: { id: string; reste: number; coursId: string | null }[];
  nomDuCours: (id: string | null) => string;
  cible: string;
  onCible: (id: string) => void;
  resteCible: number;
  onEnregistrer: (v: { montantCentimes: number; mode: ModeReglement; note: string | null }) => void;
}) {
  const [montant, setMontant] = useState(
    resteCible > 0 ? (resteCible / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : ""
  );
  const [mode, setMode] = useState<ModeReglement>("especes");
  const [libelle, setLibelle] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  return (
    <div className="mt-4 border border-line bg-paper px-5 py-5">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        ENREGISTRER UN RÈGLEMENT<span className="text-brand">_</span>
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-3">
        {dues.length > 1 ? (
          <div>
            <label htmlFor="adh" className={LABEL_DEMO}>
              ADHÉSION
            </label>
            <select
              id="adh"
              value={cible}
              onChange={(e) => onCible(e.target.value)}
              className="mt-1.5 min-h-[44px] border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            >
              {dues.map((d) => (
                <option key={d.id} value={d.id}>
                  {nomDuCours(d.coursId)} — reste {(d.reste / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} €
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label htmlFor="mnt" className={LABEL_DEMO}>
            MONTANT (€)
          </label>
          <input
            id="mnt"
            inputMode="decimal"
            value={montant}
            onChange={(e) => setMontant(e.target.value)}
            className="mt-1.5 min-h-[44px] w-[120px] border border-line bg-paper px-3 py-2.5 text-right outline-none focus:border-ink"
          />
        </div>

        <div>
          <span className={LABEL_DEMO}>REÇU EN</span>
          <div className="mt-1.5 flex border border-line">
            {(["especes", "cheque", "autre"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className={`mono min-h-[44px] px-4 py-2.5 text-[12px] ${mode === m ? "bg-ink text-paper" : "hover:bg-bg-alt"}`}
              >
                {m === "especes" ? "Espèces" : m === "cheque" ? "Chèque" : "Autre"}
              </button>
            ))}
          </div>
        </div>

        {/* Le champ Nature n'apparaît QUE pour « Autre ». */}
        {mode === "autre" ? (
          <div>
            <label htmlFor="nature" className={LABEL_DEMO}>
              NATURE
            </label>
            <input
              id="nature"
              value={libelle}
              onChange={(e) => setLibelle(e.target.value)}
              placeholder="Chèque vacances, aide CAF…"
              className="mt-1.5 min-h-[44px] border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            />
          </div>
        ) : null}
      </div>

      {erreur ? (
        <p className="mono mt-3 text-[12px]" style={{ color: "#B23B3B" }}>
          {erreur}
        </p>
      ) : null}

      <div className="mt-4">
        <BoutonSimuler
          libelle="SIMULER L’ENCAISSEMENT"
          couleur={CLUB.couleur}
          pleineLargeur={false}
          onSimuler={() => {
            const euros = parseFloat(montant.replace(",", "."));
            // Vide ou invalide : on refuse. On n'encaisse plus la totalité en silence.
            if (!Number.isFinite(euros) || euros <= 0) {
              setErreur("Indiquez un montant.");
              return;
            }
            setErreur(null);
            onEnregistrer({
              montantCentimes: Math.round(euros * 100),
              mode,
              note: mode === "autre" ? libelle.trim() || "Autre" : null,
            });
          }}
        />
      </div>

      <p className="mono mt-3 text-[11px] text-ink-faint">
        Le solde est pré-rempli. Changez-le pour un acompte ; l’adhésion passe « payé » quand tout est
        réglé. Aucune banque, aucun numéro de chèque : Klubster ne les demande pas.
      </p>
    </div>
  );
}

const ETAT_ADHESION: Record<string, { texte: string; couleur: string }> = {
  paye: { texte: "Payé", couleur: "#1E7A4F" },
  en_retard: { texte: "En retard", couleur: "#B23B3B" },
  liste_attente: { texte: "Liste d’attente", couleur: "#6f6f6b" },
  en_attente: { texte: "En attente", couleur: "#8A6508" },
};

export default function DemoFicheAdherent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { etat, envoyer } = useDemo();

  const adherent = etat.adherents.find((a) => a.id === id);

  // Les adhésions, de la plus récente à la plus ancienne.
  const adhesions = useMemo(
    () =>
      etat.adhesions
        .filter((a) => a.adherent_id === id)
        .sort((x, y) => (x.created_at < y.created_at ? 1 : -1)),
    [etat.adhesions, id]
  );
  const pieces = etat.pieces.filter((p) => p.adherent_id === id);
  const questionnaire = etat.questionnaires.find((q) => q.adherent_id === id);
  const reglements = etat.reglements
    .filter((r) => adhesions.some((a) => a.id === r.adhesion_id))
    .sort((x, y) => (x.created_at < y.created_at ? -1 : 1));

  // Cumul sur TOUTES les adhésions pour la synthèse, et par adhésion pour cibler
  // correctement un règlement — les deux, comme dans le produit.
  const totalRegle = reglements.reduce((s, r) => s + r.montant_centimes, 0);
  const totalDu = adhesions.reduce((s, a) => s + a.montant_centimes, 0);
  const reste = Math.max(totalDu - totalRegle, 0);
  const dues = adhesions.map((a) => ({ a, reste: resteDe(etat, a) })).filter((x) => x.reste > 0);
  const litige = adhesions.find((a) => a.stripe_payment_intent && false); // aucun litige dans ce club

  // ——— RGPD, remboursement, adhésion ciblée ———
  // TOUS les hooks vivent au-dessus du `return` conditionnel. React exige le même ordre
  // d'appel à chaque rendu ; en placer un après une sortie anticipée est une erreur que
  // le lint refuse à juste titre, et que j'avais commise.
  const [confirmeAnonymisation, setConfirmeAnonymisation] = useState(false);
  const [remboursementOuvert, setRemboursementOuvert] = useState<string | null>(null);
  const [montantRemboursement, setMontantRemboursement] = useState("");
  const [cible, setCible] = useState<string>("");

  const adhesionCiblee = cible && dues.some((d) => d.a.id === cible) ? cible : dues[0]?.a.id ?? "";
  const resteCible = dues.find((d) => d.a.id === adhesionCiblee)?.reste ?? 0;

  if (!adherent) {
    return (
      <main className="min-h-screen text-ink">
        <EnTeteDemo retour="/demo/adherents" libelleRetour="← ADHÉRENTS" kicker="FICHE ADHÉRENT" />
        <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
          <p className="text-lg text-ink-soft">Cette fiche n’existe pas dans la simulation.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/adherents" libelleRetour="← ADHÉRENTS" kicker="FICHE ADHÉRENT" />

      <div className="mx-auto max-w-3xl px-6 py-12 md:px-8">
        {/* 1 — identité et date d'inscription */}
        <h1 className="text-3xl font-medium tracking-[-0.01em]">
          {adherent.prenom} {adherent.nom}
        </h1>
        <p className="mono mt-2 text-[11px] uppercase tracking-label text-ink-soft">
          Inscrit le {dateFr(adherent.created_at)}
        </p>

        {/* 2 — confirmation */}
        <Confirmation />

        {/* 3 — litige bancaire, s'il y en avait un */}
        {litige ? (
          <div className="mt-6 border px-5 py-4" style={{ borderColor: "#B23B3B", background: "#FBEDED" }}>
            <p className="mono text-[11px] uppercase tracking-label" style={{ color: "#B23B3B" }}>
              LITIGE BANCAIRE<Cur />
            </p>
          </div>
        ) : null}

        {/* 4 — coordonnées */}
        <section className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COORDONNÉES<Cur />
          </p>
          {/* La clé ne dépend QUE des valeurs enregistrées : une saisie en cours survit
              à toute autre action de la fiche, et se resynchronise dès que la fiche
              elle-même change — anonymisation ou réinitialisation. */}
          <Coordonnees
            key={`${adherent.prenom}|${adherent.nom}|${adherent.email ?? ""}|${adherent.telephone ?? ""}`}
            prenomInitial={adherent.prenom}
            nomInitial={adherent.nom}
            emailInitial={adherent.email ?? ""}
            telephoneInitial={adherent.telephone ?? ""}
            onEnregistrer={(v) => envoyer({ type: "adherent/modifier", id, ...v })}
          />
        </section>

        {/* 5 — adhésions et trésorerie */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            ADHÉSION<Cur />
          </p>

          {adhesions.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-soft">Aucune adhésion enregistrée.</p>
          ) : (
            <div className="mt-4 border border-line">
              {adhesions.map((a) => {
                const e = ETAT_ADHESION[a.statut] ?? ETAT_ADHESION.en_attente;
                const cours = etat.cours.find((c) => c.id === a.cours_id);
                return (
                  <div key={a.id} className="border-b border-line px-5 py-4 last:border-b-0">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-[15px] font-medium">{cours?.nom ?? "Cours"}</span>
                      <span className="mono text-[11px] uppercase tracking-wide" style={{ color: e.couleur }}>
                        {e.texte}
                      </span>
                    </div>
                    <p className="mono mt-1 text-[12px] text-ink-soft">
                      Saison {a.saison} · {eur(a.montant_centimes)}
                      {a.mode_paiement ? ` · ${a.mode_paiement}` : ""}
                    </p>

                    {a.stripe_payment_intent ? (
                      remboursementOuvert === a.id ? (
                        <div className="mt-3 border border-line bg-bg-alt px-4 py-4">
                          <label htmlFor={`remb-${a.id}`} className={LABEL_DEMO}>
                            MONTANT À REMBOURSER (€)
                          </label>
                          <input
                            id={`remb-${a.id}`}
                            inputMode="decimal"
                            value={montantRemboursement}
                            onChange={(ev) => setMontantRemboursement(ev.target.value)}
                            placeholder={`${(a.montant_centimes / 100).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} (total)`}
                            className="mt-2 w-40 border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
                          />
                          <div className="mt-3 flex flex-wrap items-center gap-4">
                            <BoutonSimuler
                              libelle="SIMULER LE REMBOURSEMENT"
                              couleur="#B23B3B"
                              pleineLargeur={false}
                              onSimuler={() => {
                                const v = parseFloat(montantRemboursement.replace(",", "."));
                                envoyer({
                                  type: "remboursement/simuler",
                                  adhesionId: a.id,
                                  montantCentimes: Number.isFinite(v) && v > 0 ? Math.round(v * 100) : null,
                                });
                                setRemboursementOuvert(null);
                                setMontantRemboursement("");
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setRemboursementOuvert(null)}
                              className="mono min-h-[44px] text-[12px] text-ink-soft hover:text-ink"
                            >
                              annuler
                            </button>
                          </div>
                          <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
                            Laissez vide pour rembourser la totalité. Dans votre club, l’argent est rendu sur la
                            carte de l’adhérent via Stripe. Ici, rien n’est transmis.
                          </p>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setRemboursementOuvert(a.id)}
                          className="mono mt-3 min-h-[44px] text-[12px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
                        >
                          Rembourser ce paiement en ligne
                        </button>
                      )
                    ) : null}
                  </div>
                );
              })}

              <div className="bg-bg-alt px-5 py-4">
                <p className="mono text-[12px]">
                  Réglé : <span className="text-ink">{eur(totalRegle)}</span>
                  {reste > 0 ? (
                    <span style={{ color: "#B23B3B" }}> · Reste {eur(reste)}</span>
                  ) : (
                    <span style={{ color: "#1E7A4F" }}> · Soldé</span>
                  )}
                </p>
              </div>
            </div>
          )}

          {/* 6 — enregistrer un règlement */}
          {dues.length > 0 ? (
            // La clé porte l'adhésion ciblée ET son reste : le montant se re-remplit au
            // changement d'adhésion comme après chaque encaissement.
            <EncartReglement
              key={`${adhesionCiblee}|${resteCible}`}
              dues={dues.map((d) => ({ id: d.a.id, reste: d.reste, coursId: d.a.cours_id }))}
              nomDuCours={(cid) => etat.cours.find((c) => c.id === cid)?.nom ?? "Cours"}
              cible={adhesionCiblee}
              onCible={setCible}
              resteCible={resteCible}
              onEnregistrer={({ montantCentimes, mode, note }) =>
                envoyer({ type: "reglement/ajouter", adhesionId: adhesionCiblee, montantCentimes, mode, note })
              }
            />
          ) : null}

          {/* 7 — historique des règlements */}
          {reglements.length > 0 ? (
            <div className="mt-4 border border-line">
              {reglements.map((r) => (
                <p key={r.id} className="mono border-b border-line px-5 py-3 text-[12px] last:border-b-0">
                  <span className="text-ink-soft">{dateFr(r.created_at)}</span>
                  {" — "}
                  {eur(r.montant_centimes)}
                  {r.mode ? ` (${r.mode})` : ""}
                  {r.note ? <span className="text-ink-soft"> · {r.note}</span> : null}
                </p>
              ))}
            </div>
          ) : null}
        </section>

        {/* 8 — pièces du dossier */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            PIÈCES DU DOSSIER<Cur />
          </p>
          {pieces.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-soft">Aucune pièce demandée pour ce cours.</p>
          ) : (
            <div className="mt-4 border border-line">
              {pieces.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3 last:border-b-0"
                >
                  <span className="text-[15px]">{p.label}</span>
                  <div className="flex items-center gap-5">
                    {p.aUnFichier ? (
                      <a
                        href={`/demo/piece/${p.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mono min-h-[44px] py-3 text-[11px] uppercase tracking-wide text-ink-soft underline underline-offset-2 hover:text-ink"
                      >
                        Consulter
                      </a>
                    ) : null}
                    {/* Bascule une pièce DÉJÀ existante — elle n'en crée jamais. */}
                    <button
                      type="button"
                      onClick={() => envoyer({ type: "piece/basculer", id: p.id })}
                      className="mono min-h-[44px] text-[11px] uppercase tracking-wide hover:underline"
                      style={{ color: p.statut === "recue" ? "#1E7A4F" : "#8A6508" }}
                    >
                      {p.statut === "recue" ? "✓ Reçue" : "○ Manquante"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 9 — questionnaire de santé */}
        {questionnaire ? (
          <section className="mt-14">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              QUESTIONNAIRE DE SANTÉ<Cur />
            </p>
            <p className="mt-4 text-[15px]">
              {questionnaire.resultat === "certificat_requis"
                ? "Un certificat médical est demandé."
                : "Attestation signée — aucun certificat requis."}
            </p>
            <p className="mono mt-1 text-[12px] text-ink-soft">
              Signé par {questionnaire.signataire_nom ?? "l’adhérent"} le {dateFr(questionnaire.created_at)}. Le
              détail des réponses n’est jamais conservé.
            </p>
          </section>
        ) : null}

        {/* 10 — informations complémentaires */}
        {Object.keys(adherent.infos).length > 0 ? (
          <section className="mt-14">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              INFORMATIONS COMPLÉMENTAIRES<Cur />
            </p>
            <div className="mt-4 border border-line">
              {Object.entries(adherent.infos).map(([cle, valeur]) => (
                <p key={cle} className="border-b border-line px-5 py-3 text-[14px] last:border-b-0">
                  <span className="mono text-[11px] uppercase tracking-wide text-ink-soft">{cle}</span>
                  <span className="mt-0.5 block">{valeur}</span>
                </p>
              ))}
            </div>
          </section>
        ) : null}

        {/* 11 — RGPD */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            DONNÉES PERSONNELLES · RGPD<Cur />
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                const donnees = {
                  genere_le: "2026-10-20",
                  association: CLUB.nom,
                  avertissement: "Données fictives — démonstration Klubster.",
                  adherent,
                  adhesions,
                  reglements,
                  pieces,
                  questionnaires_sante: questionnaire ? [questionnaire] : [],
                  note: "Le détail des réponses au questionnaire de santé n’est pas conservé.",
                };
                const blob = new Blob([JSON.stringify(donnees, null, 2)], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `demonstration-donnees-${adherent.prenom}-${adherent.nom}.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="mono min-h-[44px] border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper"
            >
              EXPORTER SES DONNÉES →
            </button>

            {confirmeAnonymisation ? (
              <span className="flex flex-wrap items-center gap-3">
                <span className="mono text-[11px] text-ink-soft">
                  Anonymiser définitivement {adherent.prenom} {adherent.nom} ?
                </span>
                <button
                  type="button"
                  onClick={() => {
                    envoyer({ type: "adherent/anonymiser", id });
                    setConfirmeAnonymisation(false);
                  }}
                  className="mono min-h-[44px] text-[12px]"
                  style={{ color: "#B23B3B" }}
                >
                  OUI, SIMULER L’ANONYMISATION
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmeAnonymisation(false)}
                  className="mono min-h-[44px] text-[12px] text-ink-soft"
                >
                  annuler
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmeAnonymisation(true)}
                className="mono min-h-[44px] text-[12px] text-ink-soft underline decoration-line underline-offset-2 hover:text-ink"
              >
                Anonymiser (droit à l’effacement)
              </button>
            )}
          </div>
          <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            L’export réunit toutes les données de l’adhérent en un fichier. L’anonymisation efface ses
            données personnelles et de santé, mais conserve les écritures comptables (obligation légale).
            Dans votre club, c’est irréversible — ici, « RÉINITIALISER » suffit à revenir en arrière.
          </p>
        </section>
      </div>
    </main>
  );
}
