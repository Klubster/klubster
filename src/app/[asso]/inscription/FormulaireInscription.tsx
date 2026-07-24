"use client";
import { startTransition, useActionState, useState } from "react";
import { formatPrix } from "@/lib/format";
import { texteSur } from "@/lib/contraste";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";
import { inscrireAdherent } from "./actions";
import QuestionnaireSante from "./QuestionnaireSante";
import ResponsableLegal from "./ResponsableLegal";
import AutorisationsMineur from "./AutorisationsMineur";
import RemisesInscription from "./RemisesInscription";
import { NaissanceProvider, ChampNaissance } from "./naissance";
import Turnstile, { demanderJetonTurnstile } from "@/components/site/Turnstile";
import ChoixEcheances from "@/components/site/ChoixEcheances";
import type { Champ, Page, Piece, Remise, AutorisationMineur as Autorisation } from "@/types/form";

/** Cours proposé à l'inscription, avec sa jauge déjà calculée côté serveur. */
export interface CoursInscription {
  id: string;
  nom: string;
  tarif_centimes: number;
  complet: boolean;
}

/**
 * Formulaire d'inscription — composant client : les erreurs de l'action serveur
 * reviennent via `useActionState` SANS redirection, donc sans nouvelle requête
 * GET qui viderait les 20+ champs saisis (P0, audit du 23/07/2026). Le
 * formulaire étant non contrôlé, React conserve les valeurs telles quelles.
 */
export default function FormulaireInscription({
  slug,
  accent,
  cours,
  pages,
  pieces,
  remises,
  autorisations,
  questionnaireActif,
  paiementEnLigne,
  chequeParDefaut,
  echeancesMax,
  erreurInitiale,
}: {
  slug: string;
  accent: string;
  cours: CoursInscription[];
  pages: Page[];
  pieces: Piece[];
  remises: Remise[];
  autorisations: Autorisation[];
  questionnaireActif: boolean;
  paiementEnLigne: boolean;
  chequeParDefaut: boolean;
  erreurInitiale: string | null;
  echeancesMax: number;
}) {
  const [etat, formAction, enCours] = useActionState(inscrireAdherent, null);
  const [verifEnCours, setVerifEnCours] = useState(false);
  const [erreurJeton, setErreurJeton] = useState(false);
  // Compat : `?erreur=…` reste honoré pour les redirections venant d'ailleurs
  // (ex. retour Stripe) ; l'état de l'action, plus récent, prime.
  const erreur = etat?.erreur ?? erreurInitiale;

  /**
   * Soumission MANUELLE, pour deux raisons découvertes le 24/07/2026 :
   *  1. React 19 réinitialise un formulaire non contrôlé soumis nativement via
   *     `action=` dès que l'action se termine — MÊME quand elle retourne une
   *     erreur : toute la saisie disparaissait. `preventDefault` + dispatch dans
   *     une transition évitent ce reset.
   *  2. Le jeton Turnstile expire en 5 min et le formulaire en prend 10-15 : on
   *     demande donc un jeton FRAIS ici, au clic, jamais à l'affichage.
   */
  async function surSoumission(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (!form.reportValidity()) return;
    setErreurJeton(false);
    setVerifEnCours(true);
    const jeton = await demanderJetonTurnstile();
    setVerifEnCours(false);
    if (jeton === null) {
      setErreurJeton(true);
      return;
    }
    const fd = new FormData(form);
    if (jeton) fd.set("cf-turnstile-response", jeton);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      {/* `compte_existant` s'affiche PRÈS du champ email (plus bas), pas ici. */}
      {erreur === "compte" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
          Le compte n&apos;a pas pu être créé : vérifiez l&apos;email et le mot de passe ({LONGUEUR_MIN_MDP} caractères minimum), puis réessayez dans quelques minutes.
        </p>
      ) : erreur === "trop_de_tentatives" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
          Trop de tentatives d&apos;inscription depuis cet appareil. Patientez quelques minutes, puis réessayez.
        </p>
      ) : erreur === "robot" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
          Nous n&apos;avons pas pu vérifier que vous êtes bien une personne. Rechargez la page et réessayez.
        </p>
      ) : erreur === "suspendu" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
          Les inscriptions en ligne de ce club sont momentanément fermées. Rapprochez-vous directement du club.
        </p>
      ) : erreur === "champs" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
          Le formulaire est incomplet : vérifiez les champs obligatoires. Pour un mineur, les coordonnées du
          responsable légal et les autorisations requises doivent être renseignées.
        </p>
      ) : erreur && erreur !== "compte_existant" ? (
        <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Une erreur est survenue. Vérifiez vos informations.</p>
      ) : null}

      <form onSubmit={surSoumission} className="mt-12 space-y-10">
        <NaissanceProvider>
        <input type="hidden" name="slug" value={slug} />

        {/* Pot de miel : invisible et non focalisable. Seul un robot le remplit. */}
        <div aria-hidden className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: "-9999px" }}>
          <label htmlFor="site_web">Ne remplissez pas ce champ</label>
          <input id="site_web" type="text" name="site_web" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        {/* IDENTITÉ (base verrouillée) */}
        <fieldset>
          <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">IDENTITÉ<span style={{ color: accent }}>_</span></legend>
          <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
            <Field label="PRÉNOM" name="prenom" required autoComplete="given-name" />
            <Field label="NOM" name="nom" required autoComplete="family-name" />
            {/* La date de naissance vit ici (base commune) et pilote le questionnaire
                de santé + le bloc responsable légal plus bas (contexte partagé). */}
            <ChampNaissance />
            {/* L'adresse fait partie de la base commune : licences fédérales,
                attestations et courriers en ont besoin (demande de Mathieu, 15/07/2026). */}
            <Field label="ADRESSE" name="adresse" required autoComplete="street-address" />
            <Field
              label="EMAIL"
              name="email"
              type="email"
              required
              autoComplete="email"
              messageErreur={
                erreur === "compte_existant"
                  ? "Un compte existe déjà avec cet email — connectez-vous pour inscrire un autre adhérent."
                  : undefined
              }
            />
            <Field label="TÉLÉPHONE" name="tel" type="tel" autoComplete="tel" />
          </div>
        </fieldset>

        {/* COURS */}
        <fieldset>
          <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">COURS<span style={{ color: accent }}>_</span></legend>
          <div className="mt-4 border border-line bg-paper px-5 py-4">
            <label htmlFor="cours" className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS SOUHAITÉ</label>
            <select id="cours" name="cours" required className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink">
              {cours.map((c) => (
                // data-tarif : lu par le sélecteur de mensualités pour afficher le vrai montant.
                (<option key={c.id} value={c.id} data-tarif={c.tarif_centimes}>
                  {c.nom} — {formatPrix(c.tarif_centimes)}/an{c.complet ? " · COMPLET (liste d’attente)" : ""}
                </option>)
              ))}
            </select>
          </div>
        </fieldset>

        {/* PAGES PERSONNALISÉES */}
        {pages.map((page) => (
          page.champs.length === 0 ? null : (
            <fieldset key={page.id}>
              <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">{(page.titre || "INFORMATIONS").toUpperCase()}<span style={{ color: accent }}>_</span></legend>
              <div className="mt-4 space-y-px border border-line bg-line">
                {page.champs.map((ch) => <ChampInput key={ch.id} champ={ch} />)}
              </div>
            </fieldset>
          )
        ))}

        {/* RÉDUCTIONS (Pass'Sport…) — montant recalculé côté serveur */}
        <RemisesInscription remises={remises} accent={accent} />

        {/* PIÈCES (info) */}
        {pieces.length > 0 ? (
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">PIÈCES À FOURNIR<span style={{ color: accent }}>_</span></legend>
            <div className="mt-4 divide-y divide-line border border-line bg-paper">
              {pieces.map((pc) => {
                const coursLie = pc.cours_id ? cours.find((c) => c.id === pc.cours_id) : null;
                return (
                  <div key={pc.id} className="flex items-center justify-between gap-3 px-5 py-3 text-[14px]">
                    <span>
                      {pc.label}{pc.obligatoire ? " *" : ""}
                      {coursLie ? (
                        <span className="mono ml-2 text-[10px] uppercase tracking-wider" style={{ color: accent }}>
                          {coursLie.nom} uniquement
                        </span>
                      ) : null}
                      {/* Modèle fourni par le club (ex. certificat médical vierge) */}
                      {pc.modele_url ? (
                        <a
                          href={pc.modele_url}
                          target="_blank"
                          rel="noreferrer"
                          className="mono ml-2 text-[10px] uppercase tracking-wider underline underline-offset-2"
                          style={{ color: accent }}
                        >
                          TÉLÉCHARGER LE MODÈLE ↓
                        </a>
                      ) : null}
                    </span>
                    <span className="mono text-[10px] uppercase tracking-wider text-ink-faint">
                      {pc.mode === "email" ? "PAR EMAIL" : pc.mode === "upload" ? "À TÉLÉVERSER" : "TÉLÉVERSER OU EMAIL"}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mono mt-2 text-[11px] text-ink-faint">À déposer dans votre espace adhérent après inscription.</p>
          </fieldset>
        ) : null}

        {/* RESPONSABLE LÉGAL — toujours actif pour les mineurs, indépendant du QS */}
        <ResponsableLegal accent={accent} />

        {/* AUTORISATIONS PARENTALES — configurées dans l'Atelier, mineurs uniquement */}
        <AutorisationsMineur autorisations={autorisations} accent={accent} />

        {/* QUESTIONNAIRE DE SANTÉ — seulement si le club l'a activé dans l'Atelier
            (certaines disciplines exigent un certificat médical, le QS ne s'y
            substitue pas — retour de Mathieu, 15/07/2026). */}
        {questionnaireActif ? <QuestionnaireSante accent={accent} /> : null}

        {/* COMPTE */}
        <fieldset>
          <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">VOTRE COMPTE<span style={{ color: accent }}>_</span></legend>
          <div className="mt-4 border border-line bg-paper px-5 py-4">
            <label htmlFor="password" className="mono text-[10px] uppercase tracking-label text-ink-soft">MOT DE PASSE *</label>
            <input id="password" name="password" type="password" required minLength={LONGUEUR_MIN_MDP} autoComplete="new-password" className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            <p className="mono mt-2 text-[11px] text-ink-soft">{LONGUEUR_MIN_MDP} caractères minimum. Pour accéder à votre espace adhérent.</p>
          </div>
        </fieldset>

        {/* PAIEMENT */}
        <fieldset>
          <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENT<span style={{ color: accent }}>_</span></legend>
          <div className="mt-4 divide-y divide-line border border-line bg-paper">
            {/* Le paiement en ligne n'est proposé que si le club a connecté Stripe. */}
            {paiementEnLigne ? (
              <>
                <Radio name="mode" value="en_ligne" defaultChecked label="En ligne (carte bancaire)" hint="Sécurisé, immédiat." />
                <ChoixEcheances
                  echeancesMax={echeancesMax}
                  tarifInitialCentimes={cours[0]?.tarif_centimes ?? 0}
                  accent={accent}
                />
              </>
            ) : null}
            <Radio name="mode" value="cheque" defaultChecked={chequeParDefaut} label="Par chèque" hint="À remettre au club." />
            <Radio name="mode" value="especes" label="En espèces" hint="À remettre au club." />
          </div>
        </fieldset>

        <Turnstile />

        {erreurJeton ? (
          <p className="mono text-[12px]" style={{ color: "#B23B3B" }}>
            La vérification anti-robot n&apos;a pas abouti. Vérifiez votre connexion et réessayez —
            votre saisie est conservée.
          </p>
        ) : null}

        <BoutonValider accent={accent} enCours={enCours || verifEnCours} />
        </NaissanceProvider>
      </form>
    </>
  );
}

/**
 * Bouton de soumission : désactivé pendant l'action (compte + adhésion +
 * checkout Stripe = plusieurs secondes, risque de double soumission), texte
 * lisible sur la couleur du club (garde-fou de contraste). L'état vient de
 * `useActionState` (3e élément) : la soumission étant manuelle (transition),
 * `useFormStatus` ne verrait rien passer.
 */
function BoutonValider({ accent, enCours }: { accent: string; enCours: boolean }) {
  return (
    <button
      type="submit"
      disabled={enCours}
      className="mono w-full px-6 py-4 text-[13px] disabled:opacity-60"
      style={{ background: accent, color: texteSur(accent) }}
    >
      {enCours ? "INSCRIPTION EN COURS…" : "VALIDER MON INSCRIPTION →"}
    </button>
  );
}

function Field({ label, name, type = "text", required, autoComplete, messageErreur }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string; messageErreur?: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label htmlFor={name} className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}{required ? " *" : ""}</label>
      <input id={name} name={name} type={type} required={required} autoComplete={autoComplete} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
      {messageErreur ? (
        <p className="mono mt-2 text-[11px]" style={{ color: "#B23B3B" }}>{messageErreur}</p>
      ) : null}
    </div>
  );
}

function ChampInput({ champ }: { champ: Champ }) {
  const name = `champ_${champ.id}`;
  const base = "mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink";
  return (
    <div className="bg-paper px-5 py-4">
      <label htmlFor={name} className="mono text-[10px] uppercase tracking-label text-ink-soft">{champ.label || "Champ"}{champ.obligatoire ? " *" : ""}</label>
      {champ.type === "zone" ? (
        <textarea id={name} name={name} required={champ.obligatoire} rows={3} className={base} />
      ) : champ.type === "choix" ? (
        <select id={name} name={name} required={champ.obligatoire} className={base}>
          <option value="">—</option>
          {(champ.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : champ.type === "case" ? (
        <div className="mt-2"><input id={name} name={name} type="checkbox" value="oui" /></div>
      ) : (
        <input
          id={name}
          name={name}
          required={champ.obligatoire}
          type={champ.type === "date" ? "date" : champ.type === "tel" ? "tel" : champ.type === "nombre" ? "number" : "text"}
          className={base}
        />
      )}
    </div>
  );
}

function Radio({ name, value, label, hint, defaultChecked }: { name: string; value: string; label: string; hint: string; defaultChecked?: boolean }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 px-5 py-4">
      <input type="radio" name={name} value={value} defaultChecked={defaultChecked} />
      <span className="flex-1 text-[15px]">{label}</span>
      <span className="mono text-[11px] text-ink-faint">{hint}</span>
    </label>
  );
}
