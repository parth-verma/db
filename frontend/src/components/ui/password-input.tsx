import * as React from "react";
import { cn } from "@/lib/utils";
import { EyeIcon, EyeOffIcon } from "lucide-react";

// A password input built on top of the existing Input styles with a visibility toggle button.
const PasswordInput = React.forwardRef<
  HTMLInputElement,
  React.ComponentProps<"input">
>(({ className, disabled, ...props }, ref) => {
  const [show, setShow] = React.useState(false);

  const toggle = React.useCallback(() => {
    if (disabled) return;
    setShow((s) => !s);
  }, [disabled]);

  return (
    <div className={cn("relative", className)}>
      <input
        data-slot="input"
        ref={ref}
        type={show ? "text" : "password"}
        className={cn(
          // base styles copied from Input and with extra padding-right for the icon button
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 pr-10 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
          className,
        )}
        disabled={disabled}
        // ignore incoming type prop to ensure password behavior
        {...props}
      />
      <button
        type="button"
        onClick={toggle}
        tabIndex={-1}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        title={show ? "Hide password" : "Show password"}
        disabled={disabled}
        className={cn(
          "absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors",
          disabled ? "opacity-50 cursor-not-allowed" : "hover:text-foreground",
        )}
      >
        {show ? (
          <EyeOffIcon className="size-4" />
        ) : (
          <EyeIcon className="size-4" />
        )}
      </button>
    </div>
  );
});
PasswordInput.displayName = "PasswordInput";

export { PasswordInput };
