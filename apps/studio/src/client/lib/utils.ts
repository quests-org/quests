import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isLinux(): boolean {
  return window.electron.process.platform === "linux";
}

export function isMacOS(): boolean {
  return window.electron.process.platform === "darwin";
}

export function isWindows(): boolean {
  return window.electron.process.platform === "win32";
}
