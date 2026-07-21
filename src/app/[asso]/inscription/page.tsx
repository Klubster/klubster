import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { saisonCourante } from "@/lib/saison";
import { formatPrix } from "@/lib/format";
import { inscrireAdherent } from "./actions";
import QuestionnaireSante from "./QuestionnaireSante";
import ResponsableLegal from "./ResponsableLegal";
import AutorisationsMineur from "./AutorisationsMineur";
import RemisesInscription from "./RemisesInscription";
import { NaissanceProvider, ChampNaissance } from "./naissance";
import { ThemeVitrine } from "@/components/site/ThemeVitrine";
import Turnstile from "@/components/site/Turnstile";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";
import ChoixEcheances from "@/components/site/ChoixEcheances";
import { compteConnecte } from "@/lib/stripe-org";
import type { Champ } from "@/types/form";

export const dynamic = "force-dynamic";

export default async function InscriptionPage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const cours = await getCoursByOrganisation(org.id);

  // Jauge : un cours dont la capacité est atteinte est signalé « complet » (→ liste d'attente).
  const supabase = await createSupabaseServerClient();
  const saisonAct = saisonCourante(org);
  const [{ data: placesRows }, { data: adhCount }] = await Promise.all([
    supabase.from("cours").select("id, places_max").eq("organisation_id", org.id),
    supabase.from("adhesions").select("cours_id, statut, saison").eq("organisation_id", org.id),
  ]);
  const placesMax = new Map((placesRows ?? []).map((r) => [r.id as string, r.places_max as number | null]));
  const actifs = new Map<string, number>();
  for (const a of (adhCount ?? []) as { cours_id: string | null; statut: string | null; saison: string | null }[]) {
    if (a.cours_id && a.saison === saisonAct && ["en_attente", "en_retard", "paye"].includes(a.statut ?? "")) {
      actifs.set(a.cours_id, (actifs.get(a.cours_id) ?? 0) + 1);
    }
  }
  const estComplet = (id: string) => {
    const pm = placesMax.get(id);
    return pm != null && pm > 0 && (actifs.get(id) ?? 0) >= pm;
  };

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

          {searchParams?.erreur === "compte_existant" ? (
            <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
              Un compte existe déjà avec cet email. Connectez-vous à votre espace adhérent, ou utilisez une autre adresse.
            </p>
          ) : searchParams?.erreur === "compte" ? (
            <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
              Le compte n&apos;a pas pu être créé : vérifiez l&apos;email et le mot de passe ({LONGUEUR_MIN_MDP} caractères minimum), puis réessayez dans quelques minutes.
            </p>
          ) : searchParams?.erreur === "trop_de_tentatives" ? (
            <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
              Trop de tentatives d&apos;inscription depuis cet appareil. Patientez quelques minutes, puis réessayez.
            </p>
          ) : searchParams?.erreur === "robot" ? (
            <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
              Nous n&apos;avons pas pu vérifier que vous êtes bien une personne. Rechargez la page et réessayez.
            </p>
          ) : searchParams?.erreur ? (
            <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Une erreur est survenue. Vérifiez vos informations.</p>
          ) : null}

          <form action={inscrireAdherent} className="mt-12 space-y-10">
            <NaissanceProvider>
            <input type="hidden" name="slug" value={org.slug} />

            {/* Pot de miel : invisible et non focalisable. Seul un robot le remplit. */}
            <div aria-hidden className="absolute h-px w-px overflow-hidden opacity-0" style={{ left: "-9999px" }}>
              <label htmlFor="site_web">Ne remplissez pas ce champ</label>
              <input id="site_web" type="text" name="site_web" tabIndex={-1} autoComplete="off" defaultValue="" />
            </div>

            {/* IDENTITÉ (base verrouillée) */}
            <fieldset>
              <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">IDENTITÉ<span style={{ color: accent }}>_</span></legend>
              <div className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
                <Field label="PRÉNOM" name="prenom" required autoComplete="given-name" />
                <Field label="NOM" name="nom" required autoComplete="family-name" />
                {/* La date de naissance vit ici (base commune) et pilote le questionnaire
                    de santé + le bloc responsable légal plus bas (contexte partagé). */}
                <ChampNaissance />
                {/* L'adresse fait partie de la base commune : licences fédérales,
                    attestations et courriers en ont besoin (demande de Mathieu, 15/07/2026). */}
                <Field label="ADRESSE" name="adresse" required autoComplete="street-address" />
                <Field label="EMAIL" name="email" type="email" required autoComplete="email" />
                <Field label="TÉLÉPHONE" name="tel" type="tel" autoComplete="tel" />
              </div>
            </fieldset>

            {/* COURS */}
            <fieldset>
              <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">COURS<span style={{ color: accent }}>_</span></legend>
              <div className="mt-4 border border-line bg-paper px-5 py-4">
                <label htmlFor="cours" className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS SOUHAITÉ</label>
                <select id="cours" name="cours" required className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink">
                  {cours.map((c) => (
                    // data-tarif : lu par le sélecteur de mensualités pour afficher le vrai montant.
                    (<option key={c.id} value={c.id} data-tarif={c.tarif_centimes}>
                      {c.nom}— {formatPrix(c.tarif_centimes)}/ an{estComplet(c.id) ? " · COMPLET (liste d’attente)" : ""}
                    </option>)
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

            {/* RÉDUCTIONS (Pass'Sport…) — montant recalculé côté serveur */}
            <RemisesInscription remises={org.form_config?.remises ?? []} accent={accent} />

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
                          {/* Modèle fourni par le club (ex. certificat médical vierge) */}
                          {pc.modele_url ? (
                            <a
                              href={pc.modele_url}
                              target="_blank"
                              rel="noreferrer"
                              className="mono ml-2 text-[10px] uppercase tracking-wider underline underline-offset-2"
                              style={{ color: accent }}
                            >
                              TÉLÉCHARGER LE MODÈLE ↓
                            </a>
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

            {/* RESPONSABLE LÉGAL — toujours actif pour les mineurs, indépendant du QS */}
            <ResponsableLegal accent={accent} />

            {/* AUTORISATIONS PARENTALES — configurées dans l'Atelier, mineurs uniquement */}
            <AutorisationsMineur autorisations={org.form_config?.mineur?.autorisations ?? []} accent={accent} />

            {/* QUESTIONNAIRE DE SANTÉ — seulement si le club l'a activé dans l'Atelier
                (certaines disciplines exigent un certificat médical, le QS ne s'y
                substitue pas — retour de Mathieu, 15/07/2026). */}
            {org.form_config?.sante?.questionnaire ? <QuestionnaireSante accent={accent} /> : null}

            {/* COMPTE */}
            <fieldset>
              <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">VOTRE COMPTE<span style={{ color: accent }}>_</span></legend>
              <div className="mt-4 border border-line bg-paper px-5 py-4">
                <label htmlFor="password" className="mono text-[10px] uppercase tracking-label text-ink-soft">MOT DE PASSE *</label>
                <input id="password" name="password" type="password" required minLength={LONGUEUR_MIN_MDP} autoComplete="new-password" className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
                <p className="mono mt-2 text-[11px] text-ink-soft">{LONGUEUR_MIN_MDP} caractères minimum. Pour accéder à votre espace adhérent.</p>
              </div>
            </fieldset>

            {/* PAIEMENT */}
            <fieldset>
              <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">PAIEMENT<span style={{ color: accent }}>_</span></legend>
              <div className="mt-4 divide-y divide-line border border-line bg-paper">
                {/* Le paiement en ligne n'est proposé que si le club a connecté Stripe. */}
                {compteConnecte(org) ? (
                  <>
                    <Radio name="mode" value="en_ligne" defaultChecked label="En ligne (carte bancaire)" hint="Sécurisé, immédiat." />
                    <ChoixEcheances
                      echeancesMax={org.echeances_max ?? 1}
                      tarifInitialCentimes={cours[0]?.tarif_centimes ?? 0}
                      accent={accent}
                    />
                  </>
                ) : null}
                <Radio name="mode" value="cheque" defaultChecked={!org.stripe_account_id} label="Par chèque" hint="À remettre au club." />
                <Radio name="mode" value="especes" label="En espèces" hint="À remettre au club." />
              </div>
            </fieldset>

            <Turnstile />

            <button type="submit" className="mono w-full px-6 py-4 text-[13px] text-white" style={{ background: accent }}>
              VALIDER MON INSCRIPTION →
            </button>
            </NaissanceProvider>
          </form>
        </div>
      </main>
    </ThemeVitrine>
  );
}

function Field({ label, name, type = "text", required, autoComplete }: { label: string; name: string; type?: string; required?: boolean; autoComplete?: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label htmlFor={name} className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}{required ? " *" : ""}</label>
      <input id={name} name={name} type={type} required={required} autoComplete={autoComplete} className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
    </div>
  );
}

function ChampInput({ champ }: { champ: Champ }) {
  const name = `champ_${champ.id}`;
  const base = "mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink";
  return (
    <div className="bg-paper px-5 py-4">
      <label htmlFor={name} className="mono text-[10px] uppercase tracking-label text-ink-soft">{champ.label || "Champ"}{champ.obligatoire ? " *" : ""}</label>
      {champ.type === "zone" ? (
        <textarea id={name} name={name} required={champ.obligatoire} rows={3} className={base} />
      ) : champ.type === "choix" ? (
        <select id={name} name={name} required={champ.obligatoire} className={base}>
          <option value="">—</option>
          {(champ.options ?? []).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : champ.type === "case" ? (
        <div className="mt-2"><input id={name} name={name} type="checkbox" value="oui" /></div>
      ) : (
        <input
          id={name}
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
