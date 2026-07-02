import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix } from "@/lib/format";
import { inscrireAdherent } from "./actions";
import QuestionnaireSante from "./QuestionnaireSante";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import type { Champ } from "@/types/form";

export const dynamic = "force-dynamic";

export default async function InscriptionPage({
  params,
  searchParams,
}: {
  params: { asso: string };
  searchParams: { erreur?: string };
}) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const cours = await getCoursByOrganisation(org.id);
  const accent = org.couleur_primaire ?? "#111111";
  const pages = org.form_config?.pages ?? [];
  const pieces = org.form_config?.pieces ?? [];

  return (
    <ThemeVitrine org={org}>
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">INSCRIPTION<span style={{ color: accent }}>_</span></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">SECTION 01 — ADHÉSION<span style={{ color: accent }}>_</span></p>
        <h1 className="mt-6 text-3xl font-medium md:text-4xl">Rejoindre {org.nom}.</h1>
        <p className="mt-4 max-w-prose text-ink-soft">
          Créez votre compte adhérent : vous pourrez ensuite suivre votre dossier, déposer vos pièces
          et voir votre carte de membre.
        </p>

        {searchParams?.erreur === "compte" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Un compte existe déjà avec cet email, ou le mot de passe est trop court (6 caractères min).</p>
        ) : searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Une erreur est survenue. Vérifiez vos informations.</p>
        ) : null}

        <form action={inscrireAdherent} className="mt-12 space-y-10">
          <input type="hidden" name="slug" value={org.slug} />

          {/* IDENTITÉ (base verrouillée) */}
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">IDENTITÉ<span style={{ color: accent }}>_</span></legend>
            <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              <Field label="PRÉNOM" name="prenom" required />
              <Field label="NOM" name="nom" required />
              <Field label="EMAIL" name="email" type="email" required />
              <Field label="TÉLÉPHONE" name="tel" type="tel" />
            </div>
          </fieldset>

          {/* COURS */}
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">COURS<span style={{ color: accent }}>_</span></legend>
            <div className="mt-4 border border-line bg-paper px-5 py-4">
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS SOUHAITÉ</label>
              <select name="cours" required className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink">
                {cours.map((c) => (
                  <option key={c.id} value={c.id}>{c.nom} — {formatPrix(c.tarif_centimes)} / an</option>
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

          {/* QUESTIONNAIRE DE SANTÉ */}
          <QuestionnaireSante accent={accent} />

          {/* COMPTE */}
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">VOTRE COMPTE<span style={{ color: accent }}>_</span></legend>
            <div className="mt-4 border border-line bg-paper px-5 py-4">
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">MOT DE PASSE *</label>
              <input name="password" type="password" required minLength={6} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
              <p className="mono mt-2 text-[11px] text-ink-faint">6 caractères minimum. Pour accéder à votre espace adhérent.</p>
            </div>
          </fieldset>

          {/* PAIEMENT */}
          <fieldset>
            <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENT<span style={{ color: accent }}>_</span></legend>
            <div className="mt-4 divide-y divide-line border border-line bg-paper">
              <Radio name="mode" value="en_ligne" defaultChecked label="En ligne (carte bancaire)" hint="Sécurisé, immédiat." />
              {org.form_config?.paiement?.troisFois ? (
                <Radio name="mode" value="en_ligne_3x" label="En ligne — 3 mensualités" hint="3 prélèvements, un par mois." />
              ) : null}
              <Radio name="mode" value="cheque" label="Par chèque" hint="À remettre au club." />
              <Radio name="mode" value="especes" label="En espèces" hint="À remettre au club." />
            </div>
          </fieldset>

          <button type="submit" className="mono w-full px-6 py-4 text-[13px] text-white" style={{ background: accent }}>
            VALIDER MON INSCRIPTION →
          </button>
        </form>
      </div>
    </main>
    </ThemeVitrine>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}{required ? " *" : ""}</label>
      <input name={name} type={type} required={required} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
    </div>
  );
}

function ChampInput({ champ }: { champ: Champ }) {
  const name = `champ_${champ.id}`;
  const base = "mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink";
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[10px] uppercase tracking-label text-ink-soft">{champ.label || "Champ"}{champ.obligatoire ? " *" : ""}</label>
      {champ.type === "zone" ? (
        <textarea name={name} required={champ.obligatoire} rows={3} className={base} />
      ) : champ.type === "choix" ? (
        <select name={name} required={champ.obligatoire} className={base}>
          <option value="">—</option>
          {(champ.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : champ.type === "case" ? (
        <div className="mt-2"><input name={name} type="checkbox" value="oui" /></div>
      ) : (
        <input
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
