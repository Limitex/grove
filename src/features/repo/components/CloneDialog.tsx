import { GitBranch } from "lucide-react";
import { useCallback, useState } from "react";
import * as cloneApi from "@/api/clone";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface CloneDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: (barePath: string) => void;
}

export function CloneDialog({ open, onClose, onComplete }: CloneDialogProps) {
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const barePath = await cloneApi.cloneRepo(url.trim(), name.trim() || null);
      onComplete(barePath);
      setUrl("");
      setName("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [url, name, onComplete]);

  // Extract repo name from URL for preview
  const previewName = name.trim() || extractName(url.trim());

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
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !loading) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitBranch className="w-4 h-4" />
            Clone repository
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Repository URL</Label>
            <Input
              placeholder="https://github.com/user/repo.git"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              autoFocus
              className="h-8 font-mono text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Directory name (optional)</Label>
            <Input
              placeholder={previewName || "Auto-detect from URL"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-8"
            />
          </div>

          {previewName && (
            <div className="text-[10px] text-muted-foreground font-mono bg-muted/50 rounded px-2 py-1.5">
              <div>~/Documents/Grove/{previewName}/.bare</div>
              <div>~/Documents/Grove/{previewName}/main/</div>
            </div>
          )}

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!url.trim() || loading}>
            {loading ? "Cloning..." : "Clone"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function extractName(url: string): string {
  if (!url) return "";
  return (
    url
      .trim()
      .replace(/\/$/, "")
      .split("/")
      .pop()
      ?.replace(/\.git$/, "") ?? ""
  );
}
