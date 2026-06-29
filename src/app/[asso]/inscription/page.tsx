import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix } from "@/lib/format";
import { inscrireAdherent } from "./actions";

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

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}`} className="mono text-[12px] text-ink-soft hover:text-ink">← {org.nom}</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          INSCRIPTION<span style={{ color: accent }}>_</span>
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-14 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          SECTION 01 — ADHÉSION<span style={{ color: accent }}>_</span>
        </p>
        <h1 className="mt-6 text-3xl font-medium md:text-4xl">Rejoindre {org.nom}.</h1>
        <p className="mt-4 max-w-prose text-ink-soft">
          Première séance d&apos;essai gratuite. Remplissez vos informations, le club vous recontacte
          pour finaliser.
        </p>

        {searchParams?.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            Une erreur est survenue. Vérifiez vos informations et réessayez.
          </p>
        ) : null}

        <form action={inscrireAdherent} className="mt-12">
          <input type="hidden" name="slug" value={org.slug} />
          <div className="space-y-px border border-line bg-line">
            <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
              <Field label="PRÉNOM" name="prenom" required />
              <Field label="NOM" name="nom" required />
              <Field label="EMAIL" name="email" type="email" />
              <Field label="TÉLÉPHONE" name="tel" type="tel" />
            </div>
            <div className="bg-paper px-5 py-4">
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS SOUHAITÉ</label>
              <select name="cours" required className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink">
                {cours.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} — {formatPrix(c.tarif_centimes)} / an
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" className="mono mt-8 w-full px-6 py-4 text-[13px] text-white" style={{ background: accent }}>
            VALIDER MON INSCRIPTION →
          </button>
        </form>
        <p className="mono mt-4 text-center text-[11px] text-ink-faint">
          Paiement en ligne sécurisé (Stripe) : activé prochainement par le club.
        </p>
      </div>
    </main>
  );
}

function Field({ label, name, type = "text", required }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[10px] uppercase tracking-label text-ink-soft">
        {label}{required ? " *" : ""}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
      />
    </div>
  );
}
