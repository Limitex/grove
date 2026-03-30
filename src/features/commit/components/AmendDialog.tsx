import { Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import * as commitApi from "@/api/commit";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { CommitEntry } from "@/types";

interface AmendDialogProps {
  open: boolean;
  worktreePath: string;
  commit: CommitEntry | null;
  onComplete: () => void;
  onCancel: () => void;
}

export function AmendDialog({ open, worktreePath, commit, onComplete, onCancel }: AmendDialogProps) {
  const [summary, setSummary] = useState(commit?.message ?? "");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (commit) {
      const parts = commit.message.split("\n\n");
      setSummary(parts[0] ?? "");
      setDescription(parts.slice(1).join("\n\n"));
      setError(null);
    }
  }, [commit]);

  if (!commit) return null;

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const desc = description.trim();
      const message = desc ? `${summary.trim()}\n\n${desc}` : summary.trim();
      await commitApi.amendCommit(worktreePath, message || null);
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
            <Pencil className="w-4 h-4" />
            Amend last commit
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            Amending <span className="font-mono">{commit.short_sha}</span>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Summary</Label>
            <Input value={summary} onChange={(e) => setSummary(e.target.value)} autoFocus className="h-8" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="text-xs font-mono resize-none"
            />
          </div>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Amending..." : "Amend commit"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
