"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useDemo } from "./DemoProvider";

/**
 * Les briques communes aux écrans simulés.
 *
 * Un principe de vocabulaire les traverse : le dernier geste d'un parcours porte
 * TOUJOURS le mot « SIMULER ». Pas « Envoyer », pas « Encaisser », pas « Publier ». Un
 * visiteur doit pouvoir cliquer sans se demander une seconde s'il vient de déclencher
 * quelque chose de réel. C'est aussi ce qui distingue cette démonstration d'un piège à
 * conversion : on ne fabrique pas l'hésitation pour la vendre ensuite.
 */

// ——— En-tête d'écran ———————————————————————————————————————————————————————————

/**
 * L'en-tête d'une sous-page : lien de retour à gauche, kicker à droite.
 *
 * Les libellés de retour sont ceux du produit, un par écran — `← COCKPIT`,
 * `← ADHÉRENTS`, `← ENCAISSEMENTS`, `← TRÉSORERIE`, `← MESSAGERIE`, `← AUJOURD'HUI`.
 * Tout généraliser en `← AUJOURD'HUI` aurait été un raccourci, et faux.
 */
export function EnTeteDemo({ retour, libelleRetour, kicker }: { retour: string; libelleRetour: string; kicker: string }) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-8">
      <a href={retour} className="mono min-h-[44px] py-3 text-[12px] text-ink-soft hover:text-ink">
        {libelleRetour}
      </a>
      <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
        {kicker}
        <span className="cur">_</span>
      </span>
    </header>
  );
}

export function Cur() {
  return <span className="cur">_</span>;
}

// ——— Confirmation ——————————————————————————————————————————————————————————————

/**
 * Le retour après une action simulée. Il vit dans l'état global, donc il survit à une
 * navigation : un encaissement fait depuis une fiche reste visible en arrivant sur les
 * paiements.
 */
export function Confirmation() {
  const { etat, envoyer } = useDemo();
  const message = etat.confirmation;
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message) return;
    // Dix secondes : le temps de lire deux phrases sans se sentir pressé, et assez court
    // pour ne pas encombrer l'écran suivant.
    minuteur.current = setTimeout(() => envoyer({ type: "confirmation/effacer" }), 10000);
    return () => {
      if (minuteur.current) clearTimeout(minuteur.current);
    };
  }, [message, envoyer]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="mono mt-6 flex flex-wrap items-start justify-between gap-3 border px-4 py-3 text-[12px]"
      style={{ borderColor: "#1E7A4F", background: "#F1F7F3", color: "#1E7A4F" }}
    >
      <span className="flex-1">✓ {message}</span>
      <button
        type="button"
        onClick={() => envoyer({ type: "confirmation/effacer" })}
        className="mono shrink-0 underline underline-offset-2 hover:no-underline"
      >
        fermer
      </button>
    </div>
  );
}

// ——— Panneau ———————————————————————————————————————————————————————————————————

/**
 * Le conteneur des parcours en plusieurs temps. Volontairement une feuille pleine page
 * sur mobile et une colonne centrée au-delà : une modale flottante à 390 px finit
 * toujours par déborder, et un président remplit souvent un dossier debout, au bord du
 * tapis.
 */
export function Panneau({
  ouvert,
  titre,
  kicker,
  onFermer,
  children,
}: {
  ouvert: boolean;
  titre: string;
  kicker: string;
  onFermer: () => void;
  children: React.ReactNode;
}) {
  const titreId = useId();

  // Échap ferme : c'est l'attente de tout le monde, et cela évite le piège du visiteur
  // qui ne trouve pas la sortie sur un petit écran.
  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFermer();
    };
    document.addEventListener("keydown", surTouche);
    return () => document.removeEventListener("keydown", surTouche);
  }, [ouvert, onFermer]);

  if (!ouvert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/40 sm:items-start sm:py-10">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titreId}
        className="flex max-h-[92vh] w-full flex-col overflow-y-auto border border-line bg-paper sm:max-w-2xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-paper px-5 py-4">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            {kicker}
            <Cur />
          </p>
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer"
            className="mono min-h-[44px] px-3 text-[13px] text-ink-soft hover:text-ink"
          >
            ✕
          </button>
        </div>
        <div className="px-5 py-6 sm:px-8">
          <h2 id={titreId} className="text-2xl font-medium tracking-[-0.01em]">
            {titre}
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}

// ——— Champs ————————————————————————————————————————————————————————————————————

export const CHAMP_DEMO = "mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink";
export const LABEL_DEMO = "mono text-[10px] uppercase tracking-label text-ink-soft";

export function Champ({
  label,
  valeur,
  onChange,
  type = "text",
  placeholder,
  requis,
  aide,
  inputMode,
}: {
  label: string;
  valeur: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  requis?: boolean;
  aide?: string;
  inputMode?: "text" | "decimal" | "numeric" | "tel" | "email";
}) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className={LABEL_DEMO}>
        {label}
        {requis ? " *" : ""}
      </label>
      <input
        id={id}
        type={type}
        inputMode={inputMode}
        value={valeur}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={CHAMP_DEMO}
      />
      {aide ? <p className="mono mt-2 text-[11px] text-ink-soft">{aide}</p> : null}
    </div>
  );
}

// ——— Bouton de simulation ——————————————————————————————————————————————————————

/**
 * Le geste final. Il affiche brièvement un état « en cours » avant d'appeler l'action :
 * non pour imiter une latence réseau — il n'y en a pas — mais parce qu'un changement
 * instantané ne se perçoit pas, et que le visiteur doit VOIR que quelque chose s'est
 * produit. 450 ms, pas davantage : au-delà, on fait perdre du temps pour du décor.
 */
export function BoutonSimuler({
  libelle,
  onSimuler,
  desactive,
  couleur = "#111111",
  pleineLargeur = true,
}: {
  libelle: string;
  onSimuler: () => void;
  desactive?: boolean;
  couleur?: string;
  pleineLargeur?: boolean;
}) {
  const [enCours, setEnCours] = useState(false);

  // La fonction est rangée dans une ref MISE À JOUR DANS UN EFFET, jamais pendant le
  // rendu — React interdit d'y toucher à ce moment-là, et le lint le refuse à juste
  // titre : un rendu doit pouvoir être abandonné sans laisser de trace.
  //
  // Pourquoi une ref plutôt qu'une dépendance : les appelants passent une fonction
  // fléchée, dont l'identité change à chaque rendu. En dépendance, le minuteur
  // repartirait de zéro à chaque fois et le bouton resterait « SIMULATION… » sans jamais
  // aboutir.
  const rappel = useRef(onSimuler);
  useEffect(() => {
    rappel.current = onSimuler;
  }, [onSimuler]);

  useEffect(() => {
    if (!enCours) return;
    const t = setTimeout(() => {
      setEnCours(false);
      rappel.current();
    }, 450);
    // Le nettoyage n'est pas une précaution : sans lui, une simulation lancée puis
    // interrompue par « RÉINITIALISER » se déclenche quand même 450 ms plus tard, et un
    // adhérent apparaît sans que personne ne sache d'où il vient.
    return () => clearTimeout(t);
  }, [enCours]);

  return (
    <button
      type="button"
      disabled={desactive || enCours}
      onClick={() => setEnCours(true)}
      style={{ background: desactive ? undefined : couleur }}
      className={`mono px-6 py-4 text-[13px] text-paper disabled:cursor-not-allowed disabled:bg-ink/20 ${
        pleineLargeur ? "w-full sm:w-auto" : ""
      } ${desactive ? "" : "hover:opacity-90"}`}
    >
      {enCours ? "SIMULATION…" : libelle}
    </button>
  );
}

// ——— Geste hors périmètre ——————————————————————————————————————————————————————

/**
 * Les quatre gestes qui restent inertes : Stripe, le domaine, l'équipe, les emails
 * automatiques. Tous dépendent d'un tiers ou d'une adresse réelle — les simuler ne
 * montrerait rien, et les faire marcher exigerait de sortir de la démonstration.
 */
export function GesteInerte({ libelle, className }: { libelle: string; className?: string }) {
  const [dit, setDit] = useState(false);
  return (
    <span className="inline-flex flex-wrap items-center gap-3">
      <button type="button" onClick={() => setDit(true)} className={className}>
        {libelle}
      </button>
      {dit ? (
        <span role="status" className="mono text-[11px] text-ink-faint">
          Fonction désactivée dans la démonstration. Elle fonctionne dans votre club.
        </span>
      ) : null}
    </span>
  );
}
