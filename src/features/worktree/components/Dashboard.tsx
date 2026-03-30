import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ClaudeSessionMenu } from "@/features/claude";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { ViewMode, WorktreeInfo } from "@/types";
import { WorktreeCard } from "./WorktreeCard";

interface DashboardProps {
  worktrees: WorktreeInfo[];
  viewMode: ViewMode;
  selectedIndex: number;
  onSelectIndex: (index: number) => void;
  onOpenEditor: (wt: WorktreeInfo) => void;
  onOpenTerminal: (wt: WorktreeInfo) => void;
  onRemove: (wt: WorktreeInfo) => void;
  onPull: (path: string) => void;
  onPush: (path: string) => void;
  operationInProgress: Record<string, string>;
  onNew: () => void;
}

export function Dashboard({
  worktrees,
  viewMode,
  selectedIndex,
  onSelectIndex,
  onOpenEditor,
  onOpenTerminal,
  onRemove,
  onPull,
  onPush,
  operationInProgress,
  onNew,
}: DashboardProps) {
  if (worktrees.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2 p-8">
        <Search className="w-6 h-6 opacity-40" />
        <span>No worktrees found</span>
      </div>
    );
  }

  if (viewMode === "list") {
    return (
      <div className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 min-w-0">
        <div className="grid grid-cols-[minmax(120px,2fr)_minmax(70px,1fr)_80px_50px_auto] gap-2 px-2.5 py-2 text-[10px] text-muted-foreground uppercase tracking-wider border-b sticky top-0 bg-background z-10">
          <span>Branch</span>
          <span>Status</span>
          <span>Sync</span>
          <span>Last</span>
          <span>Actions</span>
        </div>
        {worktrees.map((wt, i) => {
          const op = operationInProgress[wt.path];
          const dotColor =
            wt.status.conflicted > 0 ? "bg-destructive" : !wt.status.is_clean ? "bg-grove-amber" : "bg-primary";
          return (
            <div
              key={wt.path}
              className={cn(
                "grid grid-cols-[minmax(120px,2fr)_minmax(70px,1fr)_80px_50px_auto] gap-2 px-2.5 py-2 border-b cursor-pointer items-center text-xs transition-colors duration-100",
                i === selectedIndex ? "bg-accent/50 shadow-[inset_2px_0_0] shadow-primary" : "hover:bg-accent/20",
              )}
              onClick={() => onSelectIndex(i)}
              onDoubleClick={() => onOpenEditor(wt)}
            >
              <span className="flex items-center gap-1.5 overflow-hidden min-w-0">
                <span className={cn("w-2 h-2 rounded-full shrink-0", dotColor)} />
                <Tooltip>
                  <TooltipTrigger>
                    <span className="truncate font-medium">{wt.branch ?? `(${wt.head_short})`}</span>
                  </TooltipTrigger>
                  <TooltipContent>{wt.branch ?? wt.head_short}</TooltipContent>
                </Tooltip>
                {wt.is_main && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-grove-green-bg text-grove-green-fg shrink-0 leading-none">
                    main
                  </span>
                )}
              </span>
              <span className="text-muted-foreground font-mono text-[11px] truncate">
                {wt.status.is_clean
                  ? "clean"
                  : [
                      wt.status.staged > 0 && `${wt.status.staged}S`,
                      wt.status.modified > 0 && `${wt.status.modified}M`,
                      wt.status.untracked > 0 && `${wt.status.untracked}U`,
                    ]
                      .filter(Boolean)
                      .join(" ")}
              </span>
              <span className="flex gap-1 items-center">
                {op ? (
                  <span className="text-primary italic text-[10px] animate-pulse">{op}</span>
                ) : (
                  <>
                    <button
                      className={cn(
                        "flex items-center gap-0.5 font-mono text-[11px] transition-colors",
                        wt.status.ahead > 0 ? "text-primary hover:underline" : "text-muted-foreground/40",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (wt.status.ahead > 0) onPush(wt.path);
                      }}
                      disabled={wt.status.ahead === 0}
                    >
                      <ArrowUp className="w-3 h-3" />
                      {wt.status.ahead}
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-0.5 font-mono text-[11px] transition-colors",
                        wt.status.behind > 0 ? "text-primary hover:underline" : "text-muted-foreground/40",
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (wt.status.behind > 0) onPull(wt.path);
                      }}
                      disabled={wt.status.behind === 0}
                    >
                      <ArrowDown className="w-3 h-3" />
                      {wt.status.behind}
                    </button>
                  </>
                )}
              </span>
              <span className="text-muted-foreground text-[11px]">
                {formatRelativeTime(wt.status.last_commit_time)}
              </span>
              <span className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[9px] px-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenEditor(wt);
                  }}
                >
                  Editor
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[9px] px-1.5"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTerminal(wt);
                  }}
                >
                  Term
                </Button>
                <ClaudeSessionMenu worktreePath={wt.path} branch={wt.branch ?? ""} compact />
                {!wt.is_main && (
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-5 w-5 text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(wt);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </span>
            </div>
          );
        })}
        <Button
          variant="ghost"
          className="w-full py-3 text-xs text-muted-foreground hover:text-primary h-auto"
          onClick={onNew}
        >
          <Plus className="w-3.5 h-3.5" /> New worktree
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-2.5 p-3.5 overflow-y-auto overflow-x-hidden flex-1 min-w-0 content-start">
      {worktrees.map((wt, i) => (
        <WorktreeCard
          key={wt.path}
          worktree={wt}
          selected={i === selectedIndex}
          onSelect={() => onSelectIndex(i)}
          onOpenEditor={() => onOpenEditor(wt)}
          onOpenTerminal={() => onOpenTerminal(wt)}
          onRemove={() => onRemove(wt)}
          onPull={() => onPull(wt.path)}
          onPush={() => onPush(wt.path)}
          operation={operationInProgress[wt.path]}
        />
      ))}
      <button
        className="flex flex-col items-center justify-center min-h-[140px] border border-dashed rounded-lg text-muted-foreground hover:border-primary hover:text-primary transition-all duration-150 cursor-pointer hover:shadow-sm"
        onClick={onNew}
      >
        <Plus className="w-6 h-6 mb-1" />
        <span className="text-xs">
          New worktree <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary ml-0.5">n</kbd>
        </span>
      </button>
    </div>
  );
}
