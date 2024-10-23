import { Hono } from "hono";
import { html } from "hono/html";
import { proxy } from "hono/proxy";

import { SHIM_SCRIPT_PATH } from "../constants";
import { RuntimeList } from "../runtime-list";
import { type WorkspaceServerEnv } from "../types";
import { uriDetailsForHost } from "../uri-details-for-host";

const SHIM_SCRIPT = html`<script
  src="${SHIM_SCRIPT_PATH}"
  type="module"
></script>`;
const SHIM_PAGE = html`
  <html>
    <head>
      ${SHIM_SCRIPT}
    </head>
    <body></body>
  </html>
`;

const app = new Hono<WorkspaceServerEnv>();

app.all("/*", async (c, next) => {
  const shimScript = await SHIM_SCRIPT;
  const shimPage = await SHIM_PAGE;
  const host = c.req.header("host") || "";
  const uriDetails = uriDetailsForHost(host);

  if (uriDetails.isErr()) {
    if (uriDetails.error === "missing-subdomain") {
      if (c.req.path !== "/") {
        // Ensures the following apps in parent can handle the request
        await next();
        return;
      }
      const snapshot = c.var.parentRef.getSnapshot();
      return c.html(
        RuntimeList({
          runtimeRefs: snapshot.context.runtimeRefs,
          workspaceConfig: c.var.workspaceConfig,
        }),
      );
    } else if (uriDetails.error === "invalid-domain") {
      return c.notFound();
    } else {
      return c.html(SHIM_PAGE);
    }
  }

  const { subdomain } = uriDetails.value;
  const runtimeRef = c.var.getRuntimeRef(subdomain);
  if (!runtimeRef) {
    return c.html(SHIM_PAGE);
  }

  const port = runtimeRef.getSnapshot().context.port;
  if (!port) {
    return c.html(SHIM_PAGE);
  }

  const url = `http://localhost:${port}${c.req.path}`;
  const headers = new Headers(c.req.raw.headers);
  headers.set(
    "X-Forwarded-For",
    c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "127.0.0.1",
  );
  headers.set("X-Forwarded-Host", host);
  headers.delete("if-none-match");
  headers.delete("if-modified-since");

  let res: Response;
  try {
    res = await proxy(url, {
      body: c.req.raw.body,
      headers,
      method: c.req.raw.method,
    });
  } catch (error) {
    if (!(error instanceof Error && error.message === "fetch failed")) {
      runtimeRef.send({
        type: "saveError",
        value: {
          createdAt: Date.now(),
          message: error instanceof Error ? error.message : "Unknown error",
          type: "router",
        },
      });
    }
    return c.html(SHIM_PAGE);
  }

  const responseContentType = res.headers.get("content-type") || "";
  const isHtmlContentType = /^text\/html|application\/xhtml\+xml/i.test(
    responseContentType,
  );
  const isTextPlainContentType = responseContentType.includes("text/plain");
  const isServerSentEvents = responseContentType.includes("text/event-stream");
  const isStreaming =
    res.headers.get("Transfer-Encoding") === "chunked" || isServerSentEvents;

  // For streaming responses (SSE, chunked), pass through without consuming body
  if (isStreaming) {
    return new Response(res.body, {
      headers: res.headers,
      status: res.status,
      statusText: res.statusText,
    });
  }

  if (res.status >= 500 && isTextPlainContentType) {
    // Server error, we should return the shim
    const body = await res.text();
    runtimeRef.send({
      type: "saveError",
      value: {
        createdAt: Date.now(),
        message: `Error proxying request: ${res.status} ${body}`,
        type: "router",
      },
    });
    return c.html(shimPage);
  } else if (res.status >= 400 && isTextPlainContentType) {
    // Client error, we should return the shim
    const body = await res.text();
    if (body.length > 0) {
      // 400 error with a body is not expected from Vite
      runtimeRef.send({
        type: "saveError",
        value: {
          createdAt: Date.now(),
          message: `Error proxying request: ${res.status} ${body}`,
          type: "router",
        },
      });
    }
    return c.html(shimPage);
  }

  const clonedRes = res.clone();
  const body = await clonedRes.text();
  const hasHtmlTag = /<!doctype\s+html|<html[\s>]/i.test(body.slice(0, 1024));

  if (isHtmlContentType || (!responseContentType.trim() && hasHtmlTag)) {
    // For HTML responses, inject the shim script
    const newBody = body.replace("</head>", `${shimScript}</head>`);

    // Must modify headers to prevent caching issues due to injected shim
    const newHeaders = new Headers(res.headers);
    newHeaders.delete("etag");
    newHeaders.delete("last-modified");
    newHeaders.set(
      "content-length",
      String(Buffer.byteLength(newBody, "utf8")),
    );
    if (!responseContentType.trim() && hasHtmlTag) {
      newHeaders.set("content-type", "text/html");
    }

    return new Response(newBody, { headers: newHeaders, status: res.status });
  }

  // For all other non-streaming responses, pass through as-is
  return new Response(res.body, {
    headers: res.headers,
    status: res.status,
    statusText: res.statusText,
  });
});

export const allProxyRoute = app;
