"use client";

import { forwardRef } from "react";
import { Tabs as BaseTabs } from "@base-ui/react/tabs";
import { cn } from "@/lib/utils";

export const Tabs = forwardRef(function Tabs(
  { value, onValueChange, defaultValue, children, className, ...props },
  ref
) {
  return (
    <BaseTabs.Root
      ref={ref}
      value={value}
      onValueChange={onValueChange}
      defaultValue={defaultValue}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </BaseTabs.Root>
  );
});

export const TabsList = forwardRef(function TabsList(
  { className, ...props },
  ref
) {
  return (
    <BaseTabs.List
      ref={ref}
      className={cn(
        "inline-flex h-10 w-full items-center justify-start gap-1 overflow-x-auto overflow-y-hidden rounded-lg py-1",
        "scrollbar-hide [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        className
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef(function TabsTrigger(
  { className, value, ...props },
  ref
) {
  return (
    <BaseTabs.Tab
      ref={ref}
      value={value}
      className={cn(
        "inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium whitespace-nowrap transition-all disabled:pointer-events-none disabled:opacity-50",
        "border border-border bg-card text-muted-foreground",
        "data-active:bg-[color:var(--brand-primary)] data-active:text-white data-active:border-[color:var(--brand-primary)]",
        "hover:bg-muted hover:text-foreground",
        "min-w-fit shrink-0",
        className
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef(function TabsContent(
  { className, value, keepMounted, ...props },
  ref
) {
  return (
    <BaseTabs.Panel
      ref={ref}
      value={value}
      keepMounted={keepMounted}
      className={cn(
        "ring-offset-background focus-visible:ring-ring mt-2 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
        "data-hidden:hidden",
        className
      )}
      {...props}
    />
  );
});
