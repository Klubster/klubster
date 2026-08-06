import Link from "next/link";
import { EtatVide } from "@/components/ui/EtatVide";

/**
 * Historique des campagnes manuelles.
 *
 * Le vocabulaire est le point sensible de cet écran. « Accepté » veut dire que Resend a
 * pris la requête ; « distribué » que le serveur du destinataire l'a acceptée. Ni l'un ni
 * l'autre ne prouve que le message a été lu, ni même qu'il est arrivé en boîte
 * principale — la mention sous la liste le dit explicitement, et il ne faut pas la
 * retirer pour gagner deux lignes.
 *
 * Aucune ouverture, aucun clic : ils ne sont pas mesurés et ne le seront pas
 * (docs/audit-messages-2026-07-30.md).
 */

export type CampagneListe = {
  id: string;
  objet: string;
  groupe_libelle: string;
  auteur_nom: string | null;
  statut: string;
  nombre_destinataires: number;
  nombre_acceptes: number;
  nombre_distribues: number;
  nombre_retardes: number;
  nombre_echecs: number;
  nombre_plaintes: number;
  created_at: string;
};

// « Envoi terminé » et non « Envoyé » : le statut `envoye` dit seulement que tous les
// lots ont été acceptés par Resend. Ce sont les compteurs, en dessous, qui racontent ce
// qui est réellement arrivé.
const ETAT: Record<string, { texte: string; classe: string }> = {
  preparation: { texte: "En préparation", classe: "text-ink-soft" },
  en_cours: { texte: "Envoi en cours", classe: "text-warning" },
  envoye: { texte: "Envoi terminé", classe: "text-brand-dark" },
  partiel: { texte: "Partiellement envoyé", classe: "text-warning" },
  echec: { texte: "Échec", classe: "text-danger" },
};

function quand(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })} à ${d
    .toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
    .replace(":", " h ")}`;
}

export default function Historique({ campagnes, slug }: { campagnes: CampagneListe[]; slug: string }) {
  if (campagnes.length === 0) {
    return (
      <section className="mt-14">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
          MESSAGES ENVOYÉS<span className="cur">_</span>
        </p>
        <div className="mt-4">
          {/* Premier usage : le composeur est juste au-dessus — pas de lien d'action. */}
          <EtatVide
            titre="Aucun message envoyé pour le moment."
            detail="Composez le premier au-dessus : il apparaîtra ici, avec son état d’acheminement."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="mt-14">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        MESSAGES ENVOYÉS<span className="cur">_</span>
      </p>

      <div className="mt-4 border border-line">
        {campagnes.map((c) => {
          const etat = ETAT[c.statut] ?? ETAT.preparation;
          return (
            <Link
              key={c.id}
              href={`/${slug}/cockpit/communication/${c.id}`}
              className="block border-b border-line px-4 py-4 last:border-b-0 hover:bg-bg-alt"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <span className="flex-1 text-[15px] font-medium">{c.objet}</span>
                <span className={`mono text-[11px] ${etat.classe}`}>{etat.texte}</span>
              </div>

              <p className="mono mt-1.5 text-[11px] text-ink-soft">
                {c.groupe_libelle} · {c.nombre_destinataires} destinataire
                {c.nombre_destinataires > 1 ? "s" : ""} · {quand(c.created_at)}
                {c.auteur_nom ? ` · ${c.auteur_nom}` : ""}
              </p>

              <p className="mono mt-1 text-[11px] text-ink-soft">
                {c.nombre_acceptes} accepté{c.nombre_acceptes > 1 ? "s" : ""}
                {c.nombre_distribues > 0 ? ` · ${c.nombre_distribues} distribué${c.nombre_distribues > 1 ? "s" : ""}` : ""}
                {c.nombre_retardes > 0 ? ` · ${c.nombre_retardes} retardé${c.nombre_retardes > 1 ? "s" : ""}` : ""}
                {c.nombre_echecs > 0 ? (
                  <span className="text-danger"> · {c.nombre_echecs} échec{c.nombre_echecs > 1 ? "s" : ""}</span>
                ) : null}
                {c.nombre_plaintes > 0 ? (
                  <span className="text-danger"> · {c.nombre_plaintes} plainte{c.nombre_plaintes > 1 ? "s" : ""}</span>
                ) : null}
              </p>
            </Link>
          );
        })}
      </div>

      <p className="mono mt-3 max-w-prose text-[11px] leading-relaxed text-ink-faint">
        « Accepté » signifie que l’envoi a été pris en charge ; « distribué », que le serveur
        de messagerie du destinataire l’a accepté. Ni l’un ni l’autre ne garantit que le
        message a été lu, ni qu’il est arrivé dans la boîte principale. Klubster ne mesure ni
        les ouvertures ni les clics.
      </p>
    </section>
  );
}
