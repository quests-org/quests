import { isWindows } from "./utils";

export function getTrashTerminology(): string {
  return isWindows() ? "Recycle Bin" : "Trash";
}

export const PROGRESS_MESSAGES = [
  "Still trashing...",
  "Who knew deleting node_modules was so slow...",
  "Maybe time to upgrade from your tape drive...",
  "Have you considered defragmenting your hard drive?",
  "At this point it might be faster to use a microwave...",
];
