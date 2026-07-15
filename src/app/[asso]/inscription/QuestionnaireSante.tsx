"use client";

import { useEffect, useRef, useState } from "react";
import {
  QS_MINEUR_SECTIONS,
  estMineur,
  questionsPour,
  resultatDe,
  texteAttestation,
  type QSType,
} from "@/lib/sante";
import { useNaissance } from "./naissance";

export default function QuestionnaireSante({ accent }: { accent: string }) {
  // La date de naissance est saisie dans le bloc IDENTITÉ (contexte partagé).
  const { naissance } = useNaissance();
  const [reponses, setReponses] = useState<Record<number, "oui" | "non">>({});
  const [signataire, setSignataire] = useState("");
  const [signature, setSignature] = useState("");
  const [atteste, setAtteste] = useState(false);

  const type: QSType = naissance && estMineur(naissance) ? "mineur" : "adulte";
  const questions = questionsPour(type);

  // Réinitialise les réponses quand on bascule adulte/mineur (les listes diffèrent).
  useEffect(() => {
    setReponses({});
  }, [type]);

  const reponsesTexte: Record<string, "oui" | "non"> = {};
  questions.forEach((q, i) => {
    if (reponses[i]) reponsesTexte[q] = reponses[i];
  });
  const resultat = resultatDe(reponsesTexte);
  const qualite = type === "mineur" ? "representant_legal" : "adherent";
  // L'attestation et la signature n'apparaissent qu'une fois TOUTES les questions répondues.
  const nbRepondues = Object.keys(reponses).length;
  const toutRepondu = questions.length > 0 && nbRepondues === questions.length;

  return (
    <fieldset>
      <legend className="mono text-[11px] uppercase tracking-label text-ink-soft">
        QUESTIONNAIRE DE SANTÉ<span style={{ color: accent }}>_</span>
      </legend>

      <p className="mono mt-3 text-[11px] leading-relaxed text-ink-faint">
        Le certificat médical est remplacé par ce questionnaire auto-déclaré. Si toutes les réponses
        sont « non », aucun certificat n&apos;est demandé. Au moins un « oui » et un certificat médical
        sera à fournir.
      </p>

      {/* La date de naissance est saisie dans le bloc IDENTITÉ, en haut du formulaire. */}
      {!naissance ? (
        <p className="mono mt-4 border border-line bg-paper px-5 py-4 text-[11px] text-ink-faint">
          Renseignez la date de naissance (bloc Identité, en haut) pour afficher le questionnaire adapté.
        </p>
      ) : (
        <p className="mono mt-4 text-[11px] text-ink-faint">
          {type === "mineur"
            ? "Adhérent mineur — à remplir par le représentant légal."
            : "Adhérent majeur — questionnaire QS-SPORT."}
        </p>
      )}

      {/* RESPONSABLE LÉGAL — affiché automatiquement quand l'adhérent est mineur */}
      {naissance && type === "mineur" ? (
        <div className="mt-4 border border-line bg-paper px-5 py-4">
          <p className="mono text-[10px] uppercase tracking-label text-ink-soft">
            RESPONSABLE LÉGAL<span style={{ color: accent }}>_</span>
          </p>
          <p className="mono mt-2 text-[11px] text-ink-faint">
            L&apos;adhérent est mineur : merci de renseigner l&apos;identité d&apos;un parent ou représentant légal.
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">PRÉNOM *</label>
              <input name="resp_prenom" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">NOM *</label>
              <input name="resp_nom" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">EMAIL *</label>
              <input name="resp_email" type="email" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </div>
            <div>
              <label className="mono text-[10px] uppercase tracking-label text-ink-soft">TÉLÉPHONE *</label>
              <input name="resp_tel" type="tel" required className="mt-1.5 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink" />
            </div>
          </div>
        </div>
      ) : null}

      {/* QUESTIONS */}
      {naissance ? (
        <div className="mt-4 border border-line bg-paper">
          {type === "mineur"
            ? QS_MINEUR_SECTIONS.map((sec, si) => {
                const fin = QS_MINEUR_SECTIONS[si + 1]?.debut ?? questions.length;
                return (
                  <div key={sec.titre}>
                    <div className="mono border-b border-line bg-line/40 px-5 py-2 text-[10px] uppercase tracking-label text-ink-soft">
                      {sec.titre}
                    </div>
                    {questions.slice(sec.debut, fin).map((q, k) => (
                      <Ligne
                        key={sec.debut + k}
                        index={sec.debut + k}
                        question={q}
                        valeur={reponses[sec.debut + k]}
                        onChange={(v) => setReponses((r) => ({ ...r, [sec.debut + k]: v }))}
                        accent={accent}
                      />
                    ))}
                  </div>
                );
              })
            : questions.map((q, i) => (
                <Ligne
                  key={i}
                  index={i}
                  question={q}
                  valeur={reponses[i]}
                  onChange={(v) => setReponses((r) => ({ ...r, [i]: v }))}
                  accent={accent}
                />
              ))}
        </div>
      ) : null}

      {/* PROGRESSION — tant que tout n'est pas répondu, pas d'attestation ni de signature */}
      {naissance && !toutRepondu ? (
        <p className="mono mt-4 text-[11px] uppercase tracking-label text-ink-soft">
          {nbRepondues}/{questions.length} réponses — répondez à toutes les questions pour signer
          <span style={{ color: accent }}>_</span>
        </p>
      ) : null}

      {/* RÉSULTAT */}
      {naissance && toutRepondu ? (
        <div className="mt-4 border border-line px-5 py-4" style={{ borderLeftWidth: 3, borderLeftColor: accent }}>
          <p className="text-[14px] leading-relaxed">{texteAttestation(type, resultat)}</p>
          {resultat === "certificat_requis" ? (
            <p className="mono mt-2 text-[11px] text-ink-soft">
              Une pièce « Certificat médical » sera ajoutée à votre dossier, à déposer dans l&apos;espace adhérent.
            </p>
          ) : null}
        </div>
      ) : null}

      {/* SIGNATURE */}
      {naissance && toutRepondu ? (
        <div className="mt-4 border border-line bg-paper px-5 py-4">
          <label className="mono text-[10px] uppercase tracking-label text-ink-soft">
            {type === "mineur" ? "NOM DU REPRÉSENTANT LÉGAL *" : "NOM ET PRÉNOM *"}
          </label>
          <input
            value={signataire}
            onChange={(e) => setSignataire(e.target.value)}
            className="mt-2 w-full border border-line bg-paper px-3 py-2.5 outline-none focus:border-ink"
          />

          <label className="mono mt-5 block text-[10px] uppercase tracking-label text-ink-soft">
            SIGNATURE (AU DOIGT SUR MOBILE) *
          </label>
          <Pad value={signature} onChange={setSignature} accent={accent} />

          <label className="mt-4 flex cursor-pointer items-start gap-3 text-[13px]">
            <input
              type="checkbox"
              checked={atteste}
              onChange={(e) => setAtteste(e.target.checked)}
              className="mt-1"
            />
            <span>
              J&apos;atteste sur l&apos;honneur l&apos;exactitude des réponses ci-dessus
              {type === "mineur" ? ", en qualité de représentant légal de l'adhérent mineur." : "."}
            </span>
          </label>
        </div>
      ) : null}

      {/* CHAMPS TRANSMIS AU SERVEUR */}
      <input type="hidden" name="qsante_type" value={type} />
      <input type="hidden" name="qsante_resultat" value={resultat} />
      <input type="hidden" name="qsante_qualite" value={qualite} />
      <input type="hidden" name="qsante_signataire" value={signataire} />
      <input type="hidden" name="qsante_signature" value={signature} />
      {/* RGPD — minimisation : le détail des réponses santé n'est jamais transmis ni stocké,
          seul le résultat (atteste_negatif / certificat_requis) l'est. */}
      {/* Verrou de validation : coché uniquement si tout est rempli */}
      <input
        type="checkbox"
        name="qsante_ok"
        checked={
          !!naissance &&
          Object.keys(reponses).length === questions.length &&
          signataire.trim().length > 1 &&
          signature.length > 0 &&
          atteste
        }
        required
        readOnly
        aria-hidden="true"
        tabIndex={-1}
        className="pointer-events-none absolute h-0 w-0 opacity-0"
      />
    </fieldset>
  );
}

function Ligne({
  index,
  question,
  valeur,
  onChange,
  accent,
}: {
  index: number;
  question: string;
  valeur?: "oui" | "non";
  onChange: (v: "oui" | "non") => void;
  accent: string;
}) {
  return (
    <div className="flex items-start gap-4 border-b border-line px-5 py-3 last:border-b-0">
      <span className="mono mt-0.5 text-[11px] text-ink-faint">{String(index + 1).padStart(2, "0")}</span>
      <span className="flex-1 text-[14px] leading-snug">{question}</span>
      <div className="flex shrink-0 gap-2">
        {(["non", "oui"] as const).map((v) => {
          const on = valeur === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => onChange(v)}
              className="mono border px-3 py-1.5 text-[11px] uppercase"
              style={
                on
                  ? { background: accent, color: "#fff", borderColor: accent }
                  : { borderColor: "var(--line, #e5e5e5)", color: "#666" }
              }
            >
              {v}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pad({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.scale(dpr, dpr);
      ctx.lineWidth = 2.2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#111111";
    }
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = ref.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    last.current = pos(e);
    ref.current?.setPointerCapture(e.pointerId);
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = ref.current?.getContext("2d");
    const p = pos(e);
    if (ctx && last.current) {
      ctx.beginPath();
      ctx.moveTo(last.current.x, last.current.y);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
    last.current = p;
  }
  function end() {
    if (!drawing.current) return;
    drawing.current = false;
    last.current = null;
    if (ref.current) onChange(ref.current.toDataURL("image/png"));
  }
  function effacer() {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange("");
  }

  return (
    <div className="mt-2">
      <canvas
        ref={ref}
        onPointerDown={start}
        onPointerMove={move}
        onPointerUp={end}
        onPointerLeave={end}
        className="h-40 w-full touch-none border border-line bg-white"
        style={{ touchAction: "none" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span className="mono text-[11px]" style={{ color: value ? accent : "#999" }}>
          {value ? "✓ signé" : "signez dans le cadre ci-dessus"}
        </span>
        <button type="button" onClick={effacer} className="mono text-[11px] text-ink-soft hover:text-ink">
          effacer
        </button>
      </div>
    </div>
  );
}
