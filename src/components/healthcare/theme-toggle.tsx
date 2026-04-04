"use client";

import { Moon, SunMedium } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { useTheme } from "@/providers/theme-provider";

type ThemeToggleProps = {
  className?: string;
  size?: ButtonProps["size"];
  variant?: ButtonProps["variant"];
};

export function ThemeToggle({
  className,
  size = "icon",
  variant = "ghost",
}: ThemeToggleProps) {
  const { mounted, resolvedTheme, setTheme } = useTheme();
  const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={() => setTheme(nextTheme)}
      aria-label="Toggle theme"
      className={cn(className)}
    >
      {!mounted || resolvedTheme === "dark" ? (
        <SunMedium size={16} />
      ) : (
        <Moon size={16} />
      )}
    </Button>
  );
}
