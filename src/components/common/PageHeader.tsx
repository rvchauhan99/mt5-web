import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumb?: ReactNode;
  className?: string;
};

/**
 * PageHeader — standardized page title + subtitle + action buttons strip.
 * Matches solar-web listing header pattern.
 */
export function PageHeader({ title, description, actions, breadcrumb, className }: Props) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {breadcrumb && (
        <div className="mb-1 text-xs text-gray-400">{breadcrumb}</div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-[#1b365d]">{title}</h1>
          {description && (
            <p className="mt-0.5 text-sm text-gray-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
      </div>
    </div>
  );
}
