import { FolderTree } from "lucide-react";
import { useCallback, useState } from "react";
import * as cloneApi from "@/api/clone";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ConvertBareDialogProps {
  open: boolean;
  repoPath: string | null;
  onClose: () => void;
  onConvert: (repoPath: string) => void;
  onSkip: (repoPath: string) => void;
}

export function ConvertBareDialog({ open, repoPath, onClose, onConvert, onSkip }: ConvertBareDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const repoName = repoPath?.split("/").pop() ?? "";
  const branch = "main";

  const handleConvert = useCallback(async () => {
    if (!repoPath) return;
    setLoading(true);
    setError(null);
    try {
      const result = await cloneApi.convertToBare(repoPath!);
      onConvert(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [repoPath, onConvert]);

  const handleSkip = useCallback(() => {
    if (repoPath) onSkip(repoPath);
  }, [repoPath, onSkip]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          onClose();
          setError(null);
        }
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderTree className="w-4 h-4" />
            Convert to worktree structure?
          </DialogTitle>
          <DialogDescription className="text-xs">
            Grove works best with a bare repository structure that supports multiple worktrees.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="text-xs text-muted-foreground">
            This will restructure <span className="font-mono font-medium text-foreground">{repoName}</span> for
            worktree-based workflow:
          </div>

          <div className="text-[10px] font-mono bg-muted/50 rounded px-2.5 py-2 space-y-0.5">
            <div className="text-muted-foreground">Before:</div>
            <div>&nbsp; {repoName}/</div>
            <div>&nbsp; &nbsp; .git/</div>
            <div>&nbsp; &nbsp; src/, ...</div>
            <div className="text-muted-foreground mt-1.5">After:</div>
            <div>&nbsp; {repoName}/</div>
            <div>&nbsp; &nbsp; .bare/</div>
            <div>&nbsp; &nbsp; {branch}/</div>
            <div>&nbsp; &nbsp; &nbsp; src/, ...</div>
          </div>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter className="gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkip}
            disabled={loading}
            className="text-muted-foreground mr-auto"
          >
            Add without converting
          </Button>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleConvert} disabled={loading}>
            {loading ? "Converting..." : "Convert"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
