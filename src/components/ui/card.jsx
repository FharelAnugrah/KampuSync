import * as React from "react";
import { cn } from "@/lib/utils";

export function Card({ className, interactive = false, ...props }) {
  return (
    <div
      className={cn(
        "rounded-xl border border-[#E2E8F0] bg-white text-[#172033] shadow-xs",
        interactive &&
          "interactive-tile hover:border-[#2457A6]/35 hover:shadow-md",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      className={cn("flex flex-col gap-1 border-b border-[#E2E8F0] px-5 py-4", className)}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight text-[#172033]", className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }) {
  return (
    <p className={cn("text-sm text-[#64748B]", className)} {...props} />
  );
}

export function CardContent({ className, ...props }) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-[#E2E8F0] px-5 py-3",
        className
      )}
      {...props}
    />
  );
}
