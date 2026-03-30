import { Badge } from "@/components/ui/badge";
import type { WorktreeStatus } from "@/types";

interface StatusBadgeProps {
  status: WorktreeStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status.conflicted > 0) {
    return (
      <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
        {status.conflicted} conflict
      </Badge>
    );
  }

  if (status.is_clean) {
    return <Badge className="bg-grove-green-bg text-grove-green-fg border-0 text-[10px] px-1.5 py-0">clean</Badge>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {status.staged > 0 && (
        <Badge className="bg-grove-blue-bg text-grove-blue-fg border-0 text-[10px] px-1.5 py-0">
          {status.staged} staged
        </Badge>
      )}
      {status.modified > 0 && (
        <Badge className="bg-grove-amber-bg text-grove-amber-fg border-0 text-[10px] px-1.5 py-0">
          {status.modified} modified
        </Badge>
      )}
      {status.untracked > 0 && (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {status.untracked} untracked
        </Badge>
      )}
    </div>
  );
}
