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
  const params: string[] = [];
  if (subject) {
    params.push(`subject=${encodeURIComponent(subject)}`);
  }
  if (body) {
    params.push(`body=${encodeURIComponent(body)}`);
  }
  const query = params.join("&");
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
