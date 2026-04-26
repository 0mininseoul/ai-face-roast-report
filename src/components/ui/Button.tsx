import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  icon?: ReactNode;
}

export function Button({ className = "", variant = "primary", icon, children, ...props }: ButtonProps) {
  const variants: Record<Variant, string> = {
    primary: "border-accent-info/50 bg-accent-info text-bg-primary hover:bg-white",
    ghost: "border-border bg-bg-card/70 text-text-primary hover:border-border-bright hover:bg-bg-card-hover",
    danger: "border-accent-bad/50 bg-accent-bad/15 text-accent-bad hover:bg-accent-bad hover:text-white",
  };

  return (
    <button
      className={[
        "inline-flex h-11 items-center justify-center gap-2 rounded-md border px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
        variants[variant],
        className,
      ].join(" ")}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
