import { type SessionMessagePart } from "../../src/schemas/session/message-part";
import { type Assertion, defineEval } from "../harness";

const stopOnWebSearch = (part: SessionMessagePart.Type) =>
  part.type === "tool-web_search" &&
  "state" in part &&
  part.state === "input-available";

const hasWebSearchPart = (
  sessions: { messages: { parts: SessionMessagePart.Type[] }[] }[],
) =>
  sessions.some((s) =>
    s.messages.some((m) => m.parts.some((p) => p.type === "tool-web_search")),
  );

const assertUsedWebSearch: Assertion = {
  check: ({ sessions }) => {
    const used = hasWebSearchPart(sessions);
    return {
      evidence: used
        ? "Found tool-web_search part in session messages"
        : "No tool-web_search part found in session messages",
      passed: used,
      text: "Used the web search tool",
    };
  },
  text: "Used the web search tool",
};

const assertDidNotUseWebSearch: Assertion = {
  check: ({ sessions }) => {
    const used = hasWebSearchPart(sessions);
    return {
      evidence: used
        ? "Found tool-web_search part in session messages (unexpected)"
        : "No tool-web_search part found in session messages",
      passed: !used,
      text: "Did not use the web search tool",
    };
  },
  text: "Did not use the web search tool",
};

export const WEB_SEARCH_EVALS = [
  // Should trigger web search
  defineEval({
    assertions: [assertUsedWebSearch],
    name: "arc-raiders-latest-update",
    prompt: "What is the latest update to Arc Raiders?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    // Ambiguous: model knows what BTC is, but price is time-sensitive
    name: "bitcoin-price-today",
    prompt: "What's the price of Bitcoin today?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    // Tricky: a well-known company but their current status is time-sensitive
    name: "openai-current-valuation",
    prompt: "What is OpenAI's current valuation?",
    shouldStop: stopOnWebSearch,
  }),

  // Should NOT trigger web search
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    name: "what-is-a-linked-list",
    prompt: "Can you explain how a linked list works?",
  }),
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    // Tricky: sounds like it could be recent news, but the answer is static
    name: "why-was-the-eiffel-tower-built",
    prompt: "Why was the Eiffel Tower built?",
  }),
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    // Tricky: model knows GPT-4 well, might feel tempted to search for "latest" info
    name: "explain-gpt4-architecture",
    prompt: "Can you explain how GPT-4 works at a high level?",
  }),
];
