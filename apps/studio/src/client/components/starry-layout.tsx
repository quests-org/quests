import Particles from "@/client/components/particles";

export function StarryLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col overflow-y-auto bg-background">
      <div className="relative z-10 flex w-full flex-1 items-center justify-center py-8">
        {children}
      </div>
      {footer && (
        <div className="relative z-10 pb-6 text-center text-xs text-balance text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
          {footer}
        </div>
      )}
      <Particles
        color="#155ADE"
        color2="#F7FF9B"
        disableMouseMovement
        ease={80}
        quantityDesktop={350}
        quantityMobile={100}
        refresh
      />
    </div>
  );
}
