import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Domaines « plateforme » : servis tels quels. Tout autre host = domaine propre d'un club.
const HOTES_PLATEFORME = new Set(["klubster.fr", "www.klubster.fr", "localhost:3000", "localhost"]);

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9mCWkp80McBNZeRTdFx7sw_Kb3NJhKR";

// Cache host → slug par instance (évite une requête à chaque hit).
const cacheSlugs = new Map<string, { slug: string | null; expire: number }>();

async function slugPourDomaine(host: string): Promise<string | null> {
  const present = cacheSlugs.get(host);
  if (present && present.expire > Date.now()) return present.slug;

  let slug: string | null = null;
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/organisations?select=slug&domaine_custom=eq.${encodeURIComponent(host)}&publie=eq.true&limit=1`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (res.ok) {
      const rows = (await res.json()) as { slug: string }[];
      slug = rows[0]?.slug ?? null;
    }
  } catch {
    slug = null; // pépin réseau : on sert la plateforme normalement
  }
  // Le cache est indexé par Host, qui est fourni par le client : sans borne, un flot de
  // Host distincts ferait croître la Map indéfiniment. On purge, puis on plafonne.
  if (cacheSlugs.size > 500) {
    const maintenant = Date.now();
    for (const [k, v] of cacheSlugs) if (v.expire < maintenant) cacheSlugs.delete(k);
    if (cacheSlugs.size > 500) cacheSlugs.clear();
  }
  cacheSlugs.set(host, { slug, expire: Date.now() + 60_000 });
  return slug;
}

export async function middleware(request: NextRequest) {
  const brutHost = (request.headers.get("host") ?? "").toLowerCase();
  const host = brutHost.replace(/^www\./, "");
  const { pathname } = request.nextUrl;

  const estPlateforme =
    HOTES_PLATEFORME.has(brutHost) || HOTES_PLATEFORME.has(host) || brutHost.endsWith(".vercel.app");

  if (!estPlateforme) {
    const slug = await slugPourDomaine(host);
    if (slug) {
      // Les liens internes contiennent /slug/… : redirection vers l'URL propre (sans slug),
      // puis réécriture interne vers la route multi-tenant.
      if (pathname === `/${slug}` || pathname.startsWith(`/${slug}/`)) {
        const url = request.nextUrl.clone();
        url.pathname = pathname.slice(slug.length + 1) || "/";
        return NextResponse.redirect(url, 308);
      }
      const reponse = await updateSession(request); // session Supabase sur le domaine du club
      const url = request.nextUrl.clone();
      url.pathname = `/${slug}${pathname === "/" ? "" : pathname}`;
      const rewrite = NextResponse.rewrite(url, { request });
      // Reporter les cookies de session rafraîchis sur la réponse réécrite.
      reponse.cookies.getAll().forEach((c) => rewrite.cookies.set(c));
      return rewrite;
    }
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
