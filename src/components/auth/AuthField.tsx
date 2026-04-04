"use client";

import { useId, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AuthFieldProps = {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: "text" | "email" | "password";
  autoComplete?: string;
  icon: LucideIcon;
  error?: string;
  disabled?: boolean;
  revealable?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  name?: string;
};

export function AuthField({
  id,
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  type = "text",
  autoComplete,
  icon: Icon,
  error,
  disabled = false,
  revealable = false,
  inputMode,
  name,
}: AuthFieldProps) {
  const generatedId = useId();
  const fieldId = id ?? generatedId;
  const [revealed, setRevealed] = useState(false);
  const resolvedType =
    type === "password" && revealable ? (revealed ? "text" : "password") : type;

  return (
    <div className="space-y-2">
      <label
        htmlFor={fieldId}
        className="text-[13px] font-medium uppercase tracking-[0.05em] text-text-secondary"
      >
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center rounded-xl border bg-input px-4 transition-all duration-200 ease-out",
          error
            ? "border-danger ring-2 ring-danger/15"
            : "border-input-border focus-within:border-primary focus-within:ring-2 focus-within:ring-ring",
        )}
      >
        <Icon size={16} className="mr-3 shrink-0 text-text-muted" />
        <input
          id={fieldId}
          name={name}
          type={resolvedType}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          inputMode={inputMode}
          className="w-full bg-transparent text-[15px] text-foreground outline-none placeholder:text-text-muted"
        />
        {type === "password" && revealable ? (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            aria-label={revealed ? "Hide password" : "Show password"}
            className="ml-3 shrink-0 rounded-md p-1 text-text-muted transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {revealed ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
