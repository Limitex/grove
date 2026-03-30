import { CherryIcon } from "lucide-react";
import { useState } from "react";
import * as rebaseApi from "@/api/rebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CommitEntry } from "@/types";

interface CherryPickDialogProps {
  open: boolean;
  worktreePath: string;
  commit: CommitEntry | null;
  onComplete: () => void;
  onCancel: () => void;
}

export function CherryPickDialog({ open, worktreePath, commit, onComplete, onCancel }: CherryPickDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!commit) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      await rebaseApi.cherryPick(worktreePath, commit.sha);
      onComplete();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CherryIcon className="w-4 h-4" />
            Cherry-pick commit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <div className="border rounded-md p-3">
            <div className="text-sm font-medium">{commit.message}</div>
            <div className="flex gap-2 text-[11px] text-muted-foreground mt-1">
              <span className="font-mono">{commit.short_sha}</span>
              <span>{commit.author_name}</span>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">
            This will apply the changes from this commit onto the current branch.
          </p>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Applying..." : "Cherry-pick"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
