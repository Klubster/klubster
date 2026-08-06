"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, Confirmation, Cur, EnTeteDemo } from "@/components/demo/Simulation";
import { CLUB, dateFr } from "@/lib/demo/donnees";
import { jaugeDuCours } from "@/lib/demo/selecteurs";
import type { Creneau, CoursDemo } from "@/lib/demo/types";

/**
 * COURS ET TARIFS — `cockpit/cours/page.tsx` et `components/site/CoursEditeur.tsx`.
 *
 * C'EST L'ÉCRAN QUI DÉMONTRE LE PRODUIT LE MIEUX, et pour une raison simple : un tarif
 * modifié ici change la vitrine, le formulaire d'inscription et le montant des nouvelles
 * adhésions, sans une seule manipulation de plus. La démonstration le rend vérifiable —
 * l'aperçu du formulaire et la vitrine lisent le même état.
 *
 * TROIS RÈGLES DU PRODUIT, REPRISES TELLES QUELLES
 *
 * 1. UN COURS QUI COMPTE DES ADHÉRENTS NE SE SUPPRIME PAS. Le serveur le refuse, et
 *    l'écran le dit AVANT le clic plutôt que de faire espérer. Dans ce club, les six
 *    cours ont des inscrits : la suppression n'est atteignable que sur un cours créé
 *    pendant la visite — ce qui est exactement le cas où elle sert.
 * 2. LA JAUGE EST LE SEUL DÉCLENCHEUR DE LA LISTE D'ATTENTE. `places_max` vide ou nul
 *    signifie illimité ; le compte des occupants ne retient que la saison courante et
 *    les statuts actifs (`en_attente`, `en_retard`, `paye`). Une personne en liste
 *    d'attente n'occupe pas la place qu'elle attend.
 * 3. LA LISTE D'ATTENTE EST SERVIE DANS L'ORDRE D'ARRIVÉE. « Donner une place » fait
 *    passer l'adhésion en « en attente » de règlement, et prévient la personne par
 *    email — ici, rien ne part.
 *
 * CE QUE L'ÉCRAN NE PROPOSE PAS, ET QU'ON CHERCHE : changer le cours d'un adhérent. La
 * fiche adhérent ne le permet pas non plus. Le produit énonce le fait sans prescrire un
 * geste impossible, et la phrase de bas de page est reprise mot pour mot.
 */

const JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

const euros = (centimes: number) => (centimes / 100).toFixed(2).replace(".", ",");

const CHAMP = "mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink";
const LABEL = "mono text-[11px] uppercase tracking-label text-ink-soft";

/**
 * L'éditeur d'un cours.
 *
 * Isolé, et remonté par une `key` calculée sur les valeurs ENREGISTRÉES : après une
 * modification, les champs doivent suivre la fiche telle qu'elle est en état, sans
 * qu'un effet de resynchronisation vienne effacer une saisie en cours ailleurs. Même
 * raisonnement que le formulaire de coordonnées de la fiche adhérent.
 */
function EditeurCours({
  cours,
  inscrits,
  actifs,
  attente,
  onEnregistrer,
  onSupprimer,
}: {
  cours: CoursDemo;
  inscrits: number;
  actifs: number;
  attente: number;
  onEnregistrer: (v: { nom: string; publicCible: string; tarifCentimes: number; placesMax: number | null; creneaux: Creneau[] }) => void;
  onSupprimer: () => void;
}) {
  const [nom, setNom] = useState(cours.nom);
  const [cible, setCible] = useState(cours.public_cible ?? "");
  const [tarif, setTarif] = useState(euros(cours.tarif_centimes));
  const [places, setPlaces] = useState(cours.places_max != null ? String(cours.places_max) : "");
  const [creneaux, setCreneaux] = useState<Creneau[]>(cours.creneaux);
  const [confirme, setConfirme] = useState(false);

  const majCreneau = (i: number, champ: keyof Creneau, valeur: string) =>
    setCreneaux((cs) => cs.map((c, j) => (j === i ? { ...c, [champ]: valeur } : c)));

  return (
    <div className="border border-line bg-paper px-5 py-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_1fr_140px]">
        <label className="block">
          <span className={LABEL}>Nom du cours</span>
          <input value={nom} onChange={(e) => setNom(e.target.value)} aria-label={`Nom du cours ${cours.nom}`} className={CHAMP} />
        </label>
        <label className="block">
          <span className={LABEL}>Public (facultatif)</span>
          <input
            value={cible}
            onChange={(e) => setCible(e.target.value)}
            placeholder="Ados, adultes, débutants…"
            aria-label={`Public du cours ${cours.nom}`}
            className={CHAMP}
          />
        </label>
        <label className="block">
          <span className={LABEL}>Tarif (€)</span>
          <input
            value={tarif}
            onChange={(e) => setTarif(e.target.value)}
            inputMode="decimal"
            aria-label={`Tarif du cours ${cours.nom}`}
            className={CHAMP}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="block w-[160px]">
          <span className={LABEL}>Places (jauge)</span>
          <input
            value={places}
            onChange={(e) => setPlaces(e.target.value)}
            inputMode="numeric"
            placeholder="illimité"
            aria-label={`Places du cours ${cours.nom}`}
            className={CHAMP}
          />
        </label>
        {cours.places_max != null ? (
          <p className="mono pb-2.5 text-[12px] text-ink-soft">
            {actifs}/{cours.places_max} inscrits
            {attente > 0 ? ` · ${attente} en liste d’attente` : ""}
          </p>
        ) : (
          <p className="mono pb-2.5 text-[12px] text-ink-soft">
            Sans limite. Indiquez un nombre pour activer la liste d’attente quand c’est complet.
          </p>
        )}
      </div>

      <p className="mono mt-6 text-[11px] uppercase tracking-label text-ink-soft">Créneaux</p>
      <div className="mt-2 space-y-2">
        {creneaux.length === 0 ? (
          <p className="text-[14px] text-ink-soft">Aucun créneau. Le cours s’affichera sans horaire.</p>
        ) : null}
        {creneaux.map((c, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2">
            <select
              value={c.jour}
              onChange={(e) => majCreneau(i, "jour", e.target.value)}
              aria-label={`Jour du créneau ${i + 1} de ${cours.nom}`}
              className="min-h-[44px] border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            >
              {JOURS.map((j) => (
                <option key={j} value={j}>
                  {j.charAt(0).toUpperCase() + j.slice(1)}
                </option>
              ))}
            </select>
            <input
              type="time"
              value={c.debut}
              onChange={(e) => majCreneau(i, "debut", e.target.value)}
              aria-label={`Début du créneau ${i + 1} de ${cours.nom}`}
              className="min-h-[44px] border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            />
            <span className="text-ink-soft">→</span>
            <input
              type="time"
              value={c.fin}
              onChange={(e) => majCreneau(i, "fin", e.target.value)}
              aria-label={`Fin du créneau ${i + 1} de ${cours.nom}`}
              className="min-h-[44px] border border-line bg-paper px-3 py-2 outline-none focus:border-ink"
            />
            <input
              value={c.note}
              onChange={(e) => majCreneau(i, "note", e.target.value)}
              placeholder="précision (8-12 ans…)"
              aria-label={`Précision du créneau ${i + 1} de ${cours.nom}`}
              className="min-w-[150px] flex-1 border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink"
            />
            <button
              type="button"
              onClick={() => setCreneaux((cs) => cs.filter((_, j) => j !== i))}
              className="mono min-h-[44px] px-2 py-2 text-[12px] text-ink-soft hover:text-ink"
              aria-label={`Retirer le créneau ${i + 1} de ${cours.nom}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setCreneaux((cs) => [...cs, { jour: "lundi", debut: "18:00", fin: "19:30", note: "" }])}
          aria-label={`Ajouter un créneau à ${cours.nom}`}
          className="mono min-h-[44px] border border-line px-4 py-2 text-[12px] hover:border-ink"
        >
          + AJOUTER UN CRÉNEAU
        </button>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
        <BoutonSimuler
          libelle="SIMULER L’ENREGISTREMENT"
          nomAccessible={`Enregistrer les modifications de ${cours.nom}`}
          pleineLargeur={false}
          couleur={CLUB.couleurTexte}
          onSimuler={() =>
            onEnregistrer({
              nom,
              publicCible: cible,
              // Une saisie illisible vaut zéro, jamais NaN : `Math.round(NaN)` glisserait
              // en base et le tarif d'un cours deviendrait vide à l'écran.
              tarifCentimes: Math.round(Number(tarif.replace(",", ".")) * 100) || 0,
              placesMax: places.trim() === "" ? null : Math.round(Number(places.replace(",", "."))) || null,
              creneaux,
            })
          }
        />

        {/* Dit avant le clic, pas après : le serveur refuse, autant ne pas faire espérer. */}
        {inscrits > 0 ? (
          <span className="mono text-[11px] text-ink-soft">
            {inscrits} adhérent{inscrits > 1 ? "s" : ""} — suppression impossible
          </span>
        ) : confirme ? (
          <span className="mono flex flex-wrap items-center gap-3 text-[12px]">
            <span className="text-ink-soft">Supprimer « {cours.nom} » ?</span>
            <button type="button" onClick={onSupprimer} className="min-h-[44px] text-danger underline underline-offset-2">
              Oui, supprimer
            </button>
            <button type="button" onClick={() => setConfirme(false)} className="min-h-[44px] text-ink-soft underline underline-offset-2">
              Annuler
            </button>
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setConfirme(true)}
            aria-label={`Supprimer le cours ${cours.nom}`}
            className="mono min-h-[44px] text-[11px] text-ink-soft underline underline-offset-2 hover:text-ink"
          >
            Supprimer ce cours
          </button>
        )}
      </div>
    </div>
  );
}

export default function DemoCours() {
  const { etat, envoyer } = useDemo();
  const [nouveauNom, setNouveauNom] = useState("");
  const [nouveauTarif, setNouveauTarif] = useState("0");

  const inscritsParCours = (id: string) => etat.adhesions.filter((a) => a.cours_id === id).length;

  // Premier arrivé, premier servi : l'ordre d'arrivée, pas l'ordre alphabétique.
  const listeAttente = etat.adhesions
    .filter((a) => a.statut === "liste_attente" && a.saison === CLUB.saison)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const nomDe = (id: string | null) => (id ? etat.cours.find((c) => c.id === id)?.nom ?? "—" : "—");
  const personne = (id: string) => etat.adherents.find((a) => a.id === id);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← COCKPIT" kicker="COURS ET TARIFS" />

      <div className="mx-auto max-w-4xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">{etat.cours.length} cours</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Les horaires changent, les tarifs augmentent, une activité s’ajoute en janvier. Tout se
          modifie ici, et votre site comme vos inscriptions suivent immédiatement.
        </p>

        <Confirmation />

        <div className="mt-10 space-y-4">
          {etat.cours.map((c) => {
            const { inscrits, attente } = jaugeDuCours(etat, c.id);
            return (
              <EditeurCours
                // La clé porte les valeurs ENREGISTRÉES : les champs suivent l'état après
                // une modification, sans effet de resynchronisation.
                key={`${c.id}-${c.nom}-${c.tarif_centimes}-${c.places_max}-${c.creneaux.length}`}
                cours={c}
                inscrits={inscritsParCours(c.id)}
                actifs={inscrits}
                attente={attente}
                onEnregistrer={(v) => envoyer({ type: "cours/modifier", id: c.id, ...v })}
                onSupprimer={() => envoyer({ type: "cours/supprimer", id: c.id })}
              />
            );
          })}
        </div>

        {/* ——— Liste d'attente ————————————————————————————————————————————— */}
        {listeAttente.length > 0 ? (
          <section className="mt-12">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              LISTE D’ATTENTE — {listeAttente.length} personne{listeAttente.length > 1 ? "s" : ""}
              <Cur />
            </p>
            <p className="mt-2 max-w-prose text-[14px] text-ink-soft">
              Inscrites quand leur cours était complet. Donnez une place dès qu’une se libère : la
              personne est prévenue par email et son adhésion devient « en attente » de règlement.
            </p>
            <div className="mt-4 border border-line">
              {listeAttente.map((a) => {
                const p = personne(a.adherent_id);
                return (
                  <div
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4 last:border-b-0"
                  >
                    <div>
                      <Link
                        href={`/demo/adherents/${a.adherent_id}`}
                        className="inline-block min-h-[44px] py-3 text-[15px] font-medium hover:underline"
                      >
                        {p?.prenom} {p?.nom}
                      </Link>
                      <p className="mono mt-0.5 text-[12px] text-ink-soft">
                        {nomDe(a.cours_id)} · en attente depuis le {dateFr(a.created_at)}
                      </p>
                    </div>
                    <BoutonSimuler
                      libelle="SIMULER : DONNER UNE PLACE →"
                      nomAccessible={`Donner une place à ${p?.prenom} ${p?.nom}`}
                      pleineLargeur={false}
                      couleur={CLUB.couleurTexte}
                      onSimuler={() => envoyer({ type: "listeAttente/promouvoir", adhesionId: a.id })}
                    />
                  </div>
                );
              })}
            </div>
          </section>
        ) : null}

        {/* ——— Ajouter un cours ———————————————————————————————————————————
            Un nom, un tarif. Les créneaux se posent ensuite, dans la fiche. */}
        <div className="mt-10 border border-line bg-bg-alt px-5 py-5">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            Ajouter un cours
            <Cur />
          </p>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="block min-w-[200px] flex-1">
              <span className="mono text-[11px] text-ink-soft">Nom</span>
              <input
                value={nouveauNom}
                onChange={(e) => setNouveauNom(e.target.value)}
                placeholder="Boxe loisirs"
                aria-label="Nom du nouveau cours"
                className={CHAMP}
              />
            </label>
            <label className="block w-[140px]">
              <span className="mono text-[11px] text-ink-soft">Tarif (€)</span>
              <input
                value={nouveauTarif}
                onChange={(e) => setNouveauTarif(e.target.value)}
                inputMode="decimal"
                aria-label="Tarif du nouveau cours"
                className={CHAMP}
              />
            </label>
            <BoutonSimuler
              libelle="SIMULER L’AJOUT →"
              pleineLargeur={false}
              desactive={nouveauNom.trim().length === 0}
              onSimuler={() => {
                envoyer({
                  type: "cours/ajouter",
                  nom: nouveauNom.trim(),
                  tarifCentimes: Math.round(Number(nouveauTarif.replace(",", ".")) * 100) || 0,
                });
                setNouveauNom("");
                setNouveauTarif("0");
              }}
            />
          </div>
        </div>

        {/* PHRASE REPRISE MOT POUR MOT, y compris ce qu'elle NE dit pas. Le commentaire
            du produit interdit d'y remettre « Déplacez-les d'abord, depuis leur fiche » :
            la fiche adhérent ne propose aucun changement de cours, et envoyer chercher un
            bouton qui n'existe pas fait conclure à un président qu'il n'a pas compris. */}
        <p className="mono mt-10 text-[11px] leading-relaxed text-ink-soft">
          Un cours qui compte des adhérents ne peut pas être supprimé : leurs dossiers y sont
          rattachés.
        </p>
      </div>
    </main>
  );
}
