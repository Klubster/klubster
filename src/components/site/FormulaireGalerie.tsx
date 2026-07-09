"use client";

import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ajouterChapitreMedias } from "@/app/[asso]/edition-actions";

const TAILLE_MAX = 3 * 1024 * 1024;
const NOMBRE_MAX = 8;

/**
 * Galerie et partenaires : les fichiers montent DIRECTEMENT du navigateur vers Supabase.
 *
 * Pourquoi : une Server Action est plafonnée à 4 Mo de corps de requête (Vercel). Huit photos
 * de 3 Mo ne passeraient jamais — l'ajout échouerait sans un mot d'explication, exactement
 * comme le faisait le chapitre « Texte & photo » avant sa correction.
 *
 * Le serveur ne reçoit donc que des URLs, qu'il revalide (bon bucket, bon dossier d'organisation).
 */
export default function FormulaireGalerie({
  slug,
  organisationId,
  type,
  accent,
}: {
  slug: string;
  organisationId: string;
  type: "galerie" | "partenaires";
  accent: string;
}) {
  const [fichiers, setFichiers] = useState<File[]>([]);
  const [enCours, setEnCours] = useState(false);
  const [progression, setProgression] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[]>([]);

  const estGalerie = type === "galerie";

  function choisir(liste: FileList | null) {
    setErreur(null);
    setUrls([]);
    if (!liste) return;
    const choisis = Array.from(liste).slice(0, NOMBRE_MAX);
    const tropLourds = choisis.filter((f) => f.size > TAILLE_MAX);
    if (tropLourds.length) {
      setErreur(`${tropLourds.length} fichier(s) dépassent 3 Mo. Choisissez des images plus légères.`);
      return;
    }
    setFichiers(choisis);
  }

  async function envoyer() {
    if (!fichiers.length) return;
    setEnCours(true);
    setErreur(null);
    setProgression(0);

    const supabase = createSupabaseBrowserClient();
    const obtenues: string[] = [];

    for (let i = 0; i < fichiers.length; i++) {
      const f = fichiers[i];
      const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
      const chemin = `${organisationId}/${type}-${Date.now()}-${i}.${ext}`;

      const { error } = await supabase.storage.from("sections").upload(chemin, f, {
        upsert: true,
        contentType: f.type || undefined,
      });
      if (error) {
        setErreur(`L’envoi a échoué à la photo ${i + 1} : ${error.message}`);
        setEnCours(false);
        return;
      }
      obtenues.push(supabase.storage.from("sections").getPublicUrl(chemin).data.publicUrl);
      setProgression(Math.round(((i + 1) / fichiers.length) * 100));
    }

    setUrls(obtenues);
    setEnCours(false);
  }

  return (
    <form action={ajouterChapitreMedias.bind(null, slug, type)} className="space-y-5">
      <input
        name="titre"
        placeholder={estGalerie ? "Titre (optionnel) — ex. La saison en images" : "Titre (optionnel) — ex. Ils nous soutiennent"}
        className="w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
      {!estGalerie ? (
        <textarea
          name="texte"
          rows={2}
          placeholder="Un mot sur vos partenaires (optionnel)"
          className="w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
        />
      ) : null}

      <div className="border border-line bg-paper px-5 py-4">
        <label className="mono text-[11px] uppercase tracking-wider text-ink-soft">
          {estGalerie ? "PHOTOS" : "LOGOS"} — 8 MAXIMUM, 3 MO CHACUNE
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => choisir(e.target.files)}
            className="mono ml-2 text-[12px] normal-case text-ink-soft"
          />
        </label>

        {fichiers.length > 0 && urls.length === 0 ? (
          <div className="mt-4">
            <p className="text-[13px] text-ink-soft">
              {fichiers.length} fichier{fichiers.length > 1 ? "s" : ""} prêt
              {fichiers.length > 1 ? "s" : ""} à envoyer.
            </p>
            <button
              type="button"
              onClick={envoyer}
              disabled={enCours}
              className="mono mt-3 border border-ink px-5 py-2.5 text-[12px] hover:bg-ink hover:text-paper disabled:opacity-40"
            >
              {enCours ? `ENVOI… ${progression} %` : "ENVOYER LES PHOTOS"}
            </button>
          </div>
        ) : null}

        {urls.length > 0 ? (
          <p className="mono mt-4 text-[12px]" style={{ color: accent }}>
            ✓ {urls.length} image{urls.length > 1 ? "s" : ""} envoyée{urls.length > 1 ? "s" : ""}. Vous pouvez ajouter le chapitre.
          </p>
        ) : null}

        {erreur ? (
          <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>
            {erreur}
          </p>
        ) : null}
      </div>

      {/* Le serveur ne reçoit que des URLs — il les revalide avant de les enregistrer. */}
      <input type="hidden" name="urls" value={JSON.stringify(urls)} />

      <button
        type="submit"
        disabled={urls.length === 0}
        className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        style={{ background: accent }}
      >
        AJOUTER LE CHAPITRE →
      </button>
    </form>
  );
}
