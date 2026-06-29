import { cn } from "@/lib/cn";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-5 md:px-8", className)}>{children}</div>;
}

export function Section({
  id,
  className,
  alt = false,
  children,
}: {
  id?: string;
  className?: string;
  alt?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={cn("py-16 md:py-24", alt && "bg-bg-alt", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SurtitreMono({ children }: { children: React.ReactNode }) {
  return <p className="font-mono text-xs uppercase tracking-[0.18em] text-ink-soft">{children}</p>;
}
