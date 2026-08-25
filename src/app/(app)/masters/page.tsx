"use client";

import { SuperadminGate } from "@/components/layout/SuperadminGate";
import { MastersPageClient } from "@/modules/masters/components/MastersPageClient";

export default function MastersPage() {
  return (
    <SuperadminGate>
      <MastersPageClient />
    </SuperadminGate>
  );
}
