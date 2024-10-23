import { is } from "@electron-toolkit/utils";
import { type FileRoutesByPath } from "@tanstack/react-router";
import path from "node:path";
import url from "node:url";

export type MainAppPath = FileRoutesByPath[keyof FileRoutesByPath]["fullPath"];

export function mainAppUrl(pathname: MainAppPath) {
  return createBaseUrl("../renderer/index.html", pathname);
}

export function unsafe_mainAppUrl(pathname: string) {
  return mainAppUrl(pathname as MainAppPath);
}

function createBaseUrl(rendererPath: string, hash = "") {
  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    const baseUrl = new URL(process.env.ELECTRON_RENDERER_URL);
    baseUrl.pathname = rendererPath;
    baseUrl.hash = hash;
    return baseUrl.toString();
  } else {
    const fileUrl = url.format({
      pathname: path.join(import.meta.dirname, rendererPath),
      protocol: "file:",
      slashes: true,
    });
    const baseUrl = new URL(fileUrl);
    baseUrl.hash = hash;
    return baseUrl.toString();
  }
}
