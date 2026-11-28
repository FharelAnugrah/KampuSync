import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#172033] placeholder:text-[#64748B] transition-[border-color,box-shadow] duration-150 focus:border-[#2457A6] focus:ring-2 focus:ring-[#2457A6]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

export const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "flex min-h-[84px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#172033] placeholder:text-[#64748B] transition-[border-color,box-shadow] duration-150 focus:border-[#2457A6] focus:ring-2 focus:ring-[#2457A6]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-60",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm text-[#172033] transition-[border-color,box-shadow] duration-150 focus:border-[#2457A6] focus:ring-2 focus:ring-[#2457A6]/20 focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F8FAFC] disabled:opacity-60",
      className
    )}
    {...props}
  >
    {children}
  </select>
));
Select.displayName = "Select";

export function Label({ className, required, children, ...props }) {
  return (
    <label className={cn("block text-sm font-medium text-[#172033]", className)} {...props}>
      {children}
      {required ? (
        <span className="ml-0.5 text-[#C53030]" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}
