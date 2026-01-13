import { toSupportedLanguage } from "@/client/lib/file-extension-to-language";
import { rpcClient } from "@/client/rpc/client";
import { skipToken, useQuery } from "@tanstack/react-query";

import { useTheme } from "../components/theme-provider";

export function useSyntaxHighlighting({
  code,
  language,
}: {
  code: string | undefined;
  language: string | undefined;
}) {
  const { resolvedTheme } = useTheme();

  const { data: supportedLanguages } = useQuery(
    rpcClient.syntax.supportedLanguages.queryOptions({
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  );

  const validLanguage =
    language && supportedLanguages
      ? toSupportedLanguage(language, supportedLanguages)
      : undefined;

  const { data: highlightedHtml } = useQuery(
    rpcClient.syntax.highlightCode.queryOptions({
      input:
        validLanguage && code
          ? {
              code,
              lang: validLanguage,
              theme: resolvedTheme === "dark" ? "dark" : "light",
            }
          : skipToken,
      placeholderData: (previousData) => previousData,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      staleTime: Number.POSITIVE_INFINITY,
    }),
  );

  return {
    highlightedHtml,
    isLanguageSupported: !!validLanguage,
    supportedLanguages,
  };
}
