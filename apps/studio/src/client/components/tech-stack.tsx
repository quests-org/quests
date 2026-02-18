import {
  TooltipContent,
  TooltipRoot,
  TooltipTrigger,
} from "@/client/components/ui/tooltip";
import {
  SiAngular,
  SiAstro,
  SiExpress,
  SiHono,
  SiNextdotjs,
  SiNuxtdotjs,
  SiReact,
  SiSolid,
  SiSvelte,
  SiTailwindcss,
  SiVite,
  SiVuedotjs,
} from "react-icons/si";

const TECH_LOGOS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  "@angular/core": SiAngular,
  "@sveltejs/kit": SiSvelte,
  astro: SiAstro,
  express: SiExpress,
  hono: SiHono,
  next: SiNextdotjs,
  nuxt: SiNuxtdotjs,
  react: SiReact,
  "solid-js": SiSolid,
  tailwindcss: SiTailwindcss,
  vite: SiVite,
  vue: SiVuedotjs,
};

const TECH_DISPLAY_NAMES: Record<string, string> = {
  "@angular/core": "Angular",
  "@sveltejs/kit": "SvelteKit",
  astro: "Astro",
  express: "Express",
  hono: "Hono",
  next: "Next.js",
  nuxt: "Nuxt",
  react: "React",
  "solid-js": "Solid",
  tailwindcss: "Tailwind CSS",
  vite: "Vite",
  vue: "Vue",
};

const EMPTY_DEPS: Record<string, string> = {};

const KEY_FRAMEWORKS = new Set([
  "@angular/core",
  "@sveltejs/kit",
  "astro",
  "express",
  "hono",
  "next",
  "nuxt",
  "react",
  "solid-js",
  "tailwindcss",
  "vite",
  "vue",
]);

export function TechStack({
  dependencies = EMPTY_DEPS,
  devDependencies = EMPTY_DEPS,
}: {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
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
    <div>
      <h3 className="mb-3 text-sm font-medium">Tech Stack</h3>

      <div className="flex flex-wrap gap-3">
        {keyFrameworks.map((packageName) => {
          const Logo = getTechLogo(packageName);
          if (!Logo) {
            return null;
          }

          return (
            <TooltipRoot key={packageName}>
              <TooltipTrigger asChild>
                <div>
                  <Logo className="size-6 text-foreground" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {TECH_DISPLAY_NAMES[packageName] || packageName}
              </TooltipContent>
            </TooltipRoot>
          );
        })}
      </div>
    </div>
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
