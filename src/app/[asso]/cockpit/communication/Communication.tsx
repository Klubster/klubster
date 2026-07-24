"use client";

import { useMemo, useState, useTransition } from "react";
import { envoyerMessage } from "./actions";

type Membre = { email: string; coursIds: string[]; mineur: boolean; incomplet: boolean };
type Cours = { id: string; nom: string };

export default function Communication({
  membres,
  cours,
  contactEmail,
  slug,
  envoiDirect,
}: {
  membres: Membre[];
  cours: Cours[];
  contactEmail: string | null;
  slug: string;
  envoiDirect: boolean; // RESEND_API_KEY configurée côté serveur
}) {
  const [groupe, setGroupe] = useState<string>("tous");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [copie, setCopie] = useState(false);
  const [envoi, setEnvoi] = useState<{ ok: boolean; texte: string } | null>(null);
  const [enCours, startTransition] = useTransition();

  const emails = useMemo(() => {
    const list =
      groupe === "tous"
        ? membres
        : groupe === "parents"
          ? membres.filter((m) => m.mineur)
          : groupe === "incomplet"
            ? membres.filter((m) => m.incomplet)
            : membres.filter((m) => m.coursIds.includes(groupe));
    return Array.from(new Set(list.map((m) => m.email)));
  }, [groupe, membres]);

  const mailto =
    `mailto:${contactEmail ?? ""}` +
    `?bcc=${encodeURIComponent(emails.join(","))}` +
    `&subject=${encodeURIComponent(objet)}` +
    `&body=${encodeURIComponent(message)}`;

  const pret = emails.length > 0 && objet.trim().length > 0 && message.trim().length > 0;

  function envoyer() {
    setEnvoi(null);
    startTransition(async () => {
      const res = await envoyerMessage(slug, groupe, objet, message);
      if (res.ok) {
        setEnvoi({
          ok: true,
          texte: `✓ Message envoyé à ${res.envoyes} adhérent${res.envoyes > 1 ? "s" : ""}${res.erreur ? ` — ${res.erreur}` : ""}`,
        });
        setObjet("");
        setMessage("");
      } else {
        setEnvoi({ ok: false, texte: res.erreur ?? "L'envoi a échoué." });
      }
    });
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(emails.join(", "));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papier indisponible */
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <div className="border border-line bg-paper px-5 py-4">
        <label className="mono text-[10px] uppercase tracking-label text-ink-soft">DESTINATAIRES</label>
        <select
          value={groupe}
          onChange={(e) => setGroupe(e.target.value)}
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        >
          <option value="tous">Tous les adhérents</option>
          <option value="parents">Parents (adhérents mineurs)</option>
          <option value="incomplet">Dossiers incomplets</option>
          {cours.length > 0 ? <option disabled>──────────</option> : null}
          {cours.map((c) => (
            <option key={c.id} value={c.id}>{c.nom}</option>
          ))}
        </select>
        <p className="mono mt-2 text-[11px] text-ink-soft">
          {emails.length} destinataire{emails.length > 1 ? "s" : ""} avec un email
        </p>
      </div>

      <div className="border border-line bg-paper px-5 py-4">
        <label className="mono text-[10px] uppercase tracking-label text-ink-soft">OBJET</label>
        <input
          value={objet}
          onChange={(e) => setObjet(e.target.value)}
          placeholder="Reprise des cours le 4 septembre"
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        />
        <label className="mono mt-5 block text-[10px] uppercase tracking-label text-ink-soft">MESSAGE</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
        />
      </div>

      {envoi ? (
        <p className="mono text-[12px]" style={{ color: envoi.ok ? "#279B65" : "#B23B3B" }}>{envoi.texte}</p>
      ) : null}

      {/* L'action d'envoi est LE geste de la page : pleine largeur au pouce. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center">
        {envoiDirect ? (
          <button
            onClick={envoyer}
            disabled={!pret || enCours}
            className="mono bg-brand px-6 py-3 text-[12px] text-white hover:opacity-90 disabled:opacity-40"
          >
            {enCours ? "ENVOI…" : "ENVOYER MAINTENANT →"}
          </button>
        ) : null}
        <a
          href={emails.length ? mailto : undefined}
          className={`mono px-6 py-3 text-center text-[12px] ${
            envoiDirect
              ? emails.length
                ? "border border-ink hover:bg-ink hover:text-paper"
                : "pointer-events-none border border-line text-ink-faint"
              : emails.length
                ? "bg-brand text-white hover:opacity-90"
                : "pointer-events-none bg-bg-alt text-ink-faint"
          }`}
        >
          OUVRIR MON EMAIL →
        </a>
        <button onClick={copier} className="mono text-[12px] text-ink-soft hover:text-ink">
          {copie ? "✓ adresses copiées" : "copier les adresses"}
        </button>
      </div>

      <p className="mono text-[11px] leading-relaxed text-ink-faint">
        {envoiDirect ? (
          <>
            « Envoyer maintenant » expédie un email individuel à chaque adhérent depuis clubs@klubster.fr —
            les réponses arrivent {contactEmail ? `sur ${contactEmail}` : "sur l'email du club"}.
            En dépannage, « Ouvrir mon email » passe par votre messagerie (Cci).
          </>
        ) : (
          <>
            L&apos;email s&apos;ouvre dans votre messagerie, adresses en copie cachée (Cci) — personne ne voit les autres.
          </>
        )}
      </p>
    </div>
  );
}
