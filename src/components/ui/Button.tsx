import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost";
const base =
  "inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-medium transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 disabled:opacity-50 disabled:pointer-events-none";
const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90 shadow-sm",
  secondary: "border border-ink/15 text-ink hover:bg-bg-alt",
  ghost: "text-ink-soft hover:text-ink hover:bg-bg-alt",
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
