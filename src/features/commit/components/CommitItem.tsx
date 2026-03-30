import { Cherry, ClipboardCopy, Copy, MoreHorizontal, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { memo } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { CommitEntry } from "@/types";

interface CommitItemProps {
  commit: CommitEntry;
  isActive: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onAmend: () => void;
  onRevert: () => void;
  onCherryPick: () => void;
  onResetTo: () => void;
}

export const CommitItem = memo(function CommitItem({
  commit,
  isActive,
  isSelected,
  onClick,
  onAmend,
  onRevert,
  onCherryPick,
  onResetTo,
}: CommitItemProps) {
  return (
    <div
      className={cn(
        "group flex gap-1.5 px-2 py-1 transition-colors cursor-pointer",
        commit.is_head && !isActive && !isSelected && "bg-grove-green-bg/30",
        isSelected && "bg-accent",
        isActive && "bg-accent/70",
        !isActive && !isSelected && "hover:bg-accent/30",
      )}
      onClick={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      onMouseDown={(e) => {
        if (e.shiftKey) e.preventDefault();
      }}
    >
      <div className="flex flex-col items-center w-2.5 pt-1 shrink-0">
        <span
          className={cn("w-1.5 h-1.5 rounded-full shrink-0", commit.is_head ? "bg-primary" : "bg-muted-foreground/40")}
        />
        <span className="w-px flex-1 bg-border mt-0.5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[11px] truncate">{commit.message}</div>
        <div className="flex gap-1.5 text-[9px] text-muted-foreground">
          <span className="font-mono">{commit.short_sha}</span>
          <span className="truncate">{commit.author_name}</span>
          <span className="shrink-0">{formatRelativeTime(commit.timestamp)}</span>
        </div>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="w-3 h-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {commit.is_head && (
            <DropdownMenuItem onClick={onAmend} className="text-xs gap-2">
              <Pencil className="w-3.5 h-3.5" /> Amend
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onRevert} className="text-xs gap-2">
            <Undo2 className="w-3.5 h-3.5" /> Revert
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onCherryPick} className="text-xs gap-2">
            <Cherry className="w-3.5 h-3.5" /> Cherry-pick
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onResetTo} className="text-xs gap-2 text-destructive">
            <RotateCcw className="w-3.5 h-3.5" /> Reset to here
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(commit.sha)} className="text-xs gap-2">
            <Copy className="w-3.5 h-3.5" /> Copy SHA
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigator.clipboard.writeText(commit.message)} className="text-xs gap-2">
            <ClipboardCopy className="w-3.5 h-3.5" /> Copy message
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});
