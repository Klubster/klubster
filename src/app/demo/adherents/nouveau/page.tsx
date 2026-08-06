"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDemo } from "@/components/demo/DemoProvider";
import { BoutonSimuler, CHAMP_DEMO, Cur, EnTeteDemo, LABEL_DEMO } from "@/components/demo/Simulation";
import { eur } from "@/lib/demo/donnees";

/**
 * L'ajout manuel — UNE SEULE PAGE, six champs.
 *
 * Pas d'étapes, pas de barre de progression, pas de récapitulatif : le produit n'en a
 * pas, et six champs sur une page valent mieux que huit écrans. C'est un des rares
 * endroits où la première spécification voulait « améliorer » et où le produit avait
 * déjà raison.
 *
 * SANS COURS, PAS D'ADHÉSION — et donc pas de montant. On ne fabrique pas une adhésion
 * générique pour que la fiche ait l'air remplie.
 */
export default function DemoNouvelAdherent() {
  const { etat, envoyer } = useDemo();
  const router = useRouter();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [telephone, setTelephone] = useState("");
  const [coursId, setCoursId] = useState("");
  const [mode, setMode] = useState("cheque");
  const [erreur, setErreur] = useState<string | null>(null);

  const ajouter = () => {
    if (!prenom.trim() || !nom.trim()) {
      setErreur("Le prénom et le nom sont obligatoires.");
      return;
    }
    setErreur(null);
    // L'identifiant du prochain adhérent est déterministe : le compteur de l'état.
    const id = `a-sim${etat.compteur + 1}`;
    envoyer({ type: "adherent/ajouter", prenom, nom, email, telephone, coursId, mode });
    router.push(`/demo/adherents/${id}`);
  };

  return (
    <main className="min-h-screen text-ink">
      <EnTeteDemo retour="/demo/adherents" libelleRetour="← ADHÉRENTS" kicker="NOUVEL ADHÉRENT" />

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">Ajouter un adhérent.</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Pour une inscription prise sur papier, au forum des associations ou par téléphone.
          L’adhérent n’aura pas de compte : il pourra en créer un plus tard avec le même email.
        </p>

        {erreur ? (
          <p className="mono mt-6 text-[12px] text-danger">
            {erreur}
          </p>
        ) : null}

        <div className="mt-10 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="prenom" className={LABEL_DEMO}>
                PRÉNOM *
              </label>
              <input id="prenom" value={prenom} onChange={(e) => setPrenom(e.target.value)} className={CHAMP_DEMO} />
            </div>
            <div>
              <label htmlFor="nom" className={LABEL_DEMO}>
                NOM *
              </label>
              <input id="nom" value={nom} onChange={(e) => setNom(e.target.value)} className={CHAMP_DEMO} />
            </div>
            <div>
              <label htmlFor="email" className={LABEL_DEMO}>
                EMAIL
              </label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={CHAMP_DEMO} />
            </div>
            <div>
              <label htmlFor="telephone" className={LABEL_DEMO}>
                TÉLÉPHONE
              </label>
              <input id="telephone" value={telephone} onChange={(e) => setTelephone(e.target.value)} className={CHAMP_DEMO} />
            </div>
          </div>

          <div>
            <label htmlFor="cours" className={LABEL_DEMO}>
              COURS
            </label>
            <select id="cours" value={coursId} onChange={(e) => setCoursId(e.target.value)} className={CHAMP_DEMO}>
              <option value="">Aucun cours pour l’instant</option>
              {etat.cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} — {eur(c.tarif_centimes)} / an
                </option>
              ))}
            </select>
            <p className="mono mt-2 text-[11px] text-ink-soft">
              Le montant est repris du cours. L’adhésion sera créée « en attente » : encaissez-la depuis
              les Paiements quand le chèque arrive.
            </p>
          </div>

          <div>
            <label htmlFor="mode" className={LABEL_DEMO}>
              RÈGLEMENT PRÉVU
            </label>
            <select id="mode" value={mode} onChange={(e) => setMode(e.target.value)} className={CHAMP_DEMO}>
              <option value="cheque">Par chèque</option>
              <option value="especes">En espèces</option>
              <option value="en_ligne">En ligne</option>
            </select>
          </div>

          <BoutonSimuler libelle="SIMULER L’AJOUT DE L’ADHÉRENT →" onSimuler={ajouter} />

          <p className="mono text-[11px] leading-relaxed text-ink-faint">
            Sans cours choisi, l’adhérent est créé seul — sa fiche affichera « Aucune adhésion enregistrée ».
            C’est exactement ce que fait Klubster<Cur />
          </p>
        </div>
      </div>
    </main>
  );
}
