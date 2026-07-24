import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { changerLogo, retirerLogo, changerCouleur, changerTheme } from "./actions";
import { THEME_TEMPLATES, THEME_MODES } from "@/lib/themes";
import { classesPolicesVitrines } from "@/lib/polices-vitrines";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

/** Identité du club : logo et couleur, modifiables après la création. */
export default async function IdentitePage(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ ok?: string; erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${org.slug}/cockpit/identite`);
  }

  const changerLogoAvecSlug = changerLogo.bind(null, org.slug);
  const retirerLogoAvecSlug = retirerLogo.bind(null, org.slug);
  const changerCouleurAvecSlug = changerCouleur.bind(null, org.slug);
  const changerThemeAvecSlug = changerTheme.bind(null, org.slug);
  const couleur = org.couleur_primaire ?? "#279B65";
  const templateActuel = org.theme_template ?? "editorial";
  const modeActuel = org.theme_mode ?? "blanc";

  return (
    // Polices des 6 templates (aperçus « Aa ») — auto-hébergées par next/font.
    <main className={`min-h-screen text-ink ${classesPolicesVitrines}`}>
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">IDENTITÉ<Cur /></span>
      </header>
      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">IDENTITÉ — {org.nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Le visage du club.</h1>
        <p className="mt-3 max-w-prose text-ink-soft">
          Votre logo et votre couleur habillent votre site, vos emails et l&apos;application de vos adhérents.
        </p>

        {searchParams?.ok === "logo" ? (
          <p className="mono mt-6 text-[12px] text-brand">✓ Logo mis à jour — il apparaît déjà sur votre site.</p>
        ) : searchParams?.ok === "retire" ? (
          <p className="mono mt-6 text-[12px] text-ink-soft">Logo retiré. L&apos;initiale du club prend le relais.</p>
        ) : searchParams?.ok === "couleur" ? (
          <p className="mono mt-6 text-[12px] text-brand">✓ Couleur mise à jour sur tout votre site.</p>
        ) : searchParams?.ok === "theme" ? (
          <p className="mono mt-6 text-[12px] text-brand">✓ Police et fond mis à jour sur tout votre site.</p>
        ) : null}
        {searchParams?.erreur === "image" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Image non reconnue ou trop lourde (PNG, JPG ou WebP, 3 Mo max).</p>
        ) : searchParams?.erreur === "vide" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Choisissez d&apos;abord un fichier.</p>
        ) : searchParams?.erreur === "couleur" ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>Code couleur invalide (ex. attendu : #1A6FB5).</p>
        ) : searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>L&apos;enregistrement a échoué. Réessayez.</p>
        ) : null}

        {/* LOGO */}
        <section className="mt-10 border border-line bg-paper p-6">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">LOGO<Cur /></p>
          <div className="mt-5 flex items-center gap-5">
            {org.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              (<img src={org.logo_url} alt={`Logo ${org.nom}`} className="h-16 w-16 border border-line object-cover" />)
            ) : (
              <span
                className="grid h-16 w-16 place-items-center border border-line bg-bg-alt text-[20px] font-bold"
                style={{ color: couleur }}
                aria-hidden
              >
                {org.nom.charAt(0).toUpperCase()}
              </span>
            )}
            <p className="max-w-prose text-[13px] text-ink-soft">
              PNG, JPG ou WebP, 3 Mo max. Sans logo, l&apos;initiale du club fait le travail.
            </p>
          </div>
          <form action={changerLogoAvecSlug} className="mt-5 flex flex-wrap items-center gap-4">
            <input
              type="file"
              name="logo"
              accept="image/png,image/jpeg,image/webp"
              required
              className="mono max-w-full text-[12px] text-ink-soft file:mr-4 file:cursor-pointer file:border file:border-line file:bg-paper file:px-4 file:py-2 file:text-[12px] file:text-ink hover:file:border-ink"
            />
            <button type="submit" className="mono w-full bg-brand-dark px-5 py-2.5 text-[12px] text-white hover:opacity-90 sm:w-auto">
              METTRE À JOUR →
            </button>
          </form>
          {org.logo_url ? (
            <form action={retirerLogoAvecSlug} className="mt-3">
              <button type="submit" className="mono text-[11px] text-ink-faint underline underline-offset-2 hover:text-ink">
                Retirer le logo
              </button>
            </form>
          ) : null}
        </section>

        {/* POLICE & FOND — le template typographique et le mode blanc/noir du site,
            modifiables après création (avant : figés au wizard). */}
        <section className="mt-6 border border-line bg-paper p-6">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">POLICE &amp; FOND DU SITE<Cur /></p>
          <form action={changerThemeAvecSlug}>
            <div className="mt-5 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-2">
              {THEME_TEMPLATES.map((t) => (
                <label key={t.id} className="flex cursor-pointer items-center gap-4 bg-paper px-4 py-3">
                  <input type="radio" name="template" value={t.id} defaultChecked={templateActuel === t.id} />
                  <span className="text-[24px] leading-none" style={{ fontFamily: t.sans }} aria-hidden>Aa</span>
                  <span>
                    <span className="block text-[14px] font-medium" style={{ fontFamily: t.sans }}>{t.label}</span>
                    <span className="block text-[12px] text-ink-soft">{t.description}</span>
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-5">
              <span className="mono text-[10px] uppercase tracking-label text-ink-soft">FOND</span>
              {THEME_MODES.map((m) => (
                <label key={m.id} className="mono flex cursor-pointer items-center gap-2 text-[12px]">
                  <input type="radio" name="mode" value={m.id} defaultChecked={modeActuel === m.id} />
                  <span
                    className="inline-block h-4 w-4 border border-line align-middle"
                    style={{ background: m.id === "noir" ? "#131312" : "#FCFCFA" }}
                    aria-hidden
                  />
                  {m.label.toUpperCase()}
                </label>
              ))}
              <button type="submit" className="mono border border-line px-5 py-2.5 text-[12px] text-ink hover:border-ink">
                APPLIQUER →
              </button>
            </div>
          </form>
        </section>

        {/* COULEUR */}
        <section className="mt-6 border border-line bg-paper p-6">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">COULEUR DU CLUB<Cur /></p>
          <form action={changerCouleurAvecSlug} className="mt-5 flex flex-wrap items-center gap-4">
            <span className="h-10 w-10 border border-line" style={{ background: couleur }} aria-hidden />
            <input
              type="text"
              name="couleur"
              defaultValue={couleur}
              maxLength={7}
              spellCheck={false}
              aria-label="Code couleur hexadécimal"
              className="mono w-32 border border-line bg-paper px-3 py-2.5 uppercase outline-none focus:border-ink"
            />
            <button type="submit" className="mono border border-line px-5 py-2.5 text-[12px] text-ink hover:border-ink">
              APPLIQUER →
            </button>
          </form>
          <p className="mt-3 text-[13px] text-ink-soft">
            Collez le code hexadécimal de votre couleur (logo, maillot…). Elle s&apos;applique en touches d&apos;accent.
          </p>
        </section>
      </div>
    </main>
  );
}
