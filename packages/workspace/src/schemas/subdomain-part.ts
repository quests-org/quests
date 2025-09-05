import { z } from "zod";

export const SubdomainPartSchema = z
  .string()
  .brand("SubdomainPart")
  .superRefine(validateSubdomainPart);

export type SubdomainPart = z.output<typeof SubdomainPartSchema>;

export function validateSubdomainPart(
  subdomainPart: string,
  ctx: z.core.$RefinementCtx,
) {
  if (!subdomainPart) {
    ctx.addIssue({
      code: "custom",
      fatal: true,
      input: subdomainPart,
      message: "Subdomain part must have content",
    });
  }

  const subdomainRegex = /^[a-z0-9-]+$/;
  if (!subdomainRegex.test(subdomainPart)) {
    ctx.addIssue({
      code: "custom",
      fatal: true,
      input: subdomainPart,
      message:
        "Subdomain can only contain lowercase letters, numbers, and hyphens",
    });
  }
}
