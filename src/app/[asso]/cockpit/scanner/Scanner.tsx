"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { controlerAdherent, marquerPresent, rechercher, type ControleResult } from "./actions";
import { ligneControle, COULEURS_CONTROLE, coursParDefaut } from "@/lib/controle";
import type { CoursControle } from "./page";

function Cur() { return <span className="cur">_</span>; }

const JOURS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

export default function Scanner({ slug, nom, accent, cours }: { slug: string; nom: string; accent: string; cours: CoursControle[] }) {
  const [cam, setCam] = useState(false);
  const [camOk, setCamOk] = useState<boolean | null>(null);
  const [result, setResult] = useState<ControleResult | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [list, setList] = useState<{ id: string; prenom: string; nom: string }[]>([]);
  const [present, setPresent] = useState(false);
  const [enCours, setEnCours] = useState(false);
  const [pointage, setPointage] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Réseau lent, gestes pressés : chaque demande porte un numéro, seule la
  // DERNIÈRE réponse s'affiche. Sans ça, deux scans rapprochés pouvaient
  // afficher le résultat du premier après le second.
  const demandeRef = useRef(0);
  const rechercheRef = useRef(0);
  const rechercheTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // LE COURS D'ABORD. Le statut affiché et la présence enregistrée concernent CE
  // cours — jamais une adhésion choisie en silence. Mémorisé pour la durée de la
  // session du navigateur uniquement (sessionStorage), proposé automatiquement
  // seulement quand le planning le permet sans ambiguïté.
  const [coursId, setCoursId] = useState<string | null>(null);
  useEffect(() => {
    const memorise = window.sessionStorage.getItem(`scanner-cours-${slug}`);
    if (memorise && cours.some((c) => c.id === memorise)) { setCoursId(memorise); return; }
    setCoursId(coursParDefaut(cours, JOURS[new Date().getDay()]));
  }, [slug, cours]);
  function choisirCours(id: string) {
    setCoursId(id || null);
    if (id) window.sessionStorage.setItem(`scanner-cours-${slug}`, id);
    else window.sessionStorage.removeItem(`scanner-cours-${slug}`);
    // Changer de cours invalide le résultat affiché : le statut était celui de l'ancien.
    setResult(null);
    setCurrentId(null);
  }
  const coursNom = cours.find((c) => c.id === coursId)?.nom ?? null;

  async function verifier(id: string) {
    if (!coursId) return;
    const demande = ++demandeRef.current;
    setCurrentId(id);
    setEnCours(true);
    setResult(null);
    const r = await controlerAdherent(slug, id, coursId);
    if (demande !== demandeRef.current) return; // une demande plus récente est partie
    setResult(r);
    setPresent(!!r.present);
    setEnCours(false);
  }

  useEffect(() => {
    if (!cam) return;
    let stream: MediaStream | null = null;
    let raf = 0;
    let stopped = false;
    async function start() {
      // La caméra d'abord : son absence (ou un refus d'autorisation) est la seule
      // vraie raison d'abandonner. Le décodage, lui, a toujours une solution.
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
        setCamOk(true);
      } catch { setCamOk(false); return; }

      const BD = (window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> } }).BarcodeDetector;
      if (BD) {
        // Chrome/Edge Android : détection native, rapide et économe.
        const detector = new BD({ formats: ["qr_code"] });
        const tick = async () => {
          if (stopped || !videoRef.current) return;
          try {
            const codes = await detector.detect(videoRef.current);
            if (codes.length && codes[0].rawValue) { setCam(false); verifier(codes[0].rawValue.trim()); return; }
          } catch { /* ignore */ }
          raf = requestAnimationFrame(tick);
        };
        tick();
        return;
      }

      // WebKit (tous les navigateurs iPhone/iPad, Safari macOS) n'implémente PAS
      // BarcodeDetector : l'appel au scanner affichait « Caméra non disponible »
      // sur l'app installée du président (constaté le 24/07/2026). Repli : décodage
      // jsQR sur un canvas — importé à la demande pour ne pas alourdir Android.
      const jsQR = (await import("jsqr")).default;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) { setCamOk(false); return; }
      const tick = () => {
        if (stopped || !videoRef.current) return;
        const video = videoRef.current;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          // 480px suffisent à lire un QR de carte tenu devant l'objectif, et
          // divisent par ~4 le coût du décodage par rapport au flux natif.
          const echelle = Math.min(1, 480 / video.videoWidth);
          canvas.width = Math.round(video.videoWidth * echelle);
          canvas.height = Math.round(video.videoHeight * echelle);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
          if (code?.data) { setCam(false); verifier(code.data.trim()); return; }
        }
        raf = requestAnimationFrame(tick);
      };
      tick();
    }
    start();
    return () => { stopped = true; if (raf) cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); };
  }, [cam]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <main className="min-h-screen text-ink">
      <header className="flex items-center justify-between border-b border-line px-6 py-4 md:px-8">
        <Link href={`/${slug}/cockpit`} className="mono text-[12px] text-ink-soft hover:text-ink">← AUJOURD&apos;HUI</Link>
        <span className="mono text-[11px] uppercase tracking-label text-ink-soft">SCANNER · APPEL<Cur /></span>
      </header>

      <div className="mx-auto max-w-2xl px-6 py-12 md:px-8">
        <p className="mono text-[11px] uppercase tracking-label text-ink-soft">PRÉSENCE — {nom}<Cur /></p>
        <h1 className="mt-4 text-3xl font-medium md:text-4xl">Faire l&apos;appel.</h1>

        {/* LE COURS D'ABORD : l'encadrant sait pour quel cours il pointe, avant de
            scanner. Sans cours choisi, ni scan ni recherche. */}
        <div className="mt-8">
          <label htmlFor="cours-controle" className="mono text-[11px] uppercase tracking-label text-ink-soft">
            COURS DE L&apos;APPEL<Cur />
          </label>
          <select
            id="cours-controle"
            value={coursId ?? ""}
            onChange={(e) => choisirCours(e.target.value)}
            className="mono mt-3 min-h-[44px] w-full border border-line bg-paper px-4 py-3 text-[13px] outline-none focus:border-ink"
          >
            <option value="">— Choisir le cours —</option>
            {cours.map((c) => (
              <option key={c.id} value={c.id}>{c.nom}</option>
            ))}
          </select>
          {coursNom ? (
            <p className="mono mt-2 text-[11px]" style={{ color: accent }}>
              ✓ Appel du cours&nbsp;: {coursNom}
            </p>
          ) : (
            <p className="mono mt-2 text-[11px] text-ink-faint">
              Choisissez le cours avant de scanner — la présence sera enregistrée pour ce cours.
            </p>
          )}
        </div>

        {/* Caméra */}
        <div className="mt-8">
          {/* Pleine largeur sur mobile : ce bouton se vise d'une main, debout à l'accueil. */}
          {!cam ? (
            <button
              onClick={() => { setCam(true); setCamOk(null); }}
              disabled={!coursId}
              className="mono min-h-[44px] w-full bg-ink px-5 py-3 text-[12px] text-paper hover:bg-ink/90 disabled:opacity-40 sm:w-auto"
            >
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
            <p className="mono mt-3 text-[11px] text-ink-faint">
              Caméra non disponible — autorisez l&apos;accès à la caméra dans les réglages, ou utilisez la recherche par nom.
            </p>
          ) : null}
        </div>

        {/* Recherche par nom */}
        <div className="mt-10">
          <p className="mono text-[11px] uppercase tracking-label text-ink-soft">OU RECHERCHER<Cur /></p>
          <input
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              setQ(v);
              // Réseau lent : une demande par pause de frappe (250 ms), pas une par
              // lettre, et seule la réponse de la DERNIÈRE frappe s'affiche.
              if (rechercheTimer.current) clearTimeout(rechercheTimer.current);
              const demande = ++rechercheRef.current;
              rechercheTimer.current = setTimeout(async () => {
                const r = await rechercher(slug, v);
                if (demande === rechercheRef.current) setList(r);
              }, 250);
            }}
            placeholder="Nom ou prénom"
            disabled={!coursId}
            className="mt-3 min-h-[44px] w-full border border-line bg-paper px-4 py-3 outline-none focus:border-ink disabled:opacity-40"
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

        {/* Vérification en cours — visible dès le premier instant : sur le réseau
            d'un gymnase, la réponse peut prendre plusieurs secondes, et un écran
            muet fait rescanner (donc repartir une demande de plus). */}
        {enCours ? (
          <div className="mt-10 border border-line bg-paper p-6" role="status">
            <p className="mono text-[13px] text-ink-soft">Vérification…</p>
          </div>
        ) : null}

        {/* Résultat */}
        {result ? (
          <div className="mt-10 border border-line bg-paper p-6" aria-live="polite">
            {!result.ok ? (
              result.sessionExpiree ? (
                <>
                  <div className="mono text-[16px] font-bold" style={{ color: "#8A6508" }}>⚠ Session expirée</div>
                  <p className="mt-2 text-[14px] text-ink-soft">Votre connexion a expiré pendant l&apos;appel.</p>
                  <Link href={`/connexion?next=/${slug}/cockpit/scanner`} className="mono mt-4 inline-block border border-ink px-5 py-3 text-[13px] hover:bg-ink hover:text-paper">
                    SE RECONNECTER →
                  </Link>
                </>
              ) : (
                <Panneau statut="introuvable" />
              )
            ) : (
              <>
                <div className="text-2xl font-medium">{result.prenom} {result.nom}</div>
                <div className="text-ink-soft">{result.cours ?? "—"}</div>
                {(result.autresCours?.length ?? 0) > 0 ? (
                  <div className="mono mt-1 text-[11px] text-ink-soft">
                    Aussi inscrit&nbsp;: {result.autresCours!.join(", ")}
                  </div>
                ) : null}

                <Panneau statut={result.statut} pieces={result.piecesManquantes} />

                <div className="mt-6">
                  {ligneControle(result.statut).pointable ? (
                    present ? (
                      // Double scan / double clic : déjà pointé, on le dit, on ne
                      // réécrit rien — la présence du jour est unique en base.
                      <span className="mono text-[13px]" style={{ color: accent }}>✓ DÉJÀ POINTÉ AUJOURD&apos;HUI — {coursNom}</span>
                    ) : (
                      <button
                        onClick={async () => {
                          if (!currentId || !coursId || pointage) return; // double clic ignoré
                          setPointage(true);
                          const r = await marquerPresent(slug, currentId, coursId);
                          if (r.ok) setPresent(true);
                          setPointage(false);
                        }}
                        disabled={pointage}
                        className="mono min-h-[44px] w-full px-6 py-3 text-[13px] disabled:opacity-40 sm:w-auto"
                        style={{ background: accent, color: "#FFFFFF" }}
                      >
                        {pointage ? "…" : `MARQUER PRÉSENT — ${coursNom ?? ""} →`}
                      </button>
                    )
                  ) : null}
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}

/**
 * Le panneau statut : texte explicite, symbole, couleur en complément — jamais
 * la couleur seule — et l'action suivante. Le vocabulaire vient de
 * `src/lib/controle.ts`, couvert par les tests.
 */
function Panneau({ statut, pieces }: { statut: string | undefined; pieces?: number }) {
  const l = ligneControle(statut);
  const couleur = COULEURS_CONTROLE[l.ton];
  return (
    <div className="mt-5 border px-5 py-4" style={{ borderColor: couleur, borderLeftWidth: 4 }}>
      <div className="mono text-[16px] font-bold" style={{ color: couleur }}>
        {l.symbole} {l.titre}
        {statut === "dossier_incomplet" && pieces ? ` — ${pieces} pièce${pieces > 1 ? "s" : ""} à fournir` : ""}
      </div>
      <p className="mt-1 text-[14px] text-ink-soft">{l.action}</p>
    </div>
  );
}
