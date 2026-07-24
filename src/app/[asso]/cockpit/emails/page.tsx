import Link from "next/link";
import { redirect } from "next/navigation";
import { getOrganisationBySlug } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { lireEmailsConfig, EMAILS_LABELS, type EmailsConfig } from "@/lib/emails-config";
import { enregistrerEmailsConfig } from "./actions";

export const dynamic = "force-dynamic";

// Ordre d'affichage : la relance à 30 jours d'abord, ses variantes optionnelles ensuite.
const ORDRE: (keyof EmailsConfig)[] = [
  "relance_pieces_30",
  "relance_pieces_60",
  "relance_pieces_90",
  "relance_impaye",
  "recap_hebdo",
];

export default async function EmailsPage(props: {
  params: Promise<{ asso: string }>;
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const { asso } = await props.params;
  const searchParams = await props.searchParams;

  const org = await getOrganisationBySlug(asso);
  if (!org) redirect(`/${asso}`);
  const profile = await getProfile();
  const estPresident =
    profile && (profile.role === "super_admin" || (profile.organisation_id === org.id && profile.role === "admin_asso"));
  if (!estPresident) redirect(`/${asso}/cockpit?acces=refuse`);

  const cfg = lireEmailsConfig(org.emails_config);
  const accent = org.couleur_primaire ?? "#111111";

  return (
    <main className="min-h-screen text-ink">
      {/* md:px-8 et « ← COCKPIT » : même gabarit d'en-tête que les autres sous-pages. */}
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${asso}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← COCKPIT
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          EMAILS AUTOMATIQUES<span style={{ color: accent }}>_</span>
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-10 md:px-8 md:py-14">
        <h1 className="text-3xl font-medium leading-tight md:text-4xl">Vos emails automatiques.</h1>
        <p className="mt-3 text-[15px] text-ink-soft">
          Klubster envoie quelques emails à votre place, pour vous éviter de courir après les dossiers et
          les cotisations. Vous décidez lesquels. Les confirmations d&apos;inscription et les reçus, eux,
          partent toujours : ce sont des messages attendus, jamais des relances.
        </p>

        {searchParams?.ok ? (
          <p className="mono mt-6 border px-4 py-3 text-[12px]" style={{ borderColor: accent, color: accent }}>
            Réglages enregistrés.
          </p>
        ) : null}
        {searchParams?.erreur ? (
          <p className="mono mt-6 border border-line px-4 py-3 text-[12px]" style={{ color: "#B23B3B" }}>
            Enregistrement impossible. Réessayez.
          </p>
        ) : null}

        <form action={enregistrerEmailsConfig.bind(null, asso)} className="mt-10 space-y-4">
          {ORDRE.map((cle) => {
            const meta = EMAILS_LABELS[cle];
            const estOption = cle === "relance_pieces_60" || cle === "relance_pieces_90";
            return (
              <label
                key={cle}
                className={`flex cursor-pointer items-start gap-4 border border-line p-5 ${estOption ? "ml-0 md:ml-6" : ""}`}
              >
                <input type="checkbox" name={cle} defaultChecked={cfg[cle]} className="mt-1" />
                <span>
                  <span className="text-[15px] font-medium">
                    {meta.titre}
                    {estOption ? <span className="mono ml-2 text-[10px] uppercase text-ink-faint">option</span> : null}
                  </span>
                  <span className="mono mt-1 block text-[12px] leading-relaxed text-ink-soft">{meta.detail}</span>
                </span>
              </label>
            );
          })}

          <p className="mono pt-2 text-[11px] leading-relaxed text-ink-soft">
            Nous n&apos;envoyons jamais plus d&apos;une relance tous les 7 jours à une même personne, et une
            relance s&apos;arrête dès que le dossier est complet ou la cotisation réglée.
          </p>

          <button
            className="mono mt-2 w-full px-6 py-3 text-[13px] text-white transition-opacity hover:opacity-90 sm:w-auto"
            style={{ background: accent }}
          >
            ENREGISTRER →
          </button>
        </form>
      </div>
    </main>
  );
}
