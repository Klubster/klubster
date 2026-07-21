import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://klubster.fr";
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://basnfuvdjobanejahayt.supabase.co";
const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "sb_publishable_9mCWkp80McBNZeRTdFx7sw_Kb3NJhKR";

export const revalidate = 3600;

async function slugsPublies(): Promise<string[]> {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/organisations?select=slug&publie=eq.true`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];
    const rows = (await res.json()) as { slug: string }[];
    return rows.map((r) => r.slug);
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const maintenant = new Date();

  const pages: MetadataRoute.Sitemap = [
    { url: SITE, lastModified: maintenant, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/fonctionnalites`, lastModified: maintenant, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/tarifs`, lastModified: maintenant, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/combat`, lastModified: maintenant, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/mentions-legales`, lastModified: maintenant, priority: 0.2 },
    { url: `${SITE}/cgu`, lastModified: maintenant, priority: 0.2 },
    { url: `${SITE}/cgv`, lastModified: maintenant, priority: 0.2 },
    { url: `${SITE}/confidentialite`, lastModified: maintenant, priority: 0.2 },
    { url: `${SITE}/sous-traitance`, lastModified: maintenant, priority: 0.2 },
  ];

  // Les vitrines des associations publiées.
  const clubs = await slugsPublies();
  for (const slug of clubs) {
    pages.push({ url: `${SITE}/${slug}`, lastModified: maintenant, changeFrequency: "weekly", priority: 0.7 });
  }

  return pages;
}
