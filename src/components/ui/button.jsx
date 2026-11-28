import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-[color,background-color,border-color,box-shadow,transform] duration-150 ease-out cursor-pointer motion-safe:active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-[#2457A6] text-white hover:bg-[#183F7A] hover:shadow-sm shadow-xs",
        secondary: "bg-[#E9EEF5] text-[#172033] hover:bg-[#DCE4F0]",
        outline:
          "border border-[#E2E8F0] bg-white text-[#172033] hover:border-[#CBD5E1] hover:bg-[#F6F8FB]",
        ghost: "text-[#172033] hover:bg-[#F1F5F9]",
        destructive:
          "bg-[#C53030] text-white hover:bg-[#9B2C2C] hover:shadow-sm shadow-xs",
        success:
          "bg-[#16803D] text-white hover:bg-[#146C33] hover:shadow-sm shadow-xs",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        default: "h-9 px-4 py-2",
        lg: "h-10 px-5 text-sm",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export const Button = React.forwardRef(
  ({ className, variant, size, type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";
