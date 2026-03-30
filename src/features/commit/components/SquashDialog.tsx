import { GitMerge } from "lucide-react";
import { useState } from "react";
import * as rebaseApi from "@/api/rebase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommitEntry } from "@/types";

interface SquashDialogProps {
  open: boolean;
  worktreePath: string;
  commits: CommitEntry[];
  onComplete: () => void;
  onCancel: () => void;
}

export function SquashDialog({ open, worktreePath, commits, onComplete, onCancel }: SquashDialogProps) {
  const defaultMessage = commits.map((c) => `- ${c.message}`).join("\n");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState(defaultMessage);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const trimmed = summary.trim();
    if (!trimmed) return;
    const desc = description.trim();
    const message = desc ? `${trimmed}\n\n${desc}` : trimmed;

    setLoading(true);
    setError(null);
    try {
      await rebaseApi.squashCommits(worktreePath, commits.length, message);
      onComplete();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="w-4 h-4" />
            Squash {commits.length} commits
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground border rounded-md p-2 max-h-32 overflow-y-auto">
            {commits.map((c) => (
              <div key={c.sha} className="flex gap-2 py-0.5">
                <span className="font-mono text-[10px] text-muted-foreground shrink-0">{c.short_sha}</span>
                <span className="truncate">{c.message}</span>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">New commit summary</Label>
            <Input
              placeholder="Squashed commit message..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoFocus
              className="h-8"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="text-xs font-mono resize-none"
            />
          </div>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!summary.trim() || loading}>
            {loading ? "Squashing..." : `Squash ${commits.length} commits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
