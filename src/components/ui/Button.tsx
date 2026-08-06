import Link from "next/link";
import { cn } from "@/lib/cn";

// Réécrit au Lot S, étendu en S6. La sémantique HTML est sacrée : `Button` rend un
// <button>, `ButtonLink` rend un <Link> — jamais l'un déguisé en l'autre. Pour les cas
// qui doivent rester un autre élément (BoutonAttente, <a> externe, <summary>…),
// `classesBouton()` fournit exactement le même habit sans imposer l'élément.
export type VarianteBouton = "primary" | "secondary" | "ghost" | "danger";

const base =
  "mono inline-flex items-center justify-center gap-2 text-[12px] " +
  "transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/40 " +
  "disabled:pointer-events-none disabled:opacity-40";

const variants: Record<VarianteBouton, string> = {
  primary: "bg-ink text-paper hover:bg-ink/90",
  secondary: "border border-ink text-ink hover:bg-ink hover:text-paper",
  ghost: "text-ink-soft hover:bg-bg-alt hover:text-ink",
  // Destructif : bordure et texte danger au repos, le plein rouge n'apparaît qu'à
  // l'intention confirmée (survol). Jamais la couleur du club pour un geste destructif.
  danger: "border border-danger text-danger hover:bg-danger hover:text-paper",
};

/**
 * Les classes du bouton Klubster, sans l'élément. `compact` retire la garantie 44px :
 * réservé aux contrôles secondaires d'écrans denses (jamais aux pages « terrain »).
 */
export function classesBouton(
  variant: VarianteBouton = "primary",
  opts?: { compact?: boolean; className?: string }
) {
  return cn(
    base,
    opts?.compact ? "px-4 py-2.5" : "min-h-[44px] px-5 py-3",
    variants[variant],
    opts?.className
  );
}

export function Button({
  variant = "primary",
  compact,
  className,
  ...props
}: { variant?: VarianteBouton; compact?: boolean } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={classesBouton(variant, { compact, className })} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  compact,
  className,
  href,
  children,
  style,
  ...props
}: {
  variant?: VarianteBouton;
  compact?: boolean;
  className?: string;
  href: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
} & Omit<React.ComponentProps<typeof Link>, "href" | "className" | "style" | "children">) {
  return (
    <Link href={href} className={classesBouton(variant, { compact, className })} style={style} {...props}>
      {children}
    </Link>
  );
}
