import { generateUserAgent } from "@quests/shared/generate-user-agent";
import mimeTypes from "mime-types";
import ms from "ms";
import { ok } from "neverthrow";
import { Buffer } from "node:buffer";
import path from "node:path";
import { dedent, uid } from "radashi";
import { z } from "zod";

import { APP_FOLDER_NAMES } from "../constants";
import { absolutePathJoin } from "../lib/absolute-path-join";
import { executeError } from "../lib/execute-error";
import { writeFileWithDir } from "../lib/write-file-with-dir";
import { BaseInputSchema, TOOL_EXPLANATION_PARAM_NAME } from "./base";
import { createTool } from "./create-tool";
import { ReadFile } from "./read-file";

const INPUT_PARAMS = {
  url: "url",
} as const;

const FETCHES_DIR = "fetches";

export const WebFetch = createTool({
  description: dedent`
    Download any content from a URL and save it to a file. Use this to retrieve web pages,
    images, documents, or any other content from the web.

    The fetched content is written as-is to a file in the project's private directory.
    Use the ${ReadFile.name} tool to inspect text-based content afterward.

    Good for:
    - Reading full articles, documentation, or blog posts
    - Downloading images, PDFs, or other binary files
    - Fetching API documentation or technical references
    - Retrieving content from URLs found in web search results

    Not good for:
    - Pages that require authentication or login
    - Sites that heavily rely on JavaScript rendering
  `,
  execute: async ({ appConfig, input, signal }) => {
    const { url } = input;

    let parsedURL: URL;
    try {
      parsedURL = new URL(url);
    } catch {
      return executeError(`Invalid URL: ${url}`);
    }

    if (!["http:", "https:"].includes(parsedURL.protocol)) {
      return executeError(
        `Only HTTP and HTTPS URLs are supported. Got: ${parsedURL.protocol}`,
      );
    }

    try {
      const userAgent = generateUserAgent();

      const headers: Record<string, string> = {
        Accept: "*/*",
        "Accept-Language": "en-US,en;q=0.9",
      };

      if (userAgent) {
        headers["User-Agent"] = userAgent;
      }

      const response = await fetch(url, {
        headers,
        redirect: "follow",
        signal,
      });

      if (!response.ok) {
        return executeError(
          `Failed to fetch URL (HTTP ${response.status}): ${response.statusText}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      const body = Buffer.from(await response.arrayBuffer());
      const contentLength = body.length;

      const fileName = generateFileName(parsedURL, contentType);
      const relativePath = path.join(
        APP_FOLDER_NAMES.private,
        FETCHES_DIR,
        fileName,
      );
      const absolutePath = absolutePathJoin(appConfig.appDir, relativePath);

      await writeFileWithDir(absolutePath, body, { signal });

      return ok({
        contentLength,
        contentType,
        filePath: relativePath,
        url: response.url,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return executeError("Request was aborted.");
      }

      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      return executeError(`Failed to fetch URL: ${message}`);
    }
  },
  inputSchema: BaseInputSchema.extend({
    [INPUT_PARAMS.url]: z.string().meta({
      description: `The URL to fetch content from. Must be a valid HTTP or HTTPS URL. Generate this after ${TOOL_EXPLANATION_PARAM_NAME}.`,
    }),
  }),
  name: "web_fetch",
  outputSchema: z.object({
    contentLength: z.number(),
    contentType: z.string(),
    filePath: z.string(),
    url: z.string(),
  }),
  readOnly: false,
  timeoutMs: ms("2 minutes"),
  toModelOutput: ({ output }) => {
    return {
      type: "text",
      value: dedent`
        Fetched ${output.url} (${output.contentType}, ${output.contentLength} bytes) and saved to ${output.filePath}

        Use the ${ReadFile.name} tool to inspect text-based content.
      `,
    };
  },
});

function generateFileName(url: URL, contentType: string): string {
  const hostname = url.hostname.replace("www.", "");
  const pathSegment = url.pathname
    .replaceAll(/^\/|\/$/g, "")
    .replaceAll("/", "-")
    .replaceAll(/[^a-z0-9-]/gi, "")
    .slice(0, 50);

  const ext = mimeTypes.extension(contentType) || "bin";
  const base = pathSegment ? `${hostname}-${pathSegment}` : hostname;
  return `${base}-${uid(6)}.${ext}`;
}
