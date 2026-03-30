import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as worktreeApi from "@/api/worktree";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CreateWorktreeArgs } from "@/types";

interface CreateDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (args: CreateWorktreeArgs) => Promise<void>;
}

export function CreateDialog({ open, onClose, onCreate }: CreateDialogProps) {
  const [branches, setBranches] = useState<string[]>([]);
  const [branchInput, setBranchInput] = useState("");
  const [createNewBranch, setCreateNewBranch] = useState(false);
  const [baseRef, setBaseRef] = useState("");
  const [customPath, setCustomPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      worktreeApi
        .listBranches()
        .then(setBranches)
        .catch((err) => {
          setBranches([]);
          toast.error("Failed to load branches", { description: String(err) });
        });
      setBranchInput("");
      setCreateNewBranch(false);
      setBaseRef("");
      setCustomPath("");
      setError(null);
    }
  }, [open]);

  const filteredBranches = branches.filter((b) => b.toLowerCase().includes(branchInput.toLowerCase()));
  const branchExists = branches.includes(branchInput);

  const handleSubmit = useCallback(async () => {
    if (!branchInput.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await onCreate({
        branch: branchInput.trim(),
        path: customPath.trim() || null,
        create_branch: createNewBranch || !branchExists,
        base_ref: baseRef.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, [branchInput, customPath, createNewBranch, branchExists, baseRef, onCreate, onClose]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>New worktree</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Branch</Label>
            <Input
              placeholder="Branch name or select below..."
              value={branchInput}
              onChange={(e) => setBranchInput(e.target.value)}
              autoFocus
              className="h-8"
            />
          </div>

          {branchInput && filteredBranches.length > 0 && !branchExists && (
            <div className="border rounded-md max-h-40 overflow-y-auto">
              {filteredBranches.slice(0, 8).map((b) => (
                <Button
                  key={b}
                  variant="ghost"
                  className="w-full justify-start text-xs font-mono h-7 rounded-none"
                  onClick={() => {
                    setBranchInput(b);
                    setCreateNewBranch(false);
                  }}
                >
                  {b}
                </Button>
              ))}
            </div>
          )}

          {branchInput && !branchExists && (
            <p className="text-xs text-muted-foreground">
              Branch &ldquo;{branchInput}&rdquo; doesn&apos;t exist — it will be created.
            </p>
          )}

          {(createNewBranch || !branchExists) && branchInput && (
            <div className="space-y-1.5">
              <Label className="text-xs">Base (optional)</Label>
              <Input
                placeholder="HEAD (default)"
                value={baseRef}
                onChange={(e) => setBaseRef(e.target.value)}
                className="h-8"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs">Directory (optional)</Label>
            <Input
              placeholder="Auto-generated from branch name"
              value={customPath}
              onChange={(e) => setCustomPath(e.target.value)}
              className="h-8"
            />
          </div>

          {error && <div className="text-xs text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md">{error}</div>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!branchInput.trim() || loading}>
            {loading ? "Creating..." : "Create worktree"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
