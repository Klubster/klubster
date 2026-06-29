import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InscriptionPage({ params }: { params: { asso: string } }) {
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
          Première séance d&apos;essai gratuite. L&apos;inscription se finalise en ligne, paiement
          sécurisé (en une fois ou échelonné).
        </p>

        <form className="mt-12 space-y-px border border-line bg-line">
          <div className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
            <Field label="PRÉNOM" />
            <Field label="NOM" />
            <Field label="EMAIL" type="email" />
            <Field label="TÉLÉPHONE" type="tel" />
          </div>
          <div className="bg-paper px-5 py-4">
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS SOUHAITÉ</label>
            <select className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink">
              {cours.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nom} — {formatPrix(c.tarif_centimes)} / an
                </option>
              ))}
            </select>
          </div>
        </form>

        <button
          type="button"
          className="mono mt-8 w-full px-6 py-4 text-[13px] text-white"
          style={{ background: accent }}
        >
          CONTINUER VERS LE PAIEMENT →
        </button>
        <p className="mono mt-4 text-center text-[11px] text-ink-faint">
          Pièces (certificat médical, photo…) et paiement Stripe : prochain jalon.
        </p>
      </div>
    </main>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <label className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        type={type}
        className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
      />
    </div>
  );
}
