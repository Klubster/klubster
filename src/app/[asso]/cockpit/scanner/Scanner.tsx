"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { verifierAdherent, marquerPresent, rechercher, type VerifResult } from "./actions";

function Cur() { return <span className="cur">_</span>; }

export default function Scanner({ slug, nom, accent }: { slug: string; nom: string; accent: string }) {
  const [cam, setCam] = useState(false);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<VerifResult | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ id: string; prenom: string; nom: string }[]>([]);
  const [present, setPresent] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  async function verifier(id: string) {
    setCurrentId(id);
    const r = await verifierAdherent(slug, id);
    setResult(r);
    setPresent(!!r.present);
  }

  useEffect(() => {
    if (!cam) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    async function start() {
      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (!BD) { setCamOk(false); return; }
      try {
        const detector = new BD({ formats: ["qr_code"] });
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamOk(true);
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) { setCam(false); verifier(codes[0].rawValue.trim()); return; }
          } catch { /* ignore */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch { setCamOk(false); }
    }
    start();
    return () => { stopped = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← COCKPIT</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">SCANNER · APPEL<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PRÉSENCE — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Faire l&apos;appel.</h1>

        {/* Caméra */}
        <div className="mt-8">
          {!cam ? (
            <button onClick={() => { setCam(true); setCamOk(null); }} className="mono bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90">
              SCANNER UN QR CODE →
            </button>
          ) : (
            <div className="border border-line bg-paper p-3">
              <video ref={videoRef} className="w-full" muted playsInline />
              <div className="mt-2 flex items-center justify-between">
                <span className="mono text-[11px] text-ink-soft">Présentez le QR du membre…</span>
                <button onClick={() => setCam(false)} className="mono text-[11px] text-ink-soft hover:text-ink">ARRÊTER</button>
              </div>
            </div>
          )}
          {camOk === false ? (
            <p className="mono mt-3 text-[11px] text-ink-faint">Caméra non disponible sur ce navigateur — utilisez la recherche par nom.</p>
          ) : null}
        </div>

        {/* Recherche par nom */}
        <div className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">OU RECHERCHER<Cur /></p>
          <input
            value={q}
            onChange={async (e) => { const v = e.target.value; setQ(v); setList(await rechercher(slug, v)); }}
            placeholder="Nom ou prénom"
            className="mt-3 w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink"
          />
          {list.length > 0 ? (
            <div className="mt-2 divide-y divide-line border border-line bg-paper">
              {list.map((m) => (
                <button key={m.id} onClick={() => { setQ(""); setList([]); verifier(m.id); }} className="block w-full px-4 py-3 text-left text-[14px] hover:bg-bg-alt">
                  {m.prenom} {m.nom}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Résultat */}
        {result ? (
          <div className="mt-10 border border-line bg-paper p-6">
            {!result.ok ? (
              <p className="mono text-[13px]" style={{ color: "#B23B3B" }}>{result.error}</p>
            ) : (
              <>
                <div className="text-2xl font-medium">{result.prenom} {result.nom}</div>
                <div className="text-ink-soft">{result.cours ?? "—"}</div>
                <div className="mt-5 grid grid-cols-2 gap-px border border-line bg-line">
                  <Etat label="RÈGLEMENT" ok={result.regle} okText="À jour" koText="Non réglé" />
                  <Etat label="DOSSIER" ok={(result.piecesManquantes ?? 0) === 0} okText="Complet" koText={`${result.piecesManquantes} pièce(s) manquante(s)`} />
                </div>
                <div className="mt-6">
                  {present ? (
                    <span className="mono text-[13px]" style={{ color: accent }}>✓ PRÉSENT AUJOURD&apos;HUI</span>
                  ) : (
                    <button
                      onClick={async () => { if (currentId) { const r = await marquerPresent(slug, currentId); if (r.ok) setPresent(true); } }}
                      className="mono px-6 py-3 text-[13px] text-white"
                      style={{ background: accent }}
                    >
                      MARQUER PRÉSENT →
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function Etat({ label, ok, okText, koText }: { label: string; ok?: boolean; okText: string; koText: string }) {
  return (
    <div className="bg-paper px-5 py-4">
      <div className="mono text-[10px] uppercase tracking-label text-ink-soft">{label}</div>
      <div className="mono mt-2 text-[15px] font-bold" style={{ color: ok ? "#279B65" : "#B23B3B" }}>
        {ok ? `✓ ${okText}` : `✕ ${koText}`}
      </div>
    </div>
  );
}
