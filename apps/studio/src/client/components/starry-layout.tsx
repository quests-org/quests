import Particles from "@/client/components/particles";

export function StarryLayout({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-svh flex-col bg-background overflow-y-auto">
      <div className="relative z-10 w-full flex flex-1 justify-center items-center py-8">
        {children}
      </div>
      {footer && (
        <div className="relative z-10 pb-6 text-balance text-center text-xs text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
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
