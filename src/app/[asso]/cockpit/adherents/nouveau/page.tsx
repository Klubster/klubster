import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getOrganisationBySlug, getCoursByOrganisation } from "@/lib/queries";
import { getProfile } from "@/lib/auth";
import { formatPrix } from "@/lib/format";
import { ajouterAdherent } from "../actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

const CHAMP = "mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink";

export default async function NouvelAdherent(
  props: {
    params: Promise<{ asso: string }>;
    searchParams: Promise<{ erreur?: string }>;
  }
) {
  const searchParams = await props.searchParams;
  const params = await props.params;
  const org = await getOrganisationBySlug(params.asso);
  if (!org) notFound();
  const profile = await getProfile();
  if (!profile || (profile.organisation_id !== org.id && profile.role !== "super_admin")) {
    redirect(`/connexion?next=/${params.asso}/cockpit/adherents/nouveau`);
  }
  const cours = await getCoursByOrganisation(org.id);
  const ajouter = ajouterAdherent.bind(null, org.slug);

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${org.slug}/cockpit/adherents`} className="mono text-[12px] text-ink-soft hover:text-ink">
          ← ADHÉRENTS
        </Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">
          NOUVEL ADHÉRENT<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <h1 className="text-3xl font-medium tracking-[-0.01em]">Ajouter un adhérent.</h1>
        <p className="mt-3 max-w-prose text-lg text-ink-soft">
          Pour une inscription prise sur papier, au forum des associations ou par téléphone.
          L’adhérent n’aura pas de compte : il pourra en créer un plus tard avec le même email.
        </p>

        {searchParams.erreur ? (
          <p className="mono mt-6 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur === "nom"
              ? "Le prénom et le nom sont obligatoires."
              : "L’enregistrement a échoué. Réessayez."}
          </p>
        ) : null}

        <form action={ajouter} className="mt-10 space-y-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM *</label>
              <input name="prenom" required className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM *</label>
              <input name="nom" required className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL</label>
              <input name="email" type="email" className={CHAMP} />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE</label>
              <input name="telephone" className={CHAMP} />
            </div>
          </div>

          {cours.length > 0 ? (
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">COURS</label>
              <select name="cours" className={CHAMP} defaultValue="">
                <option value="">Aucun cours pour l’instant</option>
                {cours.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nom} — {formatPrix(c.tarif_centimes)} / an
                  </option>
                ))}
              </select>
              <p className="mono mt-2 text-[11px] text-ink-soft">
                Le montant est repris du cours. L’adhésion sera créée « en attente » : encaissez-la
                depuis les Paiements quand le chèque arrive.
              </p>
            </div>
          ) : null}

          <div>
            <label className="mono text-[10px] uppercase tracking-label text-ink-soft">RÈGLEMENT PRÉVU</label>
            <select name="mode" className={CHAMP} defaultValue="cheque">
              <option value="cheque">Par chèque</option>
              <option value="especes">En espèces</option>
              <option value="en_ligne">En ligne</option>
            </select>
          </div>

          <button className="mono w-full bg-ink px-6 py-4 text-[13px] text-paper hover:bg-ink/90">
            AJOUTER L’ADHÉRENT →
          </button>
        </form>
      </div>
    </main>
  );
}
