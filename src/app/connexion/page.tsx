"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { connexion, inscription } from "./actions";

function Cur() {
  return <span className="cur">_</span>;
}

function ConnexionInner() {
  const params = useSearchParams();
  const next = params.get("next") ?? "/creer";
  // Le visiteur a cliqué « Créer mon association » : on lui ouvre la création de compte,
  // pas un formulaire de connexion. Un compte existant peut toujours basculer d'un clic.
  const veutCreer = next === "/creer";
  const [mode, setMode] = useState<"login" | "signup">(veutCreer ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      if (mode === "login") {
        const r = await connexion({ email, password, next });
        if (r?.error) { setErr(r.error); setLoading(false); }
      } else {
        const r = await inscription({ email, password, prenom, nom, next });
        if (r?.error) { setErr(r.error); setLoading(false); }
        else if (r?.message) { setMsg(r.message); setLoading(false); }
      }
    } catch (e: unknown) {
      const digest = (e as { digest?: string })?.digest;
      if (typeof digest === "string" && digest.startsWith("NEXT_REDIRECT")) throw e;
      setErr("Une erreur est survenue."); setLoading(false);
    }
  }

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href="/" className="font-logo text-lg font-semibold">k<Cur /></Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">ESPACE PRÉSIDENT<Cur /></span>
      </header>

      <div className="mx-auto max-w-md px-6 py-16 md:px-8">
        {veutCreer ? (
          <div className="mb-10">
            <h1 className="text-3xl font-medium leading-tight tracking-[-0.01em]">Créez votre association.</h1>
            <p className="mono mt-4 text-[11px] uppercase tracking-label text-ink-soft">
              Gratuit à la création · Sans engagement · Prêt en moins de 30 minutes<Cur />
            </p>
          </div>
        ) : null}

        <div className="mb-8 grid grid-cols-2 gap-px border border-line bg-line">
          <button onClick={() => setMode("login")} className={`mono bg-paper py-3 text-[12px] tracking-wide ${mode === "login" ? "font-bold text-ink" : "text-ink-soft"}`}>
            SE CONNECTER{mode === "login" ? <Cur /> : null}
          </button>
          <button onClick={() => setMode("signup")} className={`mono bg-paper py-3 text-[12px] tracking-wide ${mode === "signup" ? "font-bold text-ink" : "text-ink-soft"}`}>
            CRÉER UN COMPTE{mode === "signup" ? <Cur /> : null}
          </button>
        </div>

        <div className="space-y-4">
          {mode === "signup" && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="PRÉNOM" value={prenom} onChange={setPrenom} />
              <Field label="NOM" value={nom} onChange={setNom} />
            </div>
          )}
          <Field label="EMAIL" type="email" value={email} onChange={setEmail} />
          <Field label="MOT DE PASSE" type="password" value={password} onChange={setPassword} />
        </div>

        {err ? <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }}>{err}</p> : null}
        {msg ? <p className="mono mt-4 text-[12px]" style={{ color: "#279B65" }}>{msg}</p> : null}

        <button
          onClick={submit}
          disabled={loading || !email || !password || (mode === "signup" && !prenom)}
          className="mono mt-8 w-full bg-ink px-6 py-4 text-[13px] text-paper hover:bg-ink/90 disabled:opacity-40"
        >
          {loading ? "…" : mode === "login" ? "SE CONNECTER →" : "CRÉER MON COMPTE →"}
        </button>

        <p className="mono mt-6 text-center text-[11px] text-ink-soft">
          {mode === "login"
            ? "Pas encore d’association ? Créez un compte."
            : "Vous gérez déjà une association ? Connectez-vous."}
        </p>
      </div>
    </main>
  );
}

export default function ConnexionPage() {
  return (
    <Suspense fallback={null}>
      <ConnexionInner />
    </Suspense>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="mono block text-[11px] uppercase tracking-label text-ink-soft">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-2 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
      />
    </div>
  );
}
