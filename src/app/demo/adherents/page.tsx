"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { Confirmation, Cur, EnTeteDemo } from "@/components/demo/Simulation";
import { FILTRES_STATUT, listerAdherents, paginer } from "@/lib/demo/selecteurs";
import { COLONNES_EXPORT, NOM_FICHIER_EXPORT, construireCsvAdherents, telecharger } from "@/lib/demo/csv";
import { eur } from "@/lib/demo/donnees";

/**
 * La liste des adhérents, reprise de `cockpit/adherents/page.tsx`.
 *
 * CE QUE LA LIGNE MONTRE, ET RIEN DE PLUS : prénom et nom, cours, email s'il existe,
 * statut, montant. Pas de téléphone — il est sur la fiche. Et surtout, pas de faux
 * libellé pour un adhérent sans adresse : la place reste vide, elle ne dit pas
 * « pas d'email ».
 *
 * LE TRI EST FIXE, par nom croissant. Le produit ne propose aucun tri, et un en-tête
 * cliquable ici laisserait croire le contraire.
 */

const ETAT_LIGNE: Record<string, { texte: string; couleur: string }> = {
  paye: { texte: "Payé", couleur: "#1E7A4F" },
  en_retard: { texte: "En retard", couleur: "#B23B3B" },
  liste_attente: { texte: "Liste d’attente", couleur: "#6f6f6b" },
  en_attente: { texte: "En attente", couleur: "#8A6508" },
};

export default function DemoAdherents() {
  const { etat, envoyer } = useDemo();
  const [q, setQ] = useState("");
  const [statut, setStatut] = useState("");
  const [page, setPage] = useState(1);

  const lignes = useMemo(() => listerAdherents(etat, { q, statut }), [etat, q, statut]);
  // `paginer` ramène une page hors bornes dans les limites : après avoir filtré ou
  // supprimé, on ne tombe jamais sur un écran vide en croyant qu'il n'y a personne.
  const { page: pageCourante, pages, debut, tranche } = paginer(lignes, page);

  // Toute recherche ou tout filtre RAMÈNE À LA PAGE 1. Sans cela, chercher un nom
  // depuis la page 2 donnerait une liste vide — le résultat existe, il est page 1.
  const chercher = (v: string) => {
    setQ(v);
    setPage(1);
  };
  const filtrer = (v: string) => {
    setStatut(v);
    setPage(1);
  };

  const exporter = () =>
    telecharger(construireCsvAdherents(etat.adherents, etat.adhesions, etat.cours), NOM_FICHIER_EXPORT);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← COCKPIT" kicker="ADHÉRENTS" />

      <div className="mx-auto max-w-5xl px-6 py-12 md:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="text-3xl font-medium tracking-[-0.01em]">
            {etat.adherents.length} adhérent{etat.adherents.length > 1 ? "s" : ""}
          </h1>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
            <Link
              href="/demo/adherents/import"
              className="mono min-h-[44px] border border-ink px-5 py-3 text-center text-[12px] hover:bg-ink hover:text-paper"
            >
              IMPORTER UN FICHIER
            </Link>
            <Link
              href="/demo/adherents/nouveau"
              className="mono min-h-[44px] bg-ink px-5 py-3 text-center text-[12px] text-paper hover:bg-ink/90"
            >
              AJOUTER UN ADHÉRENT →
            </Link>
          </div>
        </div>

        <Confirmation />

        {/* NOUVELLE SAISON — le bloc que la première spécification omettait.
            Idempotent : un second clic annonce zéro, il ne double pas l'effectif. */}
        <div className="mt-6 border border-line bg-bg-alt px-5 py-4">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            NOUVELLE SAISON<Cur />
          </p>
          <p className="mt-1 text-[13px] text-ink-soft">
            Recrée une adhésion « en attente » pour chaque adhérent qui n’en a pas encore cette saison,
            avec son dernier cours.
          </p>
          <button
            type="button"
            onClick={() => envoyer({ type: "saison/renouveler" })}
            className="mono mt-3 min-h-[44px] w-full border border-ink px-5 py-3 text-[12px] hover:bg-ink hover:text-paper sm:w-auto"
          >
            RENOUVELER LA SAISON →
          </button>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <label htmlFor="recherche" className="sr-only">
            Rechercher un adhérent par nom, prénom ou email
          </label>
          <input
            id="recherche"
            type="search"
            value={q}
            onChange={(e) => chercher(e.target.value)}
            placeholder="Rechercher un nom, un prénom, un email…"
            className="min-h-[44px] min-w-[260px] flex-1 border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          <label htmlFor="filtre" className="sr-only">
            Filtrer par statut de paiement
          </label>
          <select
            id="filtre"
            value={statut}
            onChange={(e) => filtrer(e.target.value)}
            className="min-h-[44px] border border-line bg-paper px-3 py-3 outline-none focus:border-ink"
          >
            {FILTRES_STATUT.map((f) => (
              <option key={f.valeur} value={f.valeur}>
                {f.libelle}
              </option>
            ))}
          </select>
          {q || statut ? (
            <button
              type="button"
              onClick={() => {
                chercher("");
                filtrer("");
              }}
              className="mono min-h-[44px] px-2 text-[12px] text-ink-soft hover:text-ink"
            >
              Effacer
            </button>
          ) : null}
        </div>

        {tranche.length === 0 ? (
          <p className="mt-12 text-lg text-ink-soft">
            {q || statut
              ? "Aucun adhérent ne correspond à cette recherche."
              : "Aucun adhérent pour l’instant. Ils apparaîtront ici dès la première inscription."}
          </p>
        ) : (
          <div className="mt-8 border border-line">
            {tranche.map(({ adherent, adhesion, nomCours }) => {
              const e = adhesion ? ETAT_LIGNE[adhesion.statut] ?? ETAT_LIGNE.en_attente : null;
              return (
                <Link
                  key={adherent.id}
                  href={`/demo/adherents/${adherent.id}`}
                  className="grid grid-cols-1 gap-1 border-b border-line px-5 py-4 last:border-b-0 hover:bg-bg-alt focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] sm:grid-cols-[1fr_1fr_auto] sm:items-center sm:gap-4"
                  style={{ outlineColor: "#1E7A4F" }}
                >
                  <span className="text-[15px] font-medium">
                    {adherent.prenom} {adherent.nom}
                  </span>
                  <span className="mono text-[12px] text-ink-soft">
                    {nomCours ?? "—"}
                    {/* Un adhérent sans email n'affiche rien ici : pas de libellé de
                        remplacement, qui ferait passer une absence pour une donnée. */}
                    {adherent.email ? <span className="block truncate">{adherent.email}</span> : null}
                  </span>
                  <span className="mono text-[11px] uppercase tracking-wide">
                    {e ? (
                      <span style={{ color: e.couleur }}>{e.texte}</span>
                    ) : (
                      <span className="text-ink-faint">Sans adhésion</span>
                    )}
                    {adhesion ? <span className="ml-2 text-ink-soft">{eur(adhesion.montant_centimes)}</span> : null}
                  </span>
                </Link>
              );
            })}
          </div>
        )}

        {pages > 1 ? (
          <div className="mono mt-8 flex items-center justify-between text-[12px]">
            {pageCourante > 1 ? (
              <button type="button" onClick={() => setPage(pageCourante - 1)} className="min-h-[44px] hover:text-ink">
                ← Précédents
              </button>
            ) : (
              <span />
            )}
            <span className="text-ink-soft">
              Page {pageCourante} sur {pages}
            </span>
            {pageCourante < pages ? (
              <button type="button" onClick={() => setPage(pageCourante + 1)} className="min-h-[44px] hover:text-ink">
                Suivants →
              </button>
            ) : (
              <span />
            )}
          </div>
        ) : null}

        {/* Export DIRECT, sans fenêtre de paramétrage : le produit n'en a pas. */}
        <button
          type="button"
          onClick={exporter}
          className="mono mt-10 min-h-[44px] text-[11px] text-ink-soft underline underline-offset-2 hover:text-ink"
        >
          Exporter la liste complète en CSV
        </button>
        <p className="mono mt-2 text-[11px] text-ink-faint">
          {COLONNES_EXPORT.length} colonnes, séparateur point-virgule, généré dans votre navigateur.
          Rien n’est envoyé.
        </p>

        {debut + tranche.length > 0 ? (
          <p className="mono mt-6 text-[11px] text-ink-faint">
            {debut + 1}–{debut + tranche.length} sur {lignes.length}
          </p>
        ) : null}
      </div>
    </main>
  );
}
