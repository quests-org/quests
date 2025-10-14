import { type Info } from "@netlify/build-info/node";

type PackageManagerName = NonNullable<Info["packageManager"]>["name"];

// Not exported by @netlify/build-info so we recreate it here
export const PackageManager = {
  BUN: "bun" as PackageManagerName,
  NPM: "npm" as PackageManagerName,
  PNPM: "pnpm" as PackageManagerName,
  YARN: "yarn" as PackageManagerName,
};
