import * as React from "react";
import { toast } from "sonner";

import { ExternalLink } from "./external-link";

export function EmailLink({
  body,
  children,
  email,
  subject,
  ...rest
}: Omit<React.ComponentProps<typeof ExternalLink>, "href"> & {
  body?: string;
  email: string;
  subject?: string;
}) {
  const params = new URLSearchParams();
  if (subject) {
    params.set("subject", subject);
  }
  if (body) {
    params.set("body", body);
  }
  const query = params.toString();
  const href = `mailto:${email}${query ? `?${query}` : ""}`;

  const handleClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    void navigator.clipboard.writeText(email);
    toast.info(`Copied ${email} to clipboard`);
    rest.onClick?.(event);
  };

  return (
    <ExternalLink
      {...rest}
      addReferral={false}
      href={href}
      onClick={handleClick}
    >
      {children}
    </ExternalLink>
  );
}
