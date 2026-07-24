import Link from "next/link";
import { notFound } from "next/navigation";
import { verifierSuperAdmin } from "@/lib/admin";
import { listerCodesPromo, stripeModeTest, stripeConfigured, type CodePromoAdmin } from "@/lib/stripe";
import { creerCodePromoAction, basculerCodePromoAction } from "./actions";

export const dynamic = "force-dynamic";

function Cur() {
  return <span className="cur">_</span>;
}

function dateCourte(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

export default async function CodesPromoPage(props: {
  searchParams: Promise<{ ok?: string; erreur?: string }>;
}) {
  const searchParams = await props.searchParams;
  const profile = await verifierSuperAdmin();
  if (!profile) notFound();

  const configure = stripeConfigured();
  let codes: CodePromoAdmin[] = [];
  let erreurLecture: string | null = null;
  if (configure) {
    try {
      codes = await listerCodesPromo();
    } catch (e) {
      erreurLecture = e instanceof Error ? e.message : "Lecture impossible.";
    }
  }

  return (
    <main className="min-h-screen text-ink">
      {/* Même en-tête que la fiche club : retour à gauche, kicker à droite. */}
      <header className="flex items-center justify-between gap-3 border-b border-line px-6 py-4 md:px-10">
        <Link href="/admin" className="mono min-w-0 truncate text-[11px] uppercase tracking-label text-ink-soft hover:text-ink">
          ← CONSOLE
        </Link>
        <span className="mono shrink-0 text-[11px] uppercase tracking-label text-ink-soft">
          CODES PROMO<Cur />
        </span>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-10 md:px-10 md:py-14">
        <h1 className="text-3xl font-medium leading-tight md:text-4xl">Codes promo de l’abonnement.</h1>
        <p className="mt-3 max-w-prose text-[15px] text-ink-soft">
          Ces codes s’appliquent à l’abonnement Klubster, saisis par le club dans son cockpit. Utiles pour
          les pilotes (première saison offerte) ou une remise ponctuelle.
        </p>
        <p className="mono mt-4 text-[11px] uppercase tracking-label" style={{ color: stripeModeTest ? "#8A6A2F" : "#279B65" }}>
          {stripeModeTest ? "MODE TEST — codes de test" : "MODE PRODUCTION — codes réels"}
          <Cur />
        </p>

        {searchParams?.ok ? (
          <p className="mono mt-6 border border-brand px-4 py-3 text-[12px]" style={{ color: "#279B65" }}>
            Code « {searchParams.ok} » créé. Il est prêt à être communiqué au club.
          </p>
        ) : null}
        {searchParams?.erreur ? (
          <p className="mono mt-6 border border-line px-4 py-3 text-[12px]" style={{ color: "#B23B3B" }}>
            {searchParams.erreur}
          </p>
        ) : null}

        {!configure ? (
          <p className="mono mt-10 text-[13px]" style={{ color: "#B23B3B" }}>
            Stripe n’est pas configuré : impossible de créer un code pour l’instant.
          </p>
        ) : (
          <>
            {/* CRÉER */}
            <form action={creerCodePromoAction} className="mt-10 border border-line bg-paper p-6 md:p-8">
              <p className="mono text-[11px] uppercase tracking-label text-ink-soft">NOUVEAU CODE<Cur /></p>

              <label className="mono mt-6 block text-[10px] uppercase tracking-label text-ink-soft">CODE</label>
              <input
                name="code"
                required
                placeholder="PILOTE27"
                maxLength={40}
                className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[15px] uppercase outline-none focus:border-ink"
              />

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">TYPE DE REMISE</label>
                  <select name="type" defaultValue="gratuit" className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[14px] outline-none focus:border-ink">
                    <option value="gratuit">Gratuit (100 %)</option>
                    <option value="pourcent">Pourcentage</option>
                    <option value="montant">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">
                    VALEUR (% ou €, ignoré si gratuit)
                  </label>
                  <input
                    name="valeur"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="ex. 20"
                    className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-ink"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">DURÉE</label>
                  <select name="duree" defaultValue="repeating" className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[14px] outline-none focus:border-ink">
                    <option value="once">1re facture seulement</option>
                    <option value="repeating">Plusieurs mois</option>
                    <option value="forever">Sans limite</option>
                  </select>
                </div>
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">
                    NOMBRE DE MOIS (si « plusieurs mois »)
                  </label>
                  <input
                    name="duree_mois"
                    type="number"
                    min="1"
                    defaultValue={12}
                    className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-ink"
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">
                    UTILISATIONS MAX (vide = illimité)
                  </label>
                  <input
                    name="max"
                    type="number"
                    min="1"
                    placeholder="ex. 10"
                    className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-ink"
                  />
                </div>
                <div>
                  <label className="mono block text-[10px] uppercase tracking-label text-ink-soft">
                    EXPIRE LE (vide = jamais)
                  </label>
                  <input
                    name="expire"
                    type="date"
                    className="mono mt-2 w-full border border-line bg-paper px-4 py-3 text-[15px] outline-none focus:border-ink"
                  />
                </div>
              </div>

              {/* Encre plutôt qu'aplat vert : le vert reste un détail dans la console.
                  Pleine largeur sur téléphone, comme les champs au-dessus. */}
              <button className="mono mt-7 w-full bg-ink px-6 py-3 text-[13px] text-paper hover:bg-ink/90 sm:w-auto">
                CRÉER LE CODE →
              </button>
            </form>

            {/* LISTE */}
            <h2 className="mono mt-14 text-[11px] uppercase tracking-label text-ink-soft">
              CODES EXISTANTS ({codes.length})<Cur />
            </h2>
            {erreurLecture ? (
              <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{erreurLecture}</p>
            ) : codes.length === 0 ? (
              <p className="mt-4 text-[14px] text-ink-soft">Aucun code pour l’instant.</p>
            ) : (
              <div className="mt-4 divide-y divide-line border border-line">
                {codes.map((c) => (
                  <div key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <div className="min-w-0">
                      <span className="mono text-[15px] font-medium">{c.code}</span>
                      {!c.actif ? <span className="mono ml-2 text-[10px] uppercase text-ink-faint">désactivé</span> : null}
                      <div className="mt-1 text-[13px] text-ink-soft">
                        {c.avantage}
                        {" · "}
                        {c.utilisations} utilisation{c.utilisations > 1 ? "s" : ""}
                        {c.maxUtilisations != null ? ` / ${c.maxUtilisations}` : ""}
                        {c.expireLe ? ` · expire le ${dateCourte(c.expireLe)}` : ""}
                      </div>
                    </div>
                    <form action={basculerCodePromoAction.bind(null, c.id, !c.actif)} className="shrink-0">
                      <button className="mono border border-line px-4 py-2 text-[11px] uppercase tracking-label hover:border-ink">
                        {c.actif ? "Désactiver" : "Réactiver"}
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
