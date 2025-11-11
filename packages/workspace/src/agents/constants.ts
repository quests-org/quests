import { chatAgent } from "./chat";
import { codeAgent } from "./code";

export const AGENTS = {
  chat: chatAgent,
  code: codeAgent,
} as const;
