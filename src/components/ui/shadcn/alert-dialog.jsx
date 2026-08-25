"use client";

import { AlertDialog as AlertDialogPrimitive } from "@base-ui/react/alert-dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/shadcn/button";
import { Z_INDEX_LAYERS } from "@/utils/zIndexLayers";

export function AlertDialog(props) {
  return (
    <AlertDialogPrimitive.Root data-slot="alert-dialog" {...props} />
  );
}

export function AlertDialogTrigger(props) {
  return (
    <AlertDialogPrimitive.Trigger
      data-slot="alert-dialog-trigger"
      {...props}
    />
  );
}

export function AlertDialogPortal(props) {
  return (
    <AlertDialogPrimitive.Portal
      data-slot="alert-dialog-portal"
      {...props}
    />
  );
}

export function AlertDialogOverlay({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Backdrop
      data-slot="alert-dialog-overlay"
      className={cn(
        "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 fixed inset-0 isolate bg-black/10 duration-100 supports-backdrop-filter:backdrop-blur-xs",
        className
      )}
      style={{ zIndex: Z_INDEX_LAYERS.modalBackdrop }}
      {...props}
    />
  );
}

export function AlertDialogContent({
  className,
  size = "default",
  ...props
}) {
  return (
    <AlertDialogPortal>
      <AlertDialogOverlay />
      <AlertDialogPrimitive.Popup
        data-slot="alert-dialog-content"
        data-size={size}
        className={cn(
          "data-open:animate-in data-closed:animate-out data-closed:fade-out-0 data-open:fade-in-0 data-closed:zoom-out-95 data-open:zoom-in-95 bg-background ring-foreground/10 group/alert-dialog-content fixed top-1/2 left-1/2 grid max-h-[90vh] w-full -translate-x-1/2 -translate-y-1/2 gap-4 overflow-hidden rounded-xl p-4 ring-1 duration-100 outline-none",
          "data-[size=sm]:max-w-xs data-[size=sm]:sm:max-w-sm",
          "data-[size=default]:max-w-xs data-[size=default]:sm:max-w-sm data-[size=default]:md:max-w-md",
          "data-[size=lg]:max-w-sm data-[size=lg]:sm:max-w-md data-[size=lg]:md:max-w-lg data-[size=lg]:lg:max-w-xl",
          "data-[size=xl]:max-w-md data-[size=xl]:sm:max-w-lg data-[size=xl]:md:max-w-xl data-[size=xl]:lg:max-w-2xl",
          "data-[size=2xl]:max-w-lg data-[size=2xl]:sm:max-w-xl data-[size=2xl]:md:max-w-2xl data-[size=2xl]:lg:max-w-3xl",
          "data-[size=3xl]:max-w-xl data-[size=3xl]:sm:max-w-2xl data-[size=3xl]:md:max-w-3xl data-[size=3xl]:lg:max-w-4xl data-[size=3xl]:xl:max-w-5xl",
          className
        )}
        style={{ zIndex: Z_INDEX_LAYERS.modalContent }}
        {...props}
      />
    </AlertDialogPortal>
  );
}

export function AlertDialogHeader({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-header"
      className={cn(
        "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
        className
      )}
      {...props}
    />
  );
}

export function AlertDialogFooter({ className, ...props }) {
  return (
    <div
      data-slot="alert-dialog-footer"
      className={cn(
        "bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    />
  );
}

export function AlertDialogTitle({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Title
      data-slot="alert-dialog-title"
      className={cn(
        "text-sm font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
        className
      )}
      {...props}
    />
  );
}

export function AlertDialogDescription({ className, ...props }) {
  return (
    <AlertDialogPrimitive.Description
      data-slot="alert-dialog-description"
      className={cn(
        "text-muted-foreground *:[a]:hover:text-foreground text-sm text-balance md:text-pretty *:[a]:underline *:[a]:underline-offset-3",
        className
      )}
      {...props}
    />
  );
}

export function AlertDialogAction({ className, ...props }) {
  return (
    <Button
      data-slot="alert-dialog-action"
      className={cn(className)}
      {...props}
    />
  );
}

export function AlertDialogCancel({
  className,
  variant = "outline",
  size = "default",
  ...props
}) {
  return (
    <AlertDialogPrimitive.Close
      data-slot="alert-dialog-cancel"
      className={cn(className)}
      render={<Button variant={variant} size={size} />}
      {...props}
    />
  );
}
