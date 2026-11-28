import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
export function PageHeader({ title, description, breadcrumbs, actions, }) {
    return (<div className="mb-6 space-y-2">
      {breadcrumbs && breadcrumbs.length > 0 ? (<nav aria-label="Breadcrumb" className="no-print flex items-center gap-1.5 text-xs text-[#64748B]">
          {breadcrumbs.map((crumb, index) => (<React.Fragment key={crumb.label}>
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 text-[#94A3B8]"/> : null}
              {crumb.href ? (<Link href={crumb.href} className="hover:text-[#2457A6] hover:underline">
                  {crumb.label}
                </Link>) : (<span className="font-medium text-[#172033]">{crumb.label}</span>)}
            </React.Fragment>))}
        </nav>) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[22px] font-bold tracking-tight text-[#172033] sm:text-[26px]">
            {title}
          </h1>
          {description ? (<p className="mt-1 text-sm text-[#64748B]">{description}</p>) : null}
        </div>
        {actions ? <div className="no-print flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>);
}
