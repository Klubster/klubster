// Miniature de partage d'un site de club : ce qui s'affiche quand le lien est envoyé
// sur WhatsApp, en SMS, sur Messenger ou collé dans un mail. Sans elle, le lien arrive
// nu — un club qui partage son adresse à ses adhérents n'avait aucune vignette.
//
// Générée à la volée pour chaque club, à partir de ce qu'il a déjà renseigné : son logo
// (ou son initiale), son nom, sa couleur. Aucun club n'a rien à faire.
import { ImageResponse } from "next/og";
import { getOrganisationBySlug } from "@/lib/queries";

export const runtime = "nodejs";
export const alt = "Site du club — inscriptions en ligne";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Le logo est converti en data URL avant le rendu. Le passer en URL distante ferait
 * dépendre la génération d'un fetch fait par le moteur d'image : s'il échoue, c'est la
 * miniature entière qui tombe. Ici, un logo indisponible fait simplement retomber sur
 * l'initiale, et le partage reste correct.
 */
async function logoEnDataUrl(url: string | null): Promise<string | null> {
  if (!url || !/^https:\/\//i.test(url)) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    // Au-delà de 1,5 Mo, l'encodage coûte plus qu'il ne rapporte : l'initiale fera l'affaire.
    if (buf.byteLength > 1_500_000) return null;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export default async function Image({ params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  const couleur = org?.couleur_primaire ?? "#279B65";
  const nom = org?.nom ?? "Klubster";
  const initiale = nom.trim().charAt(0).toUpperCase() || "K";
  const accroche = org?.accroche ?? org?.sport ?? null;
  const logo = await logoEnDataUrl(org?.logo_url ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0B0B0B",
          color: "#FFFFFF",
          padding: "72px 80px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        {/* Filet de couleur du club, en haut : la marque du club avant celle de Klubster. */}
        <div style={{ display: "flex", position: "absolute", top: 0, left: 0, right: 0, height: 12, background: couleur }} />

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" width={132} height={132} style={{ objectFit: "contain" }} />
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 132,
                height: 132,
                background: couleur,
                color: "#FFFFFF",
                fontSize: 74,
                fontWeight: 700,
                fontFamily: "ui-monospace, monospace",
              }}
            >
              {initiale}
            </div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: nom.length > 26 ? 62 : 78,
              fontWeight: 600,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
            }}
          >
            {nom}
          </div>
          {accroche ? (
            <div
              style={{
                display: "flex",
                marginTop: 22,
                fontSize: 32,
                lineHeight: 1.3,
                color: "#B9B9B4",
                maxWidth: 900,
              }}
            >
              {accroche.length > 110 ? `${accroche.slice(0, 107)}…` : accroche}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: couleur,
              color: "#FFFFFF",
              padding: "16px 28px",
              fontSize: 26,
              letterSpacing: "0.06em",
              fontFamily: "ui-monospace, monospace",
            }}
          >
            INSCRIPTIONS EN LIGNE
          </div>
          <div style={{ display: "flex", fontSize: 24, color: "#6F6F6B", fontFamily: "ui-monospace, monospace" }}>
            klubster.fr/{org?.slug ?? ""}
          </div>
        </div>
      </div>
    ),
    size
  );
}
