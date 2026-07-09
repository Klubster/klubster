/* Mode édition — « Ajouter un chapitre_ » : bibliothèque d'intentions, puis formulaire dédié.
   Le layout est imposé par le chapitre : le dirigeant ne choisit jamais une mise en page. */
import Link from "next/link";
import { BIBLIOTHEQUE, getChapitre } from "@/lib/chapitres";
import { ajouterChapitre } from "@/app/[asso]/edition-actions";
import FormulaireTextePhoto from "@/components/site/FormulaireTextePhoto";
import type { SectionCustomType } from "@/types/db";

const CHAMP = "w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink";
const CHAMP_SM = "w-full border border-line bg-paper px-3 py-2 text-[14px] outline-none focus:border-ink";

export function AjouterChapitre({ slug, accent, type }: { slug: string; accent: string; type?: string }) {
  const chapitre = getChapitre(type);

  return (
    <section id="ajouter" className="border-b border-line bg-bg-alt">
      <div className="mx-auto max-w-5xl px-6 py-14 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          AJOUTER UN CHAPITRE<span style={{ color: accent }}>_</span>
        </p>

        {!chapitre ? (
          /* — La bibliothèque — */
          <div className="mt-8 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {BIBLIOTHEQUE.map((g) => (
              <div key={g.groupe} className="bg-paper px-5 py-5">
                <p className="mono text-[10px] uppercase tracking-label text-ink-faint">{g.groupe}</p>
                <div className="mt-3 space-y-3">
                  {g.chapitres.map((c) => (
                    <Link
                      key={c.type}
                      href={`/${slug}?edition=1&chapitre=${c.type}#ajouter`}
                      className="group block"
                    >
                      <span className="text-[15px] font-medium group-hover:underline">{c.label}</span>
                      <span className="mt-0.5 block text-[12px] text-ink-soft">{c.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* — Le formulaire du chapitre choisi — */
          <div className="mt-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="text-2xl font-medium">{chapitre.label}</h2>
              <Link href={`/${slug}?edition=1#ajouter`} className="mono text-[12px] text-ink-soft hover:text-ink">
                ← CHOISIR UN AUTRE CHAPITRE
              </Link>
            </div>
            <p className="mt-2 max-w-prose text-[14px] text-ink-soft">{chapitre.desc}</p>
            <div className="mt-8">
              <FormulaireChapitre slug={slug} type={chapitre.type} accent={accent} />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Envoyer({ accent }: { accent: string }) {
  return (
    <button type="submit" className="mono px-6 py-3 text-[12px] text-white transition-opacity hover:opacity-90" style={{ background: accent }}>
      AJOUTER LE CHAPITRE →
    </button>
  );
}

function FormulaireChapitre({ slug, type, accent }: { slug: string; type: SectionCustomType; accent: string }) {
  /* Texte & photo : les champs utiles dépendent de la mise en page (composant client). */
  if (type === "photo-droite" || type === "photo-gauche" || type === "triptyque") {
    return <FormulaireTextePhoto slug={slug} accent={accent} />;
  }

  if (type === "president") {
    return (
      <form action={ajouterChapitre.bind(null, slug, type)} className="space-y-5">
        <textarea name="texte" rows={3} required placeholder="La citation — ex. Ici, on apprend bien plus que la boxe." className={CHAMP} />
        <textarea name="texte2" rows={3} placeholder="Quelques mots de plus (optionnel)" className={CHAMP} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <input name="nom" placeholder="Prénom et nom — ex. Mathieu Bourdieu" className={CHAMP} />
          <input name="role" placeholder="Rôle — ex. Président du club" className={CHAMP} />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <label className="mono text-[11px] uppercase tracking-wider text-ink-soft">
            PHOTO (OPTIONNELLE){" "}
            <input type="file" name="photo" accept="image/*" className="mono ml-2 text-[12px] normal-case text-ink-soft" />
          </label>
          <Envoyer accent={accent} />
        </div>
      </form>
    );
  }

  if (type === "chiffres" || type === "faq" || type === "resultats") {
    const exemples: Record<string, [string, string]> = {
      chiffres: ["Chiffre — ex. 1998 ou 312", "Légende — ex. Année de création"],
      faq: ["Question — ex. À partir de quel âge ?", "Réponse"],
      resultats: ["Événement — ex. Championnat Occitanie", "Résultat — ex. 3 médailles"],
    };
    const [exT, exX] = exemples[type];
    return (
      <form action={ajouterChapitre.bind(null, slug, type)} className="space-y-5">
        <input name="titre" placeholder="Titre du chapitre (optionnel)" className={CHAMP} />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              <input name={`item_titre_${i}`} placeholder={i === 0 ? exT : ""} className="bg-paper px-3 py-2.5 text-[14px] outline-none focus:bg-bg-alt" />
              {type === "faq" ? (
                <textarea name={`item_texte_${i}`} rows={1} placeholder={i === 0 ? exX : ""} className="bg-paper px-3 py-2.5 text-[14px] outline-none focus:bg-bg-alt" />
              ) : (
                <input name={`item_texte_${i}`} placeholder={i === 0 ? exX : ""} className="bg-paper px-3 py-2.5 text-[14px] outline-none focus:bg-bg-alt" />
              )}
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-soft">Remplissez ce dont vous avez besoin — les lignes vides sont ignorées.</p>
        <Envoyer accent={accent} />
      </form>
    );
  }

  if (type === "equipe") {
    return (
      <form action={ajouterChapitre.bind(null, slug, type)} className="space-y-5">
        <input name="titre" placeholder="Titre du chapitre (optionnel) — ex. Nos entraîneurs" className={CHAMP} />
        <div className="space-y-2">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-1 gap-2 border border-line bg-paper p-3 sm:grid-cols-[1fr_1fr_auto]">
              <input name={`item_titre_${i}`} placeholder={i === 0 ? "Prénom — ex. Karim" : ""} className={CHAMP_SM} />
              <input name={`item_texte_${i}`} placeholder={i === 0 ? "Rôle — ex. Entraîneur diplômé" : ""} className={CHAMP_SM} />
              <input type="file" name={`item_photo_${i}`} accept="image/*" className="mono self-center text-[11px] text-ink-soft" />
            </div>
          ))}
        </div>
        <p className="text-[13px] text-ink-soft">Photo optionnelle — sans photo, l&apos;initiale fait le travail. Lignes vides ignorées.</p>
        <Envoyer accent={accent} />
      </form>
    );
  }

  if (type === "galerie" || type === "partenaires") {
    return (
      <form action={ajouterChapitre.bind(null, slug, type)} className="space-y-5">
        <input
          name="titre"
          placeholder={type === "galerie" ? "Titre (optionnel) — ex. La saison en images" : "Titre (optionnel) — ex. Ils nous soutiennent"}
          className={CHAMP}
        />
        {type === "partenaires" ? (
          <textarea name="texte" rows={2} placeholder="Un mot sur vos partenaires (optionnel)" className={CHAMP} />
        ) : null}
        <div className="flex flex-wrap items-center gap-4">
          <label className="mono text-[11px] uppercase tracking-wider text-ink-soft">
            {type === "galerie" ? "PHOTOS (JUSQU'À 8)" : "LOGOS (JUSQU'À 8)"}{" "}
            <input type="file" name="photos" accept="image/*" multiple required className="mono ml-2 text-[12px] normal-case text-ink-soft" />
          </label>
          <Envoyer accent={accent} />
        </div>
        <p className="text-[13px] text-ink-soft">Sélectionnez plusieurs fichiers d&apos;un coup (5 Mo max chacun).</p>
      </form>
    );
  }

  /* citation */
  return (
    <form action={ajouterChapitre.bind(null, slug, type)} className="space-y-5">
      <textarea
        name="texte"
        rows={3}
        required
        placeholder="La phrase — ex. On apprend à boxer. On apprend surtout à se dépasser."
        className={CHAMP}
      />
      <input name="texte2" placeholder="Signature (optionnelle) — ex. Karim, entraîneur" className={CHAMP} />
      <Envoyer accent={accent} />
    </form>
  );
}
