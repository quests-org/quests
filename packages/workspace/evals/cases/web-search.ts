import { type SessionMessagePart } from "../../src/schemas/session/message-part";
import { type Assertion, defineEval } from "../harness";
import { modelURI } from "../utils";

const MODEL = modelURI.openRouter("anthropic/claude-sonnet-4.5");

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
    modelURI: MODEL,
    name: "arc-raiders-latest-update",
    prompt: "What is the latest update to Arc Raiders?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    modelURI: MODEL,
    name: "current-weather-new-york",
    prompt: "What's the weather like in New York right now?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    modelURI: MODEL,
    name: "recent-spacex-launch",
    prompt: "Did SpaceX launch anything recently?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    modelURI: MODEL,
    name: "latest-iphone-release",
    prompt: "What's the newest iPhone out right now?",
    shouldStop: stopOnWebSearch,
  }),
  defineEval({
    assertions: [assertUsedWebSearch],
    modelURI: MODEL,
    name: "todays-top-news",
    prompt: "What are the big news stories today?",
    shouldStop: stopOnWebSearch,
  }),

  // Should NOT trigger web search
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    modelURI: MODEL,
    name: "python-hello-world",
    prompt: "Write a hello world program in Python",
  }),
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    modelURI: MODEL,
    name: "what-is-a-linked-list",
    prompt: "Can you explain how a linked list works?",
  }),
  defineEval({
    assertions: [assertDidNotUseWebSearch],
    modelURI: MODEL,
    name: "sort-array-javascript",
    prompt: "How do I sort an array of numbers in JavaScript?",
  }),
];
