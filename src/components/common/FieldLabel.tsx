import { cn } from "@/lib/cn";

export function FieldLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <label className={cn("mb-1 block text-sm font-medium text-text-secondary", className)}>{children}</label>;
}
