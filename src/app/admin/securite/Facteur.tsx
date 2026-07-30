"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "qrcode";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Enrôlement et vérification du second facteur, côté navigateur.
 *
 * Ces appels DOIVENT être client : `mfa.enroll` renvoie le secret une seule fois, et
 * `mfa.verify` élève le niveau de la session en place — donc dans le navigateur qui la
 * porte. Le serveur, lui, ne fait que constater le niveau atteint (`src/lib/mfa.ts`).
 *
 * Le champ de saisie porte `autoComplete="one-time-code"` et `inputMode="numeric"` :
 * c'est ce qui déclenche la proposition de remplissage du trousseau iCloud, laquelle
 * demande Face ID ou Touch ID. Ne pas retirer ces attributs — c'est là que vit la
 * biométrie de ce dispositif.
 */

type Mode = "enroler" | "verifier";

export default function Facteur({ mode, suite }: { mode: Mode; suite: string }) {
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const demarre = useRef(false);

  // Enrôlement : on demande un facteur, on affiche son QR code, on attend la
  // confirmation par un premier code. Tant que ce code n'est pas fourni, le facteur
  // reste `unverified` et n'exige rien.
  useEffect(() => {
    if (mode !== "enroler" || demarre.current) return;
    demarre.current = true;
    (async () => {
      // Un enrôlement interrompu laisse un facteur non vérifié qui bloquerait le
      // suivant (« factor already exists ») : on nettoie avant de recommencer.
      const { data: liste } = await supabase.auth.mfa.listFactors();
      for (const f of liste?.totp ?? []) {
        if (f.status !== "verified") await supabase.auth.mfa.unenroll({ factorId: f.id });
      }

      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Console Klubster — ${new Date().toLocaleDateString("fr-FR")}`,
      });
      if (error || !data) {
        setErreur(error?.message ?? "L’enrôlement a échoué.");
        return;
      }
      setFactorId(data.id);
      setSecret(data.totp.secret);
      try {
        setQr(await QRCode.toDataURL(data.totp.uri, { margin: 1, width: 220 }));
      } catch {
        // Sans QR, le secret reste saisissable à la main : on n'échoue pas pour si peu.
        setQr(null);
      }
    })();
  }, [mode, supabase]);

  async function valider(e: React.FormEvent) {
    e.preventDefault();
    if (occupe) return;
    setErreur(null);
    setOccupe(true);

    try {
      // En vérification, le facteur à présenter est celui déjà enrôlé : on le relit
      // plutôt que de le porter dans l'URL.
      let id = factorId;
      if (!id) {
        const { data } = await supabase.auth.mfa.listFactors();
        id = (data?.totp ?? []).find((f) => f.status === "verified")?.id ?? null;
      }
      if (!id) {
        setErreur("Aucun facteur à vérifier.");
        return;
      }

      const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: id, code: code.trim() });
      if (error) {
        // Message volontairement identique quel que soit le motif : ne pas indiquer si
        // le code était mal formé, expiré ou simplement faux.
        setErreur("Code refusé. Vérifiez l’heure de votre appareil et réessayez.");
        setCode("");
        return;
      }

      // La session vient de passer en aal2 ; le serveur doit relire son niveau.
      router.replace(suite);
      router.refresh();
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="mt-8">
      {mode === "enroler" && (
        <>
          <p className="max-w-prose text-[15px] leading-relaxed text-ink-soft">
            Scannez ce code avec l’app <strong className="text-ink">Mots de passe</strong> d’Apple
            (ou l’appareil photo, qui la proposera). Le code à six chiffres se synchronisera
            alors entre votre iPhone, votre iPad et votre Mac, et son remplissage automatique
            demandera Face&nbsp;ID ou Touch&nbsp;ID.
          </p>

          <div className="mt-6 flex flex-wrap items-start gap-8">
            {qr ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={qr} alt="Code à scanner pour enrôler le second facteur" width={220} height={220} className="border border-line bg-white p-2" />
            ) : (
              <p className="mono text-[12px] text-ink-soft">Code visuel indisponible — saisissez la clé ci-contre.</p>
            )}

            {secret && (
              <div>
                <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
                  OU SAISIE MANUELLE<span className="cur">_</span>
                </p>
                <p className="mono mt-3 max-w-[22ch] break-all border border-line px-4 py-3 text-[13px] leading-relaxed">
                  {secret}
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {mode === "verifier" && (
        <p className="max-w-prose text-[15px] leading-relaxed text-ink-soft">
          Saisissez le code à six chiffres. Sur un appareil Apple, le trousseau vous le
          proposera après Face&nbsp;ID ou Touch&nbsp;ID.
        </p>
      )}

      <form onSubmit={valider} className="mt-7 flex flex-wrap items-center gap-4">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
          aria-label="Code à six chiffres"
          className="mono w-40 border border-line bg-paper px-4 py-3 text-[18px] tracking-[0.3em] outline-none focus:border-ink"
          placeholder="000000"
        />
        <button
          type="submit"
          disabled={occupe || code.length !== 6}
          className="mono bg-ink px-6 py-3 text-[12px] uppercase tracking-wide text-paper disabled:opacity-40"
        >
          {occupe ? "VÉRIFICATION…" : mode === "enroler" ? "ACTIVER →" : "VALIDER →"}
        </button>
      </form>

      {erreur && (
        <p className="mono mt-4 text-[12px]" style={{ color: "#B23B3B" }} role="alert">
          {erreur}
        </p>
      )}
    </div>
  );
}
