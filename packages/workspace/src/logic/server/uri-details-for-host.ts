import { err, ok, type Result } from "neverthrow";

import { AppSubdomainSchema } from "../../schemas/subdomains";
import { type AppSubdomain } from "../../schemas/subdomains";
import { APPS_SERVER_DOMAINS } from "./constants";
import { getWorkspaceServerPort } from "./url";

export function uriDetailsForHost(
  host: string,
): Result<
  { domain: string; subdomain: AppSubdomain },
  "invalid-domain" | "invalid-subdomain" | "missing-subdomain"
> {
  const port = getWorkspaceServerPort();
  const expectedDomains = APPS_SERVER_DOMAINS.map(
    (domain) => `${domain}:${port}`,
  );

  for (const expectedDomain of expectedDomains) {
    const expectedDomainParts = expectedDomain.split(".");
    const expectedDomainPartsCount = expectedDomainParts.length;

    const parts = host.split(".");
    const minPartsRequired = expectedDomainPartsCount + 1; // domain parts + at least 1 subdomain part

    // Check if this could be the expected domain (with or without subdomain)
    if (parts.length >= expectedDomainPartsCount) {
      const domain = parts.slice(-expectedDomainPartsCount).join(".");

      if (domain === expectedDomain) {
        // Domain matches, now check for subdomain
        if (parts.length < minPartsRequired) {
          return err("missing-subdomain");
        }

        const subdomainParts = parts.slice(0, -expectedDomainPartsCount);
        const subdomainString = subdomainParts.join(".");

        if (!subdomainString) {
          return err("missing-subdomain");
        }

        const result = AppSubdomainSchema.safeParse(subdomainString);
        if (!result.success) {
          return err("invalid-subdomain");
        }

        return ok({ domain, subdomain: result.data });
      }
    }
  }

  return err("invalid-domain");
}
