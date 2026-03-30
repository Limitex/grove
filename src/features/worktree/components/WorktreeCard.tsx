import { ArrowDown, ArrowUp, X } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClaudeSessionMenu } from "@/features/claude";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { WorktreeInfo } from "@/types";
import { StatusBadge } from "./StatusBadge";

interface WorktreeCardProps {
  worktree: WorktreeInfo;
  selected: boolean;
  onSelect: () => void;
  onOpenEditor: () => void;
  onOpenTerminal: () => void;
  onRemove: () => void;
  onPull: () => void;
  onPush: () => void;
  operation?: string;
}

export const WorktreeCard = memo(function WorktreeCard({
  worktree,
  selected,
  onSelect,
  onOpenEditor,
  onOpenTerminal,
  onRemove,
  onPull,
  onPush,
  operation,
}: WorktreeCardProps) {
  const branchName = worktree.branch ?? `(${worktree.head_short})`;
  const relTime = formatRelativeTime(worktree.status.last_commit_time);
  const { ahead, behind } = worktree.status;

  const dotColor =
    worktree.status.conflicted > 0 ? "bg-destructive" : !worktree.status.is_clean ? "bg-grove-amber" : "bg-primary";

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-2 p-3 border rounded-lg cursor-pointer transition-all duration-150 min-w-0 overflow-hidden",
        selected
          ? "border-primary ring-1 ring-primary bg-accent/30"
          : "hover:border-muted-foreground/30 hover:shadow-sm",
      )}
      onClick={onSelect}
      onDoubleClick={onOpenEditor}
    >
      <div className="flex items-center gap-1.5 absolute top-2 right-2">
        {worktree.label && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-grove-blue-bg text-grove-blue-fg leading-none">
            {worktree.label}
          </span>
        )}
        {worktree.is_main && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-grove-green-bg text-grove-green-fg font-medium uppercase tracking-wide leading-none">
            main
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 pr-12">
        <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
        <span className="text-sm font-medium truncate" title={branchName}>
          {branchName}
        </span>
      </div>

      <StatusBadge status={worktree.status} />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        {operation ? (
          <span className="text-primary italic animate-pulse">{operation}</span>
        ) : (
          <div className="flex gap-2">
            <button
              className={cn(
                "flex items-center gap-0.5 font-mono transition-colors",
                ahead > 0 ? "text-primary hover:underline cursor-pointer" : "opacity-40 cursor-default",
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (ahead > 0) onPush();
              }}
              disabled={ahead === 0}
              title={ahead > 0 ? "Push" : "Up to date"}
            >
              <ArrowUp className="w-3 h-3" />
              {ahead}
            </button>
            <button
              className={cn(
                "flex items-center gap-0.5 font-mono transition-colors",
                behind > 0 ? "text-primary hover:underline cursor-pointer" : "opacity-40 cursor-default",
              )}
              onClick={(e) => {
                e.stopPropagation();
                if (behind > 0) onPull();
              }}
              disabled={behind === 0}
              title={behind > 0 ? "Pull" : "Up to date"}
            >
              <ArrowDown className="w-3 h-3" />
              {behind}
            </button>
          </div>
        )}
        <Tooltip>
          <TooltipTrigger>
            <span className="cursor-default">{relTime}</span>
          </TooltipTrigger>
          <TooltipContent>{worktree.status.last_commit_message || "No commit message"}</TooltipContent>
        </Tooltip>
      </div>

      <Tooltip>
        <TooltipTrigger>
          <div className="text-[10px] text-muted-foreground font-mono truncate text-left">
            {shortenPath(worktree.path)}
          </div>
        </TooltipTrigger>
        <TooltipContent>{worktree.path}</TooltipContent>
      </Tooltip>

      <div
        className={cn(
          "flex gap-1 transition-opacity duration-150",
          selected ? "opacity-100" : "opacity-60 group-hover:opacity-100",
        )}
      >
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={(e) => {
            e.stopPropagation();
            onOpenEditor();
          }}
        >
          Editor
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-6 text-[10px] px-2"
          onClick={(e) => {
            e.stopPropagation();
            onOpenTerminal();
          }}
        >
          Term
        </Button>
        <ClaudeSessionMenu worktreePath={worktree.path} branch={worktree.branch ?? ""} />
        {!worktree.is_main && (
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="outline"
                size="icon"
                className="h-6 w-6 text-destructive hover:bg-destructive/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Remove worktree</TooltipContent>
          </Tooltip>
        )}
      </div>
    </div>
  );
});

function shortenPath(path: string): string {
  const home = path.replace(/^\/home\/[^/]+/, "~");
  const parts = home.split("/");
  if (parts.length <= 4) return home;
  return `${parts[0]}/.../${parts.slice(-2).join("/")}`;
}
