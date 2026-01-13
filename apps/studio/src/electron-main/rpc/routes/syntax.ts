import { base } from "@/electron-main/rpc/base";
import {
  type BundledLanguage,
  bundledLanguages,
  type HighlighterCore,
} from "shiki";
import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import { z } from "zod";

const SHIKI_THEMES = {
  dark: "github-dark-default",
  light: "github-light-default",
} as const;

const bundledLanguageKeys = Object.keys(bundledLanguages) as [
  BundledLanguage,
  ...BundledLanguage[],
];
const languageSchema = z.enum(bundledLanguageKeys);

let highlighterInstance: HighlighterCore | null = null;
let highlighterPromise: null | Promise<HighlighterCore> = null;

async function getHighlighter() {
  if (highlighterInstance !== null) {
    return highlighterInstance;
  }

  // Use createHighlighterCore with JS RegExp engine instead of WASM to eliminate initialization overhead and UI freezing.
  highlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [],
    // Dynamic imports delay loading theme bundles until highlighter is actually used.
    themes: [
      import("shiki/themes/github-dark-default.mjs"),
      import("shiki/themes/github-light-default.mjs"),
    ],
  });

  highlighterInstance = await highlighterPromise;
  return highlighterInstance;
}

const highlightCode = base
  .input(
    z.object({
      code: z.string(),
      lang: languageSchema,
      theme: z.enum(["light", "dark"]),
    }),
  )
  .output(z.string())
  .handler(async ({ input }) => {
    const highlighter = await getHighlighter();

    const loadedLanguages = highlighter.getLoadedLanguages();
    if (!loadedLanguages.includes(input.lang)) {
      // Lazy load languages to avoid upfront performance penalty.
      await highlighter.loadLanguage(bundledLanguages[input.lang]);
    }

    return highlighter.codeToHtml(input.code, {
      lang: input.lang,
      theme: SHIKI_THEMES[input.theme],
      transformers: [
        {
          name: "remove-background",
          pre: (node) => {
            node.properties.style &&= (
              node.properties.style as string
            ).replaceAll(/background-color:[^;]+;?/g, "");
          },
        },
      ],
    });
  });

const supportedLanguages = base.output(z.array(languageSchema)).handler(() => {
  return bundledLanguageKeys;
});

export const syntax = {
  highlightCode,
  supportedLanguages,
};
