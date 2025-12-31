import { dedent } from "radashi";

interface PackageJson {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export function formatPackageDependencies(pkg: PackageJson) {
  const deps = Object.entries(pkg.dependencies ?? {}).map(
    ([pkgName, version]) => `- ${pkgName}@${version}`,
  );
  const devDeps = Object.entries(pkg.devDependencies ?? {}).map(
    ([pkgName, version]) => `- ${pkgName}@${version}`,
  );
  return dedent`
    ${deps.length > 0 ? `dependencies:\n${deps.join("\n")}` : ""}
    ${devDeps.length > 0 ? `devDependencies:\n${devDeps.join("\n")}` : ""}
  `.trim();
}
