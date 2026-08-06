"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, CHAMP_DEMO, Confirmation, Cur, EnTeteDemo, LABEL_DEMO } from "@/components/demo/Simulation";
import { CLUB } from "@/lib/demo/donnees";
import {
  compteursCampagne,
  destinatairesDuGroupe,
  ETAT_CAMPAGNE,
  groupesDisponibles,
  libelleArchive,
  quandCampagne,
} from "@/lib/demo/selecteurs";

/**
 * LA MESSAGERIE — `cockpit/communication/page.tsx`, `Communication.tsx`, `Historique.tsx`.
 *
 * CE QUE LE PRODUIT FAIT, ET QUE LA DÉMONSTRATION REPREND TEL QUEL
 *
 * 1. Les adhérents SANS EMAIL n'existent pas ici. `membres` est construit sur
 *    `.filter(a => a.email)` : ils ne sont pas comptés, pas listés, pas prévenus. Ce
 *    club en a un — Michel Chevalier — et le compteur dit donc 33 sur 34.
 * 2. Le groupe « Parents (adhérents mineurs) » sélectionne LES ADHÉRENTS MINEURS
 *    eux-mêmes ; c'est leur adresse, celle qu'un représentant légal a renseignée, qui
 *    reçoit. Ce club de yoga n'accueille aucun mineur : le groupe rend zéro destinataire
 *    et désactive l'envoi. C'est sa vérité, pas un écran cassé.
 * 3. Le libellé ARCHIVÉ diffère du libellé affiché pour ce seul groupe :
 *    « Responsables légaux des mineurs » dans l'historique. Le produit photographie le
 *    libellé à l'envoi pour qu'un cours renommé six mois plus tard ne rende pas
 *    l'historique incompréhensible.
 * 4. Le `<select>` porte une option DÉSACTIVÉE `──────────` entre les trois groupes
 *    transverses et la liste des cours, et seulement si le club a des cours.
 * 5. L'envoi est bloqué tant que les trois conditions ne sont pas réunies :
 *    au moins un destinataire, un objet non vide, un message non vide.
 * 6. Le textarea n'a AUCUN placeholder. Seul l'objet en a un.
 *
 * CE QUE LA DÉMONSTRATION NE REPREND PAS, ET POURQUOI
 * Le vrai écran offre aussi « OUVRIR MON EMAIL → » (un `mailto:` avec toutes les adresses
 * en Cci) et « copier les adresses » (le presse-papier du navigateur). Les deux sortent
 * de la page pour agir sur la machine du visiteur : ouvrir son logiciel de courrier, ou
 * remplacer ce qu'il avait copié. Sur un site public, ce n'est pas une démonstration,
 * c'est une intrusion — même décision que pour le `mailto:` de l'écran des encaissements.
 *
 * L'HISTORIQUE N'A PAS D'ÉTAT VIDE ICI, et ce n'est pas un oubli : le produit en a un
 * (« Aucun message envoyé pour le moment. »), mais le club de démonstration part avec
 * trois campagnes et la simulation ne sait pas en supprimer. Écrire une branche
 * inatteignable aurait été du code que personne ne peut vérifier.
 */

export default function DemoMessages() {
  const { etat, envoyer } = useDemo();

  const [groupe, setGroupe] = useState("tous");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");

  const groupes = groupesDisponibles(etat);
  const emails = useMemo(() => destinatairesDuGroupe(etat, groupe), [etat, groupe]);

  // Les trois mêmes conditions que `pret` dans `Communication.tsx`.
  const pret = emails.length > 0 && objet.trim().length > 0 && message.trim().length > 0;

  /**
   * L'acheminement, joué en deux temps.
   *
   * Le produit écrit la campagne en base AVANT d'appeler Resend, puis les événements du
   * webhook font passer chaque ligne de « préparé » à « accepté » puis « distribué ».
   * C'est un délai réel, de quelques secondes à quelques minutes, et c'est justement ce
   * que le vocabulaire de l'écran cherche à expliquer. Le rejouer ici en deux pas de
   * 900 ms le rend visible ; l'afficher « distribué » d'emblée aurait effacé la seule
   * nuance que cet écran a pour mission d'enseigner.
   *
   * L'effet se rallume tout seul : `campagne/avancer` change l'objet de la campagne, donc
   * la dépendance, donc l'effet repart — jusqu'à ce que plus aucune ligne ne soit en
   * attente et que le statut cesse d'être « en_cours ».
   */
  const enRoute = etat.campagnes.find((c) => c.statut === "en_cours");
  useEffect(() => {
    if (!enRoute) return;
    const t = setTimeout(() => envoyer({ type: "campagne/avancer", id: enRoute.id }), 900);
    return () => clearTimeout(t);
  }, [enRoute, envoyer]);

  const simuler = () => {
    envoyer({
      type: "campagne/ajouter",
      // Mêmes troncatures que la Server Action : `trim()` puis 150 et 10 000.
      objet: objet.trim().slice(0, 150),
      corps: message.trim().slice(0, 10000),
      groupeLibelle: libelleArchive(etat, groupe),
      emails,
    });
    setObjet("");
    setMessage("");
  };

  // 25 dernières, de la plus récente à la plus ancienne — `order(created_at, desc)` puis
  // `.limit(25)` dans la page réelle.
  const historique = [...etat.campagnes]
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 25);

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo" libelleRetour="← AUJOURD’HUI" kicker="MESSAGERIE" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          MESSAGERIE — {CLUB.nom}
          <Cur />
        </p>
        <h1 className="mt-4 text-3xl font-medium tracking-[-0.01em] md:text-4xl">Écrire à vos adhérents.</h1>
        <p className="mt-3 text-ink-soft">
          Choisissez un groupe, écrivez votre message : Klubster l’envoie à chaque adhérent,
          individuellement.
        </p>

        <Confirmation />

        {/* ——— Le composeur ————————————————————————————————————————————————— */}
        <div className="mt-8 space-y-6">
          <div className="border border-line bg-paper px-5 py-4">
            <label htmlFor="dm-groupe" className={LABEL_DEMO}>
              DESTINATAIRES
            </label>
            <select
              id="dm-groupe"
              value={groupe}
              onChange={(e) => setGroupe(e.target.value)}
              className="mt-2 min-h-[44px] w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
            >
              {groupes.slice(0, 3).map((g) => (
                <option key={g.valeur} value={g.valeur}>
                  {g.libelle}
                </option>
              ))}
              {groupes.length > 3 ? <option disabled>──────────</option> : null}
              {groupes.slice(3).map((g) => (
                <option key={g.valeur} value={g.valeur}>
                  {g.libelle}
                </option>
              ))}
            </select>
            <p className="mono mt-2 text-[11px] text-ink-soft">
              {emails.length} destinataire{emails.length > 1 ? "s" : ""} avec un email
            </p>
          </div>

          <div className="border border-line bg-paper px-5 py-4">
            <label htmlFor="dm-objet" className={LABEL_DEMO}>
              OBJET
            </label>
            <input
              id="dm-objet"
              value={objet}
              onChange={(e) => setObjet(e.target.value)}
              placeholder="Reprise des cours le 4 septembre"
              className={CHAMP_DEMO}
            />
            <label htmlFor="dm-message" className={`${LABEL_DEMO} mt-5 block`}>
              MESSAGE
            </label>
            {/* Aucun placeholder : le produit n'en met pas, et un exemple de message
                fabriquerait un ton qui n'est pas celui du club. */}
            <textarea
              id="dm-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              className={CHAMP_DEMO}
            />
          </div>

          <BoutonSimuler libelle="SIMULER L’ENVOI →" onSimuler={simuler} desactive={!pret} />

          {emails.length === 0 ? (
            <p className="mono text-[11px] text-ink-soft">
              Aucun adhérent de ce groupe n’a d’adresse email : il n’y a personne à qui écrire.
            </p>
          ) : null}

          <p className="mono max-w-prose text-[11px] leading-relaxed text-ink-faint">
            Dans votre club, chaque adhérent reçoit un email individuel depuis clubs@klubster.fr, et
            vos réponses arrivent sur l’adresse du club. Ici, rien ne part.
          </p>
        </div>

        {/* ——— L'historique ————————————————————————————————————————————————— */}
        <section className="mt-14">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
            MESSAGES ENVOYÉS
            <Cur />
          </p>

          <div className="mt-4 border border-line">
            {historique.map((c) => {
              const etatCampagne = ETAT_CAMPAGNE[c.statut] ?? ETAT_CAMPAGNE.preparation;
              const n = compteursCampagne(c);
              return (
                <Link
                  key={c.id}
                  href={`/demo/messages/${c.id}`}
                  className="block border-b border-line px-4 py-4 last:border-b-0 hover:bg-bg-alt"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                    <span className="flex-1 text-[15px] font-medium">{c.objet}</span>
                    <span className={`mono text-[11px] ${etatCampagne.classe}`}>{etatCampagne.texte}</span>
                  </div>

                  <p className="mono mt-1.5 text-[11px] text-ink-soft">
                    {c.groupe_libelle} · {n.destinataires} destinataire
                    {n.destinataires > 1 ? "s" : ""} · {quandCampagne(c.created_at)} · {c.auteur_nom}
                  </p>

                  <p className="mono mt-1 text-[11px] text-ink-soft">
                    {n.acceptes} accepté{n.acceptes > 1 ? "s" : ""}
                    {n.distribues > 0 ? ` · ${n.distribues} distribué${n.distribues > 1 ? "s" : ""}` : ""}
                    {n.retardes > 0 ? ` · ${n.retardes} retardé${n.retardes > 1 ? "s" : ""}` : ""}
                    {n.echecs > 0 ? (
                      <span className="text-danger">
                        {" "}
                        · {n.echecs} échec{n.echecs > 1 ? "s" : ""}
                      </span>
                    ) : null}
                    {n.plaintes > 0 ? (
                      <span className="text-danger">
                        {" "}
                        · {n.plaintes} plainte{n.plaintes > 1 ? "s" : ""}
                      </span>
                    ) : null}
                  </p>
                </Link>
              );
            })}
          </div>

          {/* MENTION À NE PAS RETIRER. Le commentaire du fichier réel l'interdit
              explicitement, et c'est le seul endroit du produit où la différence entre
              « accepté », « distribué » et « lu » est dite au président. */}
          <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-faint">
            « Accepté » signifie que l’envoi a été pris en charge ; « distribué », que le serveur de
            messagerie du destinataire l’a accepté. Ni l’un ni l’autre ne garantit que le message a
            été lu, ni qu’il est arrivé dans la boîte principale. Klubster ne mesure ni les
            ouvertures ni les clics.
          </p>
        </section>
      </div>
    </main>
  );
}
