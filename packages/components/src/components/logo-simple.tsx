import * as React from "react";

export interface QuestsLogoSimpleIconProps
  extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export const QuestsLogoSimpleIcon = React.forwardRef<
  SVGSVGElement,
  QuestsLogoSimpleIconProps
>(({ className, size = 24, ...props }, ref) => {
  return (
    <svg
      className={className}
      fill="currentColor"
      height={size}
      ref={ref}
      viewBox="0 0 24 24"
      width={size}
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c1.85 0 3.58-.5 5.07-1.37l-2.12-1.94c-1.02.52-2.17.81-3.45.81-4.14 0-7.5-3.36-7.5-7.5S7.86 4.5 12 4.5s7.5 3.36 7.5 7.5c0 1.65-.54 3.18-1.45 4.41l1.94 1.77C21.26 16.58 22 14.37 22 12c0-5.52-4.48-10-10-10z"
        fillRule="evenodd"
      />
      <path
        d="M12 7c-2.76 0-5 2.24-5 5 0 2.21 1.43 4.08 3.42 4.74.3.1.63-.08.73-.38.1-.3-.08-.63-.38-.73-1.49-.49-2.57-1.89-2.57-3.63 0-2.07 1.68-3.75 3.75-3.75s3.75 1.68 3.75 3.75c0 .83-.27 1.59-.73 2.21l.94.86c.67-.88 1.07-1.98 1.07-3.17C17 9.24 14.76 7 12 7z"
        fillRule="evenodd"
      />
    </svg>
  );
});

QuestsLogoSimpleIcon.displayName = "QuestsLogoSimpleIcon";
