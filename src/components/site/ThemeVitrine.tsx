import type { Organisation } from "@/types/db";
import { themeStyle, fontsHref } from "@/lib/themes";

// Applique le template de design du club (polices + mode blanc/noir) à son site public.
// Surcharge les tokens CSS (--k-*, --font-*) sur un conteneur : le reste de l'app garde la DA Klubster.
export function ThemeVitrine({ org, children }: { org: Organisation; children: React.ReactNode }) {
  return (
    <>
      <link rel="stylesheet" href={fontsHref(org.theme_template)} />
      <div
        className="min-h-screen bg-paper font-sans text-ink"
        style={themeStyle(org.theme_template, org.theme_mode)}
      >
        {children}
      </div>
    </>
  );
}
