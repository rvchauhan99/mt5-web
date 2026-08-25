import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";
import { COMPACT_SECTION_HEADER_CLASS } from "@/utils/formConstants";

type Props = PropsWithChildren<{
  title?: string;
  description?: string;
  className?: string;
}>;

/**
 * FormSection — titled section within a form.
 * Title-only: compact ERP header (solar-aligned). With description: bordered block.
 */
export function FormSection({ title, description, className, children }: Props) {
  return (
    <div className={cn(description ? "space-y-3" : "w-full", className)}>
      {title && !description && (
        <div className={COMPACT_SECTION_HEADER_CLASS}>{title}</div>
      )}
      {(title && description) || (!title && description) ? (
        <div className="border-b border-border pb-2">
          {title && (
            <h3 className="text-sm font-semibold text-[color:var(--sidebar-bg)]">{title}</h3>
          )}
          {description && (
            <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      ) : null}
      {children}
    </div>
  );
}
