"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, CHAMP_DEMO, Confirmation, Cur, EnTeteDemo, LABEL_DEMO } from "@/components/demo/Simulation";
import { AUJOURDHUI, CLUB, dateLongue } from "@/lib/demo/donnees";
import { actualitesVitrine, dateSureDemo, resumeActu } from "@/lib/demo/selecteurs";

/**
 * L'ATELIER DES ACTUALITÉS — `cockpit/actualite/page.tsx` et `actions.ts`.
 *
 * DEUX GESTES, ET DEUX SEULEMENT : publier, supprimer. Le code du produit le dit en
 * clair, à la ligne qui précède le bouton de suppression :
 *
 *     {/* Pas d'édition en v1 : supprimer puis republier fait le travail. *␣/}
 *
 * Donc : ni édition, ni brouillon, ni catégorie, ni réordonnancement, ni planification —
 * malgré ce que la présence d'une DATE DE PUBLICATION peut laisser croire. Cette date
 * n'ordonnance rien : l'actualité est visible dès qu'elle est enregistrée, même datée du
 * mois prochain. Le schéma réel (`0019_actualites.sql`) n'a que sept colonnes : `id`,
 * `organisation_id`, `titre`, `texte`, `image_url`, `publie_le`, `created_at`. Pas de
 * statut, pas de brouillon, pas d'`updated_at`, pas d'auteur.
 *
 * LA LISTE N'A PAS D'ÉTAT VIDE : `{actus.length > 0 ? … : null}`. Un club qui n'a rien
 * publié ne voit que le formulaire. C'est la règle « jamais d'état vide affiché » du
 * projet, et la démonstration la garde même si son club part avec trois actualités.
 *
 * L'IMAGE : le champ existe, et le geste de choisir un fichier aussi. Rien n'est lu ni
 * envoyé — la simulation n'enregistre qu'un booléen, `aUneImage`, et la vitrine affiche
 * un cadre à la place de la photo. Ouvrir le sélecteur de fichiers du visiteur reste
 * local à sa machine ; c'est le seul endroit de la démonstration où un fichier est
 * DÉSIGNÉ, et nulle part où il est LU.
 */

export default function DemoActualites() {
  const { etat, envoyer } = useDemo();

  const [titre, setTitre] = useState("");
  const [texte, setTexte] = useState("");
  const [publieLe, setPublieLe] = useState(AUJOURDHUI);
  const [nomImage, setNomImage] = useState<string | null>(null);
  const champImage = useRef<HTMLInputElement>(null);

  // Le produit s'appuie sur `required` : le navigateur refuse l'envoi. Sans formulaire à
  // soumettre ici, c'est le bouton qui porte la règle — même effet, dit plus tôt.
  const pret = titre.trim().length > 0 && texte.trim().length > 0;

  const publier = () => {
    envoyer({
      type: "actualite/publier",
      titre: titre.trim().slice(0, 120),
      texte: texte.trim().slice(0, 5000),
      publieLe: dateSureDemo(publieLe, AUJOURDHUI),
      aUneImage: nomImage !== null,
    });
    setTitre("");
    setTexte("");
    setPublieLe(AUJOURDHUI);
    setNomImage(null);
    if (champImage.current) champImage.current.value = "";
  };

  const vitrine = actualitesVitrine(etat);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker="ATELIER · ACTUALITÉS" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          LA VIE DU CLUB — {CLUB.nom}
          <Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Vos actualités.</h1>
        <p className="mt-3 text-ink-soft">
          Chaque actualité a sa page sur votre site. La plus récente s’affiche « À la une » tout en
          haut de votre vitrine, et les trois dernières dans le chapitre « La vie du club ».
        </p>

        <Confirmation />

        {/* ——— Publier ————————————————————————————————————————————————————— */}
        <div className="mt-8 space-y-6">
          <div className="border border-line bg-paper px-5 py-4">
            <label htmlFor="da-titre" className={LABEL_DEMO}>
              TITRE
            </label>
            <input
              id="da-titre"
              value={titre}
              maxLength={120}
              onChange={(e) => setTitre(e.target.value)}
              placeholder="Reprise des cours le 4 septembre"
              className={CHAMP_DEMO}
            />
          </div>

          <div className="border border-line bg-paper px-5 py-4">
            <label htmlFor="da-texte" className={LABEL_DEMO}>
              TEXTE
            </label>
            <textarea
              id="da-texte"
              value={texte}
              rows={5}
              onChange={(e) => setTexte(e.target.value)}
              placeholder="Le détail — il s’affiche sur la page de l’actualité. Une ligne vide sépare deux paragraphes."
              className={CHAMP_DEMO}
            />
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="border border-line bg-paper px-5 py-4">
              <label htmlFor="da-date" className={LABEL_DEMO}>
                DATE DE PUBLICATION
              </label>
              <input
                id="da-date"
                type="date"
                value={publieLe}
                onChange={(e) => setPublieLe(e.target.value)}
                className={CHAMP_DEMO}
              />
            </div>
            <div className="border border-line bg-paper px-5 py-4">
              <label htmlFor="da-image" className={LABEL_DEMO}>
                IMAGE (OPTIONNELLE)
              </label>
              <input
                id="da-image"
                ref={champImage}
                type="file"
                accept="image/*"
                onChange={(e) => setNomImage(e.target.files?.[0]?.name ?? null)}
                className="mt-2 block w-full text-[13px]"
              />
              <p className="mono mt-2 text-[11px] text-ink-soft">JPG ou PNG, format paysage conseillé.</p>
              {nomImage ? (
                <p className="mono mt-2 text-[11px] text-ink-soft">
                  {nomImage} — le fichier reste sur votre appareil, il n’est ni lu ni envoyé.
                </p>
              ) : null}
            </div>
          </div>

          <BoutonSimuler libelle="SIMULER LA PUBLICATION →" onSimuler={publier} desactive={!pret} />

          {!pret ? (
            <p className="mono text-[11px] text-ink-soft">
              Le titre et le texte sont obligatoires.
            </p>
          ) : null}
        </div>

        {/* ——— Déjà publiées ———————————————————————————————————————————————
            Rendue seulement si la liste n'est pas vide, comme dans le produit. */}
        {etat.actualites.length > 0 ? (
          <div className="mt-12">
            <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
              DÉJÀ PUBLIÉES
              <Cur />
            </p>
            <div className="mt-4 border-t border-line">
              {etat.actualites.map((a) => (
                <div key={a.id} className="flex items-start justify-between gap-4 border-b border-line py-4">
                  <div className="min-w-0">
                    <p className="mono text-[11px] text-ink-soft">{dateLongue(a.publie_le)}</p>
                    <p className="mt-1 truncate text-[15px] font-medium">{a.titre}</p>
                    <Link
                      href={`/demo/actualites/${a.id}`}
                      className="mono mt-1 inline-block min-h-[44px] py-3 text-[11px] text-ink-soft hover:text-ink"
                    >
                      VOIR LA PAGE →
                    </Link>
                  </div>
                  {/* Pas d'édition : supprimer puis republier, comme dans le produit. */}
                  <button
                    type="button"
                    onClick={() => envoyer({ type: "actualite/supprimer", id: a.id })}
                    className="mono min-h-[44px] shrink-0 border border-line px-3 py-2 text-[11px] uppercase tracking-wide text-danger hover:border-ink"
                  >
                    Supprimer
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ——— L'effet sur la vitrine ——————————————————————————————————————
            Ce n'est pas un geste de plus : c'est la vérification de la phrase du chapô.
            Le président ne devrait pas avoir à ouvrir son site pour savoir ce qu'une
            publication y change — et c'est précisément ce que la démonstration peut
            montrer et que le cockpit réel ne montre pas. */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            SUR VOTRE VITRINE
            <Cur />
          </p>

          <div className="mt-4 border border-line bg-paper">
            {vitrine.length > 0 ? (
              <div className="px-5 py-4" style={{ background: `color-mix(in srgb, ${CLUB.couleur} 10%, #FCFCFA)` }}>
                <p className="mono text-[12px] uppercase tracking-label text-ink-soft">
                  À LA UNE
                  <Cur />
                </p>
                <p className="mt-1 text-lg font-medium">{vitrine[0].titre}</p>
                <p className="mt-1 text-[15px] text-ink-soft">{resumeActu(vitrine[0].texte)}</p>
              </div>
            ) : null}

            <div className="px-5 py-5">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LA VIE DU CLUB</p>
              <p className="mt-2 text-xl font-medium">Dernières actualités.</p>

              {/* Le chapitre disparaît du site public tant qu'il est vide — il n'affiche
                  d'invitation qu'en mode édition, à l'admin connecté. */}
              {vitrine.length === 0 ? (
                <p className="mono mt-4 text-[12px] leading-relaxed text-ink-soft">
                  Ce chapitre reste invisible pour vos visiteurs tant qu’il est vide.
                </p>
              ) : (
                <div
                  className={`mt-5 grid grid-cols-1 gap-px border border-line bg-line ${
                    vitrine.length >= 3 ? "sm:grid-cols-3" : vitrine.length === 2 ? "sm:grid-cols-2" : ""
                  }`}
                >
                  {vitrine.map((a) => (
                    <article key={a.id} className="flex flex-col bg-paper">
                      {a.aUneImage ? (
                        <div className="flex h-24 items-center justify-center border-b border-line bg-bg-alt">
                          <span className="mono text-[10px] uppercase tracking-label text-ink-soft">PHOTO</span>
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col px-4 py-4">
                        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                          {dateLongue(a.publie_le)}
                        </p>
                        <h3 className="mt-2 text-[15px] font-medium leading-snug">{a.titre}</h3>
                        <p className="mt-2 text-[13px] leading-relaxed text-ink-soft">{resumeActu(a.texte, 90)}</p>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>

          <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Trois cartes au maximum : la vitrine lit les trois dernières, le cockpit garde le fil
            complet. Publier ne demande aucune autre manipulation — pas de mise en ligne à
            déclencher, pas de délai.
          </p>
        </section>
      </div>
    </main>
  );
}
