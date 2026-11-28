import * as React from "react";
import { cn } from "@/lib/utils";
export function Table({ className, ...props }) {
    return (<div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-left text-sm", className)} {...props}/>
    </div>);
}
export function TableHeader({ className, ...props }) {
    return (<thead className={cn("border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold uppercase tracking-wide text-[#64748B]", className)} {...props}/>);
}
export function TableBody({ className, ...props }) {
    return <tbody className={cn("divide-y divide-[#E2E8F0]", className)} {...props}/>;
}
export function TableRow({ className, ...props }) {
    return (<tr className={cn("transition-colors hover:bg-[#F8FAFC]", className)} {...props}/>);
}
export function TableHead({ className, ...props }) {
    return <th className={cn("px-4 py-3 font-semibold", className)} {...props}/>;
}
export function TableCell({ className, ...props }) {
    return <td className={cn("px-4 py-3 align-middle text-[#172033]", className)} {...props}/>;
}
