import { Hono } from "hono";

import { localhostUrl, loopbackUrl } from "../../../lib/url-for-subdomain";
import { AppSubdomainSchema } from "../../../schemas/subdomains";
import { LOCAL_LOOPBACK_APPS_SERVER_DOMAIN } from "../constants";
import { type WorkspaceServerEnv } from "../types";
import { getWorkspaceServerPort } from "../url";

const app = new Hono<WorkspaceServerEnv>();

// Most browsers support localhost subdomains, but Safari does not
// Still making this a whitelist because our loopback domain works everywhere
function supportsLocalhostSubdomains(userAgent: string): boolean {
  return (
    userAgent.includes("Chrome") ||
    userAgent.includes("Chromium") ||
    userAgent.includes("Edg/") ||
    userAgent.includes("OPR/") ||
    userAgent.includes("Brave/") ||
    userAgent.includes("Firefox")
  );
}

app.get("/redirect/:subdomain", async (c, next) => {
  const host = c.req.header("host") || "";
  const isBare =
    host === `${LOCAL_LOOPBACK_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}`;

  if (!isBare) {
    // If we have a subdomain, allow those apps to handle the request
    await next();
    return;
  }

  const subdomainParam = c.req.param("subdomain");
  const userAgent = c.req.header("user-agent") || "";

  const subdomainResult = AppSubdomainSchema.safeParse(subdomainParam);
  if (!subdomainResult.success) {
    return c.notFound();
  }

  const subdomain = subdomainResult.data;
  const supportsSubdomains = supportsLocalhostSubdomains(userAgent);
  const targetUrl = supportsSubdomains
    ? localhostUrl(subdomain)
    : loopbackUrl(subdomain);

  return c.redirect(targetUrl);
});

export const redirectRoute = app;
