import type { Organisation } from "@/types/db";
import { themeStyle } from "@/lib/themes";
import { classesPolicesVitrines } from "@/lib/polices-vitrines";

// Applique le template de design du club (polices + mode blanc/noir) à son site public.
// Surcharge les tokens CSS (--k-*, --font-*) sur un conteneur : le reste de l'app garde la DA Klubster.
// Les polices des templates sont auto-hébergées par next/font (classesPolicesVitrines) :
// plus de <link> vers fonts.googleapis.com depuis le navigateur du visiteur.
export function ThemeVitrine({ org, children }: { org: Organisation; children: React.ReactNode }) {
  return (
    <div
      className={`min-h-screen bg-paper font-sans text-ink ${classesPolicesVitrines}`}
      style={themeStyle(org.theme_template, org.theme_mode)}
    >
      {children}
    </div>
  );
}
