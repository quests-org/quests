import { type FileRoutesByPath } from "@tanstack/react-router";

export type StudioPath = FileRoutesByPath[keyof FileRoutesByPath]["fullPath"];
