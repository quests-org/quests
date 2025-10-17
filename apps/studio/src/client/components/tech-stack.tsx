import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  SiHono,
  SiNextdotjs,
  SiNuxtdotjs,
  SiReact,
  SiSvelte,
  SiTailwindcss,
  SiVite,
  SiVuedotjs,
} from "react-icons/si";

const TECH_LOGOS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "@sveltejs/kit": SiSvelte,
  hono: SiHono,
  next: SiNextdotjs,
  nuxt: SiNuxtdotjs,
  react: SiReact,
  tailwindcss: SiTailwindcss,
  vite: SiVite,
  vue: SiVuedotjs,
};

const TECH_DISPLAY_NAMES: Record<string, string> = {
  "@sveltejs/kit": "SvelteKit",
  hono: "Hono",
  next: "Next.js",
  nuxt: "Nuxt",
  react: "React",
  tailwindcss: "Tailwind CSS",
  vite: "Vite",
  vue: "Vue",
};

const KEY_FRAMEWORKS = new Set([
  "@sveltejs/kit",
  "hono",
  "next",
  "nuxt",
  "react",
  "tailwindcss",
  "vite",
  "vue",
]);

export function TechStack({
  dependencies = {},
  devDependencies = {},
}: {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}) {
  const allDeps = {
    ...dependencies,
    ...devDependencies,
  };

  const sortedDeps = Object.keys(allDeps).sort();

  const seenLogos = new Set<React.ComponentType<{ className?: string }>>();
  const keyFrameworks = sortedDeps.filter((dep) => {
    if (!isKeyFramework(dep)) {
      return false;
    }
    const Logo = getTechLogo(dep);
    if (!Logo || seenLogos.has(Logo)) {
      return false;
    }
    seenLogos.add(Logo);
    return true;
  });

  if (sortedDeps.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <div>
        <h3 className="text-sm font-medium mb-3">Tech Stack</h3>

        <div className="flex flex-wrap gap-3">
          {keyFrameworks.map((packageName) => {
            const Logo = getTechLogo(packageName);
            if (!Logo) {
              return null;
            }

            return (
              <Tooltip key={packageName}>
                <TooltipTrigger asChild>
                  <div>
                    <Logo className="size-6 text-foreground" />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {TECH_DISPLAY_NAMES[packageName] || packageName}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}

function getTechLogo(packageName: string) {
  const lowerName = packageName.toLowerCase();
  return TECH_LOGOS[lowerName];
}

function isKeyFramework(packageName: string) {
  const lowerName = packageName.toLowerCase();
  return KEY_FRAMEWORKS.has(lowerName);
}
