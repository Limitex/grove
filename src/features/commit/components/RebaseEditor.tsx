import { GitBranch, GripVertical } from "lucide-react";
import { useState } from "react";
import * as rebaseApi from "@/api/rebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { CommitEntry, RebaseAction, RebaseActionType } from "@/types";

interface RebaseEditorProps {
  open: boolean;
  worktreePath: string;
  commits: CommitEntry[];
  onComplete: () => void;
  onCancel: () => void;
}

interface RebaseItem {
  commit: CommitEntry;
  action: RebaseActionType;
}

const ACTION_COLORS: Record<RebaseActionType, string> = {
  Pick: "text-primary",
  Reword: "text-grove-blue-fg",
  Squash: "text-grove-amber-fg",
  Drop: "text-destructive",
};

export function RebaseEditor({ open, worktreePath, commits, onComplete, onCancel }: RebaseEditorProps) {
  const [items, setItems] = useState<RebaseItem[]>(() =>
    commits.map((c) => ({ commit: c, action: "Pick" as RebaseActionType })),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const handleActionChange = (index: number, action: RebaseActionType) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, action } : item)));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const handleSubmit = async () => {
    const actions: RebaseAction[] = items.map((item) => ({
      sha: item.commit.sha,
      action: item.action,
      message: null,
    }));

    // onto = parent of the oldest commit in the original list
    const onto = `HEAD~${commits.length}`;

    setLoading(true);
    setError(null);
    try {
      await rebaseApi.interactiveRebase(worktreePath, onto, actions);
      onComplete();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = items.some((item, i) => item.action !== "Pick" || item.commit.sha !== commits[i]?.sha);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Interactive rebase — {commits.length} commits
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto border rounded-md">
          {items.map((item, i) => (
            <div
              key={item.commit.sha}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDragEnd={handleDragEnd}
              className={cn(
                "flex items-center gap-2 px-2 py-1.5 border-b last:border-b-0 transition-colors",
                dragIndex === i && "bg-accent/50",
                item.action === "Drop" && "opacity-40",
              )}
            >
              <GripVertical className="w-3.5 h-3.5 text-muted-foreground cursor-grab shrink-0" />

              <Select value={item.action} onValueChange={(v) => handleActionChange(i, v as RebaseActionType)}>
                <SelectTrigger
                  className={cn("h-6 w-20 text-[10px] font-mono font-bold px-1.5", ACTION_COLORS[item.action])}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pick" className="text-xs font-mono">
                    pick
                  </SelectItem>
                  <SelectItem value="Reword" className="text-xs font-mono">
                    reword
                  </SelectItem>
                  <SelectItem value="Squash" className="text-xs font-mono">
                    squash
                  </SelectItem>
                  <SelectItem value="Drop" className="text-xs font-mono text-destructive">
                    drop
                  </SelectItem>
                </SelectContent>
              </Select>

              <span className="font-mono text-[10px] text-muted-foreground shrink-0">{item.commit.short_sha}</span>
              <span className="text-xs truncate flex-1 min-w-0">{item.commit.message}</span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground">
          Drag to reorder. Oldest commit at the bottom, newest at the top.
        </p>

        {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!hasChanges || loading}>
            {loading ? "Rebasing..." : "Start rebase"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
