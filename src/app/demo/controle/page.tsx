"use client";

import { useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, Cur, EnTeteDemo } from "@/components/demo/Simulation";
import { chercherPourControle, verifierAdherentDemo, type VerifDemo } from "@/lib/demo/selecteurs";
import { CLUB } from "@/lib/demo/donnees";

/**
 * LE CONTRÔLE AU BORD DU TAPIS — `cockpit/scanner/Scanner.tsx` et ses actions.
 *
 * POURQUOI « CONTRÔLE » ET NON « PRÉSENCES »
 * Le commentaire du cockpit le dit : le scan vérifie l'inscription, la cotisation ET le
 * dossier ; la feuille d'appel n'en est qu'un des usages. L'écran répond à une question
 * posée debout, en dix secondes, une personne devant soi.
 *
 * CE QUE JE N'AI PAS REPRODUIT, ET POURQUOI
 * La caméra. `getUserMedia` demanderait l'autorisation d'accéder à l'objectif d'un
 * visiteur venu lire une page de site — et il n'existe de toute façon aucune carte à
 * présenter, les adhérents de ce club sont inventés. Ouvrir la caméra pour ne rien
 * pouvoir lire aurait été pire qu'un bouton honnête.
 *
 * À LA PLACE : UNE ROTATION DE CARTES, ET ELLE EST ANNONCÉE
 * Chaque appui présente la carte suivante. Les trois premières sont choisies dans le
 * club pour montrer les trois réponses qui comptent — à jour, non réglé, dossier
 * incomplet. La quatrième est une carte que ce club ne connaît pas : c'est le cas réel
 * d'une vieille carte ou de celle d'un autre club, et c'est le seul chemin vers
 * « Adhérent introuvable. ». Le rythme est écrit sous le bouton ; une démonstration qui
 * cache son fonctionnement n'est plus une démonstration.
 *
 * LES DEUX MODES COEXISTENT, comme dans le produit : la recherche par nom reste
 * disponible en permanence, et c'est elle qu'on utilise quand la carte est restée dans
 * le sac.
 */

/** L'identifiant qu'aucun adhérent ne porte — la carte venue d'ailleurs. */
const CARTE_INCONNUE = "carte-dun-autre-club";

/**
 * Les cartes de la rotation, recalculées à chaque appui.
 *
 * Sur l'état COURANT, pas sur l'état initial : si le visiteur vient d'encaisser la
 * cotisation d'Anne, sa carte doit dire « À jour ». Figer la liste au montage aurait
 * fait mentir l'écran dès la première action faite ailleurs.
 */
function rotation(etat: ReturnType<typeof useDemo>["etat"]): string[] {
  const vus = etat.adherents.map((a) => verifierAdherentDemo(etat, a.id)!);
  const choix = [
    vus.find((v) => v.regle && v.piecesManquantes === 0),
    vus.find((v) => !v.regle),
    vus.find((v) => v.piecesManquantes > 0),
  ];
  // Un même adhérent peut cocher deux cases (non réglé ET dossier incomplet) : le `Set`
  // évite de le présenter deux fois de suite, ce qui donnerait l'impression d'un bouton
  // cassé.
  const ids = [...new Set(choix.filter((v): v is VerifDemo => !!v).map((v) => v.id))];
  return [...ids, CARTE_INCONNUE];
}

export default function DemoControle() {
  const { etat, envoyer } = useDemo();

  const [carte, setCarte] = useState(0);
  const [resultat, setResultat] = useState<VerifDemo | null>(null);
  const [introuvable, setIntrouvable] = useState(false);
  const [q, setQ] = useState("");

  const liste = chercherPourControle(etat, q);

  const presenter = (id: string) => {
    const v = verifierAdherentDemo(etat, id);
    setResultat(v);
    setIntrouvable(v === null);
  };

  const scanner = () => {
    const cartes = rotation(etat);
    const id = cartes[carte % cartes.length];
    setCarte((n) => n + 1);
    setQ("");
    presenter(id);
  };

  // Relu à chaque rendu : après « SIMULER LA PRÉSENCE », l'encart doit basculer sans
  // qu'on ait à recopier l'état dans une variable locale — c'est exactement là que les
  // deux se désynchronisent.
  const vu = resultat ? verifierAdherentDemo(etat, resultat.id) : null;

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker="SCANNER · APPEL" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          PRÉSENCE — {CLUB.nom}
          <Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Faire l’appel.</h1>

        {/* ——— La carte ——————————————————————————————————————————————————— */}
        <div className="mt-8">
          <button
            type="button"
            onClick={scanner}
            className="mono min-h-[44px] w-full bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90 sm:w-auto"
          >
            SIMULER UN SCAN →
          </button>
          <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-soft">
            Chaque appui présente une carte différente, comme à l’entrée d’un cours — dont, à la fin de
            la rotation, une carte que ce club ne connaît pas.
          </p>
          <p className="mono mt-2 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            La caméra n’est pas ouverte ici. Dans votre club, ce bouton lit le QR de la carte de membre.
          </p>
        </div>

        {/* ——— Ou rechercher ——————————————————————————————————————————————— */}
        <div className="mt-10">
          <label htmlFor="q-controle" className="mono text-[11px] uppercase tracking-label text-ink-soft">
            OU RECHERCHER
            <Cur />
          </label>
          <input
            id="q-controle"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Nom ou prénom"
            className="mt-3 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          {liste.length > 0 ? (
            <div className="mt-2 divide-y divide-line border border-line bg-paper">
              {liste.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setQ("");
                    presenter(m.id);
                  }}
                  className="block min-h-[44px] w-full px-4 py-3 text-left text-[14px] hover:bg-bg-alt"
                >
                  {m.prenom} {m.nom}
                </button>
              ))}
            </div>
          ) : null}
          {q.trim().length >= 2 && liste.length === 0 ? (
            <p className="mono mt-2 text-[11px] text-ink-faint">Aucun adhérent ne porte ce nom.</p>
          ) : null}
        </div>

        {/* ——— Le verdict ——————————————————————————————————————————————————— */}
        {introuvable ? (
          <div className="mt-10 border border-line bg-paper p-6">
            <p className="mono text-[13px]" style={{ color: "#B23B3B" }}>
              Adhérent introuvable.
            </p>
            <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-soft">
              Une carte d’une autre association, ou d’une saison passée. Le message est le même dans les
              deux cas — au bord du tapis, la seule suite utile est de chercher la personne par son nom.
            </p>
          </div>
        ) : vu ? (
          <div className="mt-10 border border-line bg-paper p-6">
            <div className="text-2xl font-medium tracking-[-0.01em]">
              {vu.prenom} {vu.nom}
            </div>
            <div className="text-ink-soft">{vu.cours ?? "—"}</div>

            <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
              <Etat label="RÈGLEMENT" ok={vu.regle} okText="À jour" koText="Non réglé" />
              <Etat
                label="DOSSIER"
                ok={vu.piecesManquantes === 0}
                okText="Complet"
                koText={`${vu.piecesManquantes} pièce(s) manquante(s)`}
              />
            </div>

            <div className="mt-6">
              {vu.present ? (
                <span className="mono text-[13px]" style={{ color: CLUB.couleur }}>
                  ✓ PRÉSENT AUJOURD’HUI
                </span>
              ) : (
                <BoutonSimuler
                  libelle="SIMULER LA PRÉSENCE →"
                  couleur={CLUB.couleur}
                  onSimuler={() => envoyer({ type: "presence/marquer", adherentId: vu.id })}
                />
              )}
            </div>

            <p className="mono mt-5 max-w-prose text-[11px] leading-relaxed text-ink-faint">
              Un dossier incomplet ou une cotisation en attente n’empêchent pas d’entrer : l’écran informe,
              il ne barre pas la porte.
            </p>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Etat({ label, ok, okText, koText }: { label: string; ok: boolean; okText: string; koText: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-2 text-[15px] font-bold" style={{ color: ok ? "#1E7A4F" : "#B23B3B" }}>
        {ok ? `✓ ${okText}` : `✕ ${koText}`}
      </div>
    </div>
  );
}
