import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { formatPrix } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function InscriptionPage({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const cours = await getCoursByOrganisation(org.id);
  const accent = org.couleur_primaire ?? "#0B1220";

  return (
    <main className="mx-auto max-w-2xl px-5 py-12 md:px-8">
      <Link href={`/${org.slug}`} className="text-sm text-ink-soft hover:text-ink">← {org.nom}</Link>
      <h1 className="mt-4 text-3xl font-bold">Inscription</h1>
      <p className="mt-2 text-ink-soft">
        Première séance d&apos;essai gratuite. L&apos;inscription se finalise en ligne avec paiement
        sécurisé (en une fois ou échelonné).
      </p>

      <form className="mt-8 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Prénom" />
          <Field label="Nom" />
          <Field label="Email" type="email" />
          <Field label="Téléphone" type="tel" />
        </div>

        <div>
          <label className="block text-sm font-medium text-ink">Cours souhaité</label>
          <select className="mt-2 w-full rounded-control border border-line px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand">
            {cours.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nom} — {formatPrix(c.tarif_centimes)} / an
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="w-full rounded-full px-6 py-3 text-sm font-medium text-white shadow-sm"
          style={{ background: accent }}
        >
          Continuer vers le paiement (bientôt)
        </button>
        <p className="text-center font-mono text-xs text-ink-soft">
          Pièces (certificat médical, photo…) et paiement Stripe : jalon suivant.
        </p>
      </form>
    </main>
  );
}

function Field({ label, type = "text" }: { label: string; type?: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-ink">{label}</label>
      <input
        type={type}
        className="mt-2 w-full rounded-control border border-line px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand"
      />
    </div>
  );
}
