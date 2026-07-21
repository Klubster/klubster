import { cn } from "@/lib/cn";

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "border border-line bg-surface shadow-sm transition-shadow hover:shadow-md",
        className
      )}
    >
      {children}
    </div>
  );
}
