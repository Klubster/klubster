"use client";

import { useMemo, useState } from "react";

type Membre = { email: string; coursIds: string[] };
type Cours = { id: string; nom: string };

export default function Communication({
  membres,
  cours,
  contactEmail,
}: {
  membres: Membre[];
  cours: Cours[];
  contactEmail: string | null;
}) {
  const [groupe, setGroupe] = useState<string>("tous");
  const [objet, setObjet] = useState("");
  const [message, setMessage] = useState("");
  const [copie, setCopie] = useState(false);

  const emails = useMemo(() => {
    const list = groupe === "tous" ? membres : membres.filter((m) => m.coursIds.includes(groupe));
    return Array.from(new Set(list.map((m) => m.email)));
  }, [groupe, membres]);

  const mailto =
    `mailto:${contactEmail ?? ""}` +
    `?bcc=${encodeURIComponent(emails.join(","))}` +
    `&subject=${encodeURIComponent(objet)}` +
    `&body=${encodeURIComponent(message)}`;

  const trop = emails.length > 80;

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

      <div className="flex flex-wrap items-center gap-4">
        <a
          href={emails.length ? mailto : undefined}
          className={`mono px-6 py-3 text-[12px] ${emails.length ? "bg-brand text-white hover:opacity-90" : "pointer-events-none bg-bg-alt text-ink-faint"}`}
        >
          OUVRIR MON EMAIL →
        </a>
        <button onClick={copier} className="mono text-[12px] text-ink-soft hover:text-ink">
          {copie ? "✓ adresses copiées" : "copier les adresses"}
        </button>
      </div>

      <p className="mono text-[11px] leading-relaxed text-ink-faint">
        L’email s’ouvre dans votre messagerie, adresses en copie cachée (Cci) — personne ne voit les autres.
        {trop ? " Au-delà de ~80 destinataires, certaines messageries tronquent la liste : utilisez « copier les adresses »." : ""}
      </p>
    </div>
  );
}
