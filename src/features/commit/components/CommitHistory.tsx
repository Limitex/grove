import { GitBranch, GitMerge, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import * as commitApi from "@/api/commit";
import * as diffApi from "@/api/diff";
import * as worktreeApi from "@/api/worktree";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { CommitChangedFile, CommitEntry } from "@/types";
import { AmendDialog } from "./AmendDialog";
import { CherryPickDialog } from "./CherryPickDialog";
import { CommitFilesPanel } from "./CommitFilesPanel";
import { CommitItem } from "./CommitItem";
import { RebaseEditor } from "./RebaseEditor";
import { RevertDialog } from "./RevertDialog";
import { SquashDialog } from "./SquashDialog";

interface CommitHistoryProps {
  worktreePath: string | null;
  branchName: string | null;
  onClose: () => void;
  embedded?: boolean;
  onSelectCommit?: (sha: string) => void;
  onSelectCommitFile?: (sha: string, filePath: string) => void;
  onSelectRange?: (fromSha: string, toSha: string) => void;
  onSelectRangeFile?: (fromSha: string, toSha: string, filePath: string) => void;
}

export function CommitHistory({
  worktreePath,
  branchName,
  onClose,
  embedded,
  onSelectCommit,
  onSelectCommitFile,
  onSelectRange,
  onSelectRangeFile,
}: CommitHistoryProps) {
  const [commits, setCommits] = useState<CommitEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedShas, setSelectedShas] = useState<Set<string>>(new Set());
  const [activeSha, setActiveSha] = useState<string | null>(null);
  const [commitFiles, setCommitFiles] = useState<CommitChangedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [squashOpen, setSquashOpen] = useState(false);
  const [cherryPickCommit, setCherryPickCommit] = useState<CommitEntry | null>(null);
  const [rebaseOpen, setRebaseOpen] = useState(false);
  const [amendCommit, setAmendCommit] = useState<CommitEntry | null>(null);
  const [revertCommit, setRevertCommit] = useState<CommitEntry | null>(null);
  const [anchorSha, setAnchorSha] = useState<string | null>(null);
  const [filesHeight, setFilesHeight] = useState(150);
  const resizingFiles = useRef(false);

  const handleFilesResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingFiles.current = true;
      const startY = e.clientY;
      const startH = filesHeight;

      const onMove = (ev: MouseEvent) => {
        if (!resizingFiles.current) return;
        setFilesHeight(Math.max(60, Math.min(400, startH - (ev.clientY - startY))));
      };
      const onUp = () => {
        resizingFiles.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "row-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [filesHeight],
  );

  const fetchHistory = useCallback(async () => {
    if (!worktreePath) return;
    setLoading(true);
    try {
      const result = await worktreeApi.getCommitHistory(worktreePath, 80);
      setCommits(result);
    } catch (err) {
      setCommits([]);
      toast.error("Failed to load commit history", { description: String(err) });
    } finally {
      setLoading(false);
    }
  }, [worktreePath]);

  useEffect(() => {
    setSelectedShas(new Set());
    setAnchorSha(null);
    setActiveSha(null);
    setCommitFiles([]);
    fetchHistory();
  }, [fetchHistory]);

  const getRange = useCallback((): { fromSha: string; toSha: string } | null => {
    if (selectedShas.size < 2) return null;
    const indices = [...selectedShas]
      .map((sha) => commits.findIndex((c) => c.sha === sha))
      .filter((i) => i >= 0)
      .sort((a, b) => a - b);
    if (indices.length < 2) return null;
    const toSha = commits[indices[0]].sha;
    const oldestIdx = indices[indices.length - 1];
    if (oldestIdx + 1 >= commits.length) return null;
    const fromSha = commits[oldestIdx + 1].sha;
    return { fromSha, toSha };
  }, [selectedShas, commits]);

  useEffect(() => {
    if (!worktreePath) {
      setCommitFiles([]);
      return;
    }

    const range = getRange();
    if (selectedShas.size >= 2) {
      setFilesLoading(true);
      if (range) {
        diffApi
          .getRangeChangedFiles(worktreePath, range.fromSha, range.toSha)
          .then(setCommitFiles)
          .catch((err) => {
            setCommitFiles([]);
            toast.error("Failed to load changed files", { description: String(err) });
          })
          .finally(() => setFilesLoading(false));
      } else {
        const indices = [...selectedShas]
          .map((sha) => commits.findIndex((c) => c.sha === sha))
          .filter((i) => i >= 0)
          .sort((a, b) => a - b);
        const newestSha = commits[indices[0]]?.sha;
        if (newestSha) {
          diffApi
            .getCommitChangedFiles(worktreePath, newestSha)
            .then(setCommitFiles)
            .catch((err) => {
              setCommitFiles([]);
              toast.error("Failed to load changed files", { description: String(err) });
            })
            .finally(() => setFilesLoading(false));
        } else {
          setCommitFiles([]);
          setFilesLoading(false);
        }
      }
      return;
    }

    if (!activeSha) {
      setCommitFiles([]);
      return;
    }
    setFilesLoading(true);
    diffApi
      .getCommitChangedFiles(worktreePath, activeSha)
      .then(setCommitFiles)
      .catch((err) => {
        setCommitFiles([]);
        toast.error("Failed to load changed files", { description: String(err) });
      })
      .finally(() => setFilesLoading(false));
  }, [activeSha, selectedShas, worktreePath, getRange, commits]);

  const handleClick = useCallback(
    (sha: string, e: React.MouseEvent) => {
      if (e.shiftKey) {
        const anchor = anchorSha ?? activeSha;
        if (anchor) {
          const startIdx = commits.findIndex((c) => c.sha === anchor);
          const endIdx = commits.findIndex((c) => c.sha === sha);
          if (startIdx >= 0 && endIdx >= 0) {
            const [from, to] = startIdx < endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
            const next = new Set<string>();
            for (let i = from; i <= to; i++) next.add(commits[i].sha);
            setSelectedShas(next);
          }
        } else {
          setSelectedShas(new Set([sha]));
          setAnchorSha(sha);
        }
        setActiveSha(null);
      } else if (e.ctrlKey || e.metaKey) {
        setSelectedShas((prev) => {
          const next = new Set(prev);
          if (next.has(sha)) next.delete(sha);
          else next.add(sha);
          return next;
        });
        if (!anchorSha) setAnchorSha(sha);
        setActiveSha(null);
      } else {
        setSelectedShas(new Set());
        setAnchorSha(sha);
        const newSha = activeSha === sha ? null : sha;
        setActiveSha(newSha);
        if (newSha) requestAnimationFrame(() => onSelectCommit?.(newSha));
      }
    },
    [commits, activeSha, anchorSha, onSelectCommit],
  );

  useEffect(() => {
    if (selectedShas.size < 2) return;
    const id = requestAnimationFrame(() => {
      const range = getRange();
      if (range) {
        onSelectRange?.(range.fromSha, range.toSha);
      } else {
        const indices = [...selectedShas]
          .map((sha) => commits.findIndex((c) => c.sha === sha))
          .filter((i) => i >= 0)
          .sort((a, b) => a - b);
        const newestSha = commits[indices[0]]?.sha;
        if (newestSha) onSelectCommit?.(newestSha);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [selectedShas, getRange, onSelectRange, onSelectCommit, commits]);

  const handleComplete = useCallback(() => {
    setSquashOpen(false);
    setCherryPickCommit(null);
    setRebaseOpen(false);
    setAmendCommit(null);
    setRevertCommit(null);
    setSelectedShas(new Set());
    setAnchorSha(null);
    setActiveSha(null);
    fetchHistory();
  }, [fetchHistory]);

  const handleResetTo = useCallback(
    async (sha: string) => {
      if (!worktreePath) return;
      try {
        await commitApi.resetToCommit(worktreePath, sha);
        fetchHistory();
        toast.success("Reset completed");
      } catch (err) {
        toast.error("Reset failed", { description: String(err) });
      }
    },
    [worktreePath, fetchHistory],
  );

  const selectedCommits = useMemo(() => commits.filter((c) => selectedShas.has(c.sha)), [commits, selectedShas]);
  const canSquash = useMemo(() => {
    if (selectedShas.size < 2) return false;
    const indices = [...selectedShas].map((sha) => commits.findIndex((c) => c.sha === sha)).sort((a, b) => a - b);
    return indices[0] === 0 && indices.every((v, i) => i === 0 || v === indices[i - 1] + 1);
  }, [selectedShas, commits]);

  const range = getRange();

  const handleSelectFile = useCallback(
    (filePath: string) => {
      if (range) {
        onSelectRangeFile?.(range.fromSha, range.toSha, filePath);
      } else if (activeSha) {
        onSelectCommitFile?.(activeSha, filePath);
      }
    },
    [range, activeSha, onSelectRangeFile, onSelectCommitFile],
  );

  const content = loading ? (
    <div className="p-5 text-center text-xs text-muted-foreground animate-pulse">Loading...</div>
  ) : commits.length === 0 ? (
    <div className="p-5 text-center text-xs text-muted-foreground">No commits.</div>
  ) : (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b shrink-0 bg-muted/30">
        {selectedShas.size > 0 ? (
          <>
            <span className="text-[9px] text-muted-foreground mr-auto">{selectedShas.size} selected</span>
            <Tooltip>
              <TooltipTrigger>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-5 text-[8px] px-1.5 gap-0.5"
                  disabled={!canSquash}
                  onClick={() => setSquashOpen(true)}
                >
                  <GitMerge className="w-3 h-3" /> Squash
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {canSquash ? `Squash ${selectedShas.size} commits` : "Select consecutive commits from HEAD"}
              </TooltipContent>
            </Tooltip>
            <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setSelectedShas(new Set())}>
              <X className="w-3 h-3" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-wide">Commits</span>
            <Button
              variant="outline"
              size="sm"
              className="h-5 text-[8px] px-1.5 gap-0.5 ml-auto"
              onClick={() => setRebaseOpen(true)}
            >
              <GitBranch className="w-3 h-3" /> Rebase
            </Button>
          </>
        )}
      </div>

      {/* Commit list */}
      <div className={cn("overflow-y-auto min-h-0", "flex-1")}>
        {commits.map((c) => (
          <CommitItem
            key={c.sha}
            commit={c}
            isActive={activeSha === c.sha}
            isSelected={selectedShas.has(c.sha)}
            onClick={(e) => handleClick(c.sha, e)}
            onAmend={() => setAmendCommit(c)}
            onRevert={() => setRevertCommit(c)}
            onCherryPick={() => setCherryPickCommit(c)}
            onResetTo={() => handleResetTo(c.sha)}
          />
        ))}
      </div>

      {/* Resize handle */}
      {(activeSha || selectedShas.size >= 2) && (
        <div
          className="cursor-row-resize border-t hover:bg-primary/20 active:bg-primary/40 transition-colors"
          style={{ height: "6px", flex: "none" }}
          onMouseDown={handleFilesResize}
        />
      )}

      {/* Changed files panel */}
      {(activeSha || selectedShas.size >= 2) && (
        <CommitFilesPanel
          files={commitFiles}
          loading={filesLoading}
          activeSha={activeSha}
          range={range}
          height={filesHeight}
          onSelectFile={handleSelectFile}
        />
      )}

      {/* Dialogs */}
      {worktreePath && (
        <>
          <SquashDialog
            open={squashOpen}
            worktreePath={worktreePath}
            commits={selectedCommits}
            onComplete={handleComplete}
            onCancel={() => setSquashOpen(false)}
          />
          <CherryPickDialog
            open={!!cherryPickCommit}
            worktreePath={worktreePath}
            commit={cherryPickCommit}
            onComplete={handleComplete}
            onCancel={() => setCherryPickCommit(null)}
          />
          <RebaseEditor
            open={rebaseOpen}
            worktreePath={worktreePath}
            commits={commits.slice(0, 20)}
            onComplete={handleComplete}
            onCancel={() => setRebaseOpen(false)}
          />
          <AmendDialog
            open={!!amendCommit}
            worktreePath={worktreePath}
            commit={amendCommit}
            onComplete={handleComplete}
            onCancel={() => setAmendCommit(null)}
          />
          <RevertDialog
            open={!!revertCommit}
            worktreePath={worktreePath}
            commit={revertCommit}
            onComplete={handleComplete}
            onCancel={() => setRevertCommit(null)}
          />
        </>
      )}
    </div>
  );

  if (embedded) {
    return <div className="flex flex-col flex-1 overflow-hidden">{content}</div>;
  }

  return (
    <div className="w-80 border-l flex flex-col overflow-hidden shrink-0">
      <div className="flex items-center justify-between px-3 py-2.5 border-b">
        <h3 className="text-sm font-medium">
          History{" "}
          {branchName && (
            <span className="font-normal text-muted-foreground ml-1.5 font-mono text-xs">{branchName}</span>
          )}
        </h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>
      {content}
    </div>
  );
}
