// Icône PWA générée à la volée : l'initiale du club sur sa couleur (DA Klubster, 0px).
import { ImageResponse } from "next/og";
import { getOrganisationBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { asso: string } }) {
  const org = await getOrganisationBySlug(params.asso);
  const { searchParams } = new URL(req.url);
  const brut = parseInt(searchParams.get("taille") ?? "512", 10);
  const taille = Math.min(Math.max(Number.isFinite(brut) ? brut : 512, 64), 1024);
  const maskable = searchParams.get("maskable") === "1";

  const couleur = org?.couleur_primaire ?? "#111111";
  const initiale = (org?.nom ?? "K").trim().charAt(0).toUpperCase() || "K";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: couleur,
          color: "#FFFFFF",
          // Zone de sécurité maskable : glyphe plus petit pour survivre au recadrage rond.
          fontSize: Math.round(taille * (maskable ? 0.4 : 0.52)),
          fontWeight: 700,
          fontFamily: "ui-monospace, monospace",
        }}
      >
        {initiale}
      </div>
    ),
    { width: taille, height: taille }
  );
}
