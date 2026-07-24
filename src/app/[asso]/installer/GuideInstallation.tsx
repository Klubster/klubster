"use client";

import { useEffect, useState } from "react";

type Plateforme = "ios" | "android" | "autre";

// Détecte l'appareil pour n'afficher que les étapes utiles : sur iPhone, le geste passe
// par « Partager » ; sur Android, par le menu du navigateur.
function detecter(): Plateforme {
  if (typeof navigator === "undefined") return "autre";
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "autre";
}

export default function GuideInstallation({ accent }: { accent: string }) {
  const [plateforme, setPlateforme] = useState<Plateforme>("autre");
  useEffect(() => {
    setPlateforme(detecter());
  }, []);

  const etapes =
    plateforme === "ios"
      ? [
          "Ouvrez cette page dans Safari.",
          "Touchez le bouton Partager (le carré avec une flèche vers le haut), en bas de l'écran.",
          "Faites défiler et touchez « Sur l'écran d'accueil ».",
          "Touchez « Ajouter » : l'icône du club apparaît sur votre écran d'accueil.",
        ]
      : plateforme === "android"
        ? [
            "Ouvrez cette page dans Chrome.",
            "Touchez le menu ⋮ en haut à droite.",
            "Touchez « Installer l'application » (ou « Ajouter à l'écran d'accueil »).",
            "Confirmez : l'icône du club apparaît sur votre écran d'accueil.",
          ]
        : [
            "Sur ordinateur, ouvrez cette page dans Chrome ou Edge.",
            "Cliquez sur l'icône d'installation dans la barre d'adresse (à droite).",
            "Confirmez l'installation.",
            "Pour l'usage au quotidien, l'app est surtout pensée pour votre téléphone.",
          ];

  const titre =
    plateforme === "ios" ? "Sur iPhone / iPad" : plateforme === "android" ? "Sur Android" : "Sur ordinateur";

  return (
    <div className="mt-10">
      <p className="mono text-[11px] uppercase tracking-label text-ink-soft">
        {titre}
        <span style={{ color: accent }}>_</span>
      </p>
      <ol className="mt-6 space-y-4">
        {etapes.map((e, i) => (
          <li key={i} className="flex gap-4">
            <span
              className="mono flex h-7 w-7 shrink-0 items-center justify-center text-[12px] text-white"
              style={{ background: accent }}
            >
              {i + 1}
            </span>
            <span className="pt-1 text-[15px] leading-relaxed">{e}</span>
          </li>
        ))}
      </ol>
      <p className="mono mt-8 text-[12px] leading-relaxed text-ink-soft">
        Une fois installée, l&apos;application s&apos;ouvre en un clic et se met à jour toute seule : vous
        n&apos;aurez jamais à la réinstaller.
      </p>
    </div>
  );
}
