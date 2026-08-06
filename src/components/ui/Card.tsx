import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        // Lot S : plus d'ombre — la DA réelle du produit n'en a aucune (0 shadow-* mesuré
        // dans src/app). La carte est une ligne nette sur papier, rien d'autre.
        "border border-line bg-surface",
        className
      )}
    >
      {children}
    </div>
  );
}
