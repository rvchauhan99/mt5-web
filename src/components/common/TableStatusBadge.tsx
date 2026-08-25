import { Badge } from "@/components/ui/Badge";
import { getStatusBadgeConfig } from "@/lib/tableStylePresets";

type Props = {
  status?: string;
};

export function TableStatusBadge({ status }: Props) {
  const config = getStatusBadgeConfig(status);
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
