import { z } from "zod";

export const SubdomainPartSchema = z
  .string()
  .brand("SubdomainPart")
  .check((ctx) => {
    const subdomainPart = ctx.value;

    if (!subdomainPart) {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: subdomainPart,
        message: "Subdomain part must have content",
      });
      return;
    }

    const maxLength = 63;
    if (subdomainPart.length > maxLength) {
      ctx.issues.push({
        code: "too_big",
        input: subdomainPart,
        maximum: maxLength,
        message: `Subdomain part must be ${maxLength} characters or less`,
        origin: "string",
      });
      return;
    }

    const subdomainRegex = /^[a-z0-9-]+$/;
    if (!subdomainRegex.test(subdomainPart)) {
      ctx.issues.push({
        code: "custom",
        fatal: true,
        input: subdomainPart,
        message:
          "Subdomain can only contain lowercase letters, numbers, and hyphens",
      });
      return;
    }
  });

export type SubdomainPart = z.output<typeof SubdomainPartSchema>;

export function validateSubdomainPart(
  subdomainPart: string,
  ctx: z.core.ParsePayload,
) {
  if (!subdomainPart) {
    ctx.issues.push({
      code: "custom",
      fatal: true,
      input: subdomainPart,
      message: "Subdomain part must have content",
    });
    return false;
  }

  const maxLength = 63;
  if (subdomainPart.length > maxLength) {
    ctx.issues.push({
      code: "too_big",
      input: subdomainPart,
      maximum: maxLength,
      message: `Subdomain part must be ${maxLength} characters or less`,
      origin: "string",
    });
    return false;
  }

  const subdomainRegex = /^[a-z0-9-]+$/;
  if (!subdomainRegex.test(subdomainPart)) {
    ctx.issues.push({
      code: "custom",
      fatal: true,
      input: subdomainPart,
      message:
        "Subdomain can only contain lowercase letters, numbers, and hyphens",
    });
    return false;
  }

  return true;
}
