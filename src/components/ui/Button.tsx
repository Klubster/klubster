import Link from "next/link";
import { cn } from "@/lib/cn";

// Réécrit au Lot S. La première version (text-sm, shadow-sm) contredisait la DA réelle :
// le produit n'a aucune ombre et ses boutons sont Space Mono 12-13px. Ce composant reprend
// le motif dominant mesuré sur 42 fichiers (docs/lot-s-inventaire-interface.md) — le brancher
// ne change donc pas l'apparence des écrans, il en supprime les divergences.
type Variant = "primary" | "secondary" | "ghost" | "danger";

const base =
  "mono inline-flex min-h-[44px] items-center justify-center gap-2 px-5 py-3 text-[12px] " +
  "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink-soft hover:bg-bg-alt hover:text-ink",
  // Destructif : bordure et texte danger au repos, le plein rouge n'apparaît qu'à
  // l'intention confirmée (survol). Jamais la couleur du club pour un geste destructif.
  danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
};

export function Button({
  variant = "primary",
  className,
  ...props
}: { variant?: Variant } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={cn(base, variants[variant], className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  className,
  href,
  children,
  style,
}: {
  variant?: Variant;
  className?: string;
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <Link href={href} className={cn(base, variants[variant], className)} style={style}>
      {children}
    </Link>
  );
}
