import type { Metadata } from "next";
import { classesPolicesVitrines } from "@/lib/polices-vitrines";

// Le layout racine ne pose plus de canonique globale (chaque page déclare la sienne).
export const metadata: Metadata = {
  alternates: { canonical: "/creer" },
};

// Les aperçus de templates de l'étape 01 du wizard ont besoin des polices des 6
// directions typographiques. Auto-hébergées par next/font (téléchargées au build,
// servies depuis notre domaine) : plus de <link> vers fonts.googleapis.com.
export default function CreerLayout({ children }: { children: React.ReactNode }) {
  return <div className={classesPolicesVitrines}>{children}</div>;
}
