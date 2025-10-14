import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import {
  SiHono,
  SiNextdotjs,
  SiReact,
  SiTailwindcss,
  SiVite,
} from "react-icons/si";

const TECH_LOGOS: Record<
  string,
  React.ComponentType<{ className?: string }>
> = {
  hono: SiHono,
  next: SiNextdotjs,
  react: SiReact,
  tailwindcss: SiTailwindcss,
  vite: SiVite,
};

const KEY_FRAMEWORKS = new Set([
  "hono",
  "next",
  "react",
  "tailwindcss",
  "vite",
]);

export function TechStack({
  dependencies = {},
  devDependencies = {},
}: {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
}) {
  const [showAll, setShowAll] = useState(false);

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

  const otherDeps = sortedDeps.filter((dep) => !isKeyFramework(dep));

  if (sortedDeps.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-3">Tech Stack</h3>

      <div className="flex flex-wrap gap-3 mb-3">
        {keyFrameworks.map((packageName) => {
          const Logo = getTechLogo(packageName);
          if (!Logo) {
            return null;
          }

          return (
            <div
              key={packageName}
              title={`${packageName}@${allDeps[packageName] || "latest"}`}
            >
              <Logo className="size-6 text-foreground" />
            </div>
          );
        })}
      </div>

      {otherDeps.length > 0 && (
        <>
          <button
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors mb-2"
            onClick={() => {
              setShowAll(!showAll);
            }}
            type="button"
          >
            {showAll ? (
              <>
                <ChevronUp className="h-3 w-3" />
                Show Less
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                Show More ({otherDeps.length})
              </>
            )}
          </button>

          {showAll && (
            <div className="space-y-1 text-xs text-muted-foreground">
              {otherDeps.map((packageName) => (
                <div key={packageName}>
                  {packageName}
                  <span className="text-muted-foreground/60">
                    @{allDeps[packageName]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
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
