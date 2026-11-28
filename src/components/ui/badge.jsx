import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
const badgeVariants = cva("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap", {
    variants: {
        variant: {
            neutral: "border-[#CBD5E1] bg-[#F1F5F9] text-[#334155]",
            primary: "border-[#BFDBFE] bg-[#EFF6FF] text-[#183F7A]",
            success: "border-[#BBF7D0] bg-[#F0FDF4] text-[#16803D]",
            warning: "border-[#FDE68A] bg-[#FFFBEB] text-[#B7791F]",
            danger: "border-[#FECACA] bg-[#FEF2F2] text-[#C53030]",
            info: "border-[#BFDBFE] bg-[#EFF6FF] text-[#2563EB]",
        },
    },
    defaultVariants: {
        variant: "neutral",
    },
});
export function Badge({ className, variant, ...props }) {
    return <span className={cn(badgeVariants({ variant }), className)} {...props}/>;
}
