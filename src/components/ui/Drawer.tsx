"use client";

type Props = {
  open: boolean;
  title: string;
  side?: "left" | "right";
  children: React.ReactNode;
  onClose: () => void;
};

export function Drawer({ open, title, side = "right", children, onClose }: Props) {
  if (!open) return null;
  const sideClass = side === "right" ? "right-0 border-l" : "left-0 border-r";
  return (
    <div className="fixed inset-0 z-50 bg-black/20">
      <div className={`absolute inset-y-0 ${sideClass} w-full max-w-md border-border bg-surface-card p-4 shadow-xl`}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button className="text-sm text-text-secondary hover:text-foreground" onClick={onClose}>
            Close
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
