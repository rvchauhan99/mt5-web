import { PropsWithChildren } from "react";
import { cn } from "@/lib/cn";

type Props = PropsWithChildren<{
  className?: string;
}>;

export function Card({ className, children }: Props) {
  return <div className={cn("card p-4", className)}>{children}</div>;
}
