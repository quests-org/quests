import { Check, Copy } from "lucide-react";
import { memo, useState } from "react";

export const CopyButton = memo(function CopyButton({
  className,
  disabled,
  iconSize = 16,
  onCopy,
  ...props
}: Omit<React.ComponentPropsWithoutRef<"button">, "onClick"> & {
  className?: string;
  disabled?: boolean;
  iconSize?: number;
  onCopy: () => Promise<void> | void;
}) {
  const [showCheck, setShowCheck] = useState(false);

  const handleClick = async () => {
    if (showCheck || disabled) {
      return;
    }

    await onCopy();
    setShowCheck(true);
    setTimeout(() => {
      setShowCheck(false);
    }, 2000);
  };

  return (
    <button
      {...props}
      aria-label="Copy"
      className={className}
      disabled={disabled || showCheck}
      onClick={handleClick}
    >
      {showCheck ? <Check size={iconSize} /> : <Copy size={iconSize} />}
    </button>
  );
});
