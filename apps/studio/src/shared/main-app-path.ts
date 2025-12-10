import { type FileRoutesByPath } from "@tanstack/react-router";

export type MainAppPath = FileRoutesByPath[keyof FileRoutesByPath]["fullPath"];
