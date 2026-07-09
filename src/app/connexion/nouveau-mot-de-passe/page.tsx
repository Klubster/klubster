"use client";
import { useState } from "react";
import Link from "next/link";
import { definirNouveauMotDePasse } from "../actions";
import { LONGUEUR_MIN_MDP } from "@/lib/mot-de-passe";

function Cur() {
  return <span className="cur">_</span>;
}

export default function NouveauMotDePasse() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function valider() {
    setErr(null);
    if (password.length < LONGUEUR_MIN_MDP) {
      setErr(`Le mot de passe doit faire au moins ${LONGUEUR_MIN_MDP} caractères.`);
      return;
    }
    if (password !== confirmation) {
      setErr("Les deux mots de passe ne sont pas identiques.");
      return;
    }
    setLoading(true);
    try {
      const r = await definirNouveauMotDePasse(password);
      if (r?.error) {
        setErr(r.error);
        setLoading(false);
      }
    } catch (e: unknown) {
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setErr("Une erreur est survenue.");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ESPACE PRÉSIDENT<Cur /></span>
      </header>

      <div className="mx-auto max-w-md px-6 py-16 md:px-8">
        <h1 className="text-3xl font-medium leading-tight tracking-[-0.01em]">Choisissez un nouveau mot de passe.</h1>
        <p className="mono mt-4 text-[11px] uppercase tracking-label text-ink-soft">
          {LONGUEUR_MIN_MDP} caractères minimum<Cur />
        </p>

        <div className="mt-10 space-y-4">
          <Champ label="NOUVEAU MOT DE PASSE" value={password} onChange={setPassword} />
          <Champ label="CONFIRMEZ" value={confirmation} onChange={setConfirmation} />
        </div>

        {err ? <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{err}</p> : null}

        <button
          onClick={valider}
          disabled={loading || !password || !confirmation}
          className="mono mt-8 w-full bg-ink px-6 py-4 text-[13px] text-paper hover:bg-ink/90 disabled:opacity-40"
        >
          {loading ? "…" : "ENREGISTRER →"}
        </button>

        <p className="mono mt-6 text-center text-[11px] text-ink-soft">
          <Link href="/connexion" className="hover:text-ink">Retour à la connexion</Link>
        </p>
      </div>
    </main>
  );
}

function Champ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mono block text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        type="password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
    </div>
  );
}
