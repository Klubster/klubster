// Icône PWA générée à la volée.
//
// Quand le club a un logo, on l'utilise : c'est SON logo qui apparaît sur l'écran
// d'accueil et dans les miniatures. À défaut, on retombe sur l'initiale du club sur sa
// couleur (DA Klubster). Le logo est rapatrié en data URL — Satori (next/og) ne fetch pas
// toujours une image distante de façon fiable — avec un délai borné et un repli en cas
// d'échec, pour ne jamais servir une icône cassée.
import { ImageResponse } from "next/og";
import { getOrganisationPubliqueBySlug } from "@/lib/queries";

export const dynamic = "force-dynamic";

async function logoEnDataUrl(url: string): Promise<string | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 2500);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "image/png";
    if (!type.startsWith("image/")) return null;
    const buf = await res.arrayBuffer();
    // Garde-fou : au-delà de ~2 Mo, on renonce plutôt que d'alourdir chaque rendu.
    if (buf.byteLength > 2 * 1024 * 1024) return null;
    const base64 = Buffer.from(buf).toString("base64");
    return `data:${type};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request, props: { params: Promise<{ asso: string }> }) {
  const params = await props.params;
  const org = await getOrganisationPubliqueBySlug(params.asso);
  const { searchParams } = new URL(req.url);
  const brut = parseInt(searchParams.get("taille") ?? "512", 10);
  const taille = Math.min(Math.max(Number.isFinite(brut) ? brut : 512, 64), 1024);
  const maskable = searchParams.get("maskable") === "1";

  const couleur = org?.couleur_primaire ?? "#111111";
  const initiale = (org?.nom ?? "K").trim().charAt(0).toUpperCase() || "K";

  const logo = org?.logo_url ? await logoEnDataUrl(org.logo_url) : null;

  // Marge de sécurité : plus grande pour les icônes maskable (recadrage rond).
  const margePct = maskable ? 0.2 : 0.12;
  const marge = Math.round(taille * margePct);

  // Avec un logo, fond BLANC : la plupart des logos (dont celui de l'USM, vert détouré)
  // sont dessinés pour le blanc et disparaîtraient sur la couleur du club. Sans logo,
  // l'initiale blanche se détache sur la couleur du club.
  const fond = logo ? "#FFFFFF" : couleur;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: fond,
          color: "#FFFFFF",
        }}
      >
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logo}
            alt=""
            width={taille - marge * 2}
            height={taille - marge * 2}
            style={{ objectFit: "contain" }}
          />
        ) : (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: Math.round(taille * (maskable ? 0.4 : 0.52)),
              fontWeight: 700,
              fontFamily: "ui-monospace, monospace",
            }}
          >
            {initiale}
          </div>
        )}
      </div>
    ),
    { width: taille, height: taille }
  );
}
