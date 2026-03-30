import { ask } from "@tauri-apps/plugin-dialog";
import { Check, Minus, Plus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import * as commitApi from "@/api/commit";
import * as diffApi from "@/api/diff";
import * as stagingApi from "@/api/staging";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { ChangedFile, FileArea } from "@/types";
import { CommitBox } from "./CommitBox";

interface ChangedFilesListProps {
  worktreePath: string;
  onRefresh: () => void;
  selectedFile: { path: string; staged: boolean } | null;
  onSelectFile: (file: { path: string; staged: boolean } | null) => void;
}

const AREA_ORDER: FileArea[] = ["Conflicted", "Staged", "Unstaged", "Untracked"];
const AREA_LABELS: Record<FileArea, string> = {
  Staged: "Staged",
  Unstaged: "Modified",
  Untracked: "Untracked",
  Conflicted: "Conflicted",
};

const STATUS_ICONS: Record<string, string> = {
  Modified: "M",
  Added: "A",
  Deleted: "D",
  Renamed: "R",
  Untracked: "?",
  Conflicted: "!",
  TypeChanged: "T",
};

const AREA_COLORS: Record<FileArea, string> = {
  Staged: "text-grove-blue-fg",
  Unstaged: "text-grove-amber-fg",
  Untracked: "text-muted-foreground",
  Conflicted: "text-destructive",
};

export function ChangedFilesList({ worktreePath, onRefresh, selectedFile, onSelectFile }: ChangedFilesListProps) {
  const [files, setFiles] = useState<ChangedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [operating, setOperating] = useState(false);

  const fetchFiles = useCallback(async () => {
    try {
      const result = await diffApi.getChangedFiles(worktreePath);
      setFiles(result);
    } catch (err) {
      setFiles([]);
      toast.error("Failed to load changed files", { description: String(err) });
    } finally {
      setLoading(false);
    }
  }, [worktreePath]);

  useEffect(() => {
    setLoading(true);
    onSelectFile(null);
    fetchFiles();
  }, [fetchFiles, onSelectFile]);

  useEffect(() => {
    const onFocus = () => fetchFiles();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchFiles]);

  const runOp = useCallback(
    async (fn: () => Promise<void>) => {
      setOperating(true);
      try {
        await fn();
        await fetchFiles();
        onRefresh();
      } catch (err) {
        toast.error("Operation failed", { description: String(err) });
      }
      setOperating(false);
    },
    [fetchFiles, onRefresh],
  );

  const handleStage = (filePath: string) => runOp(() => stagingApi.stageFile(worktreePath, filePath));
  const handleUnstage = (filePath: string) => runOp(() => stagingApi.unstageFile(worktreePath, filePath));
  const handleStageAll = () => runOp(() => stagingApi.stageAll(worktreePath));
  const handleUnstageAll = () => runOp(() => stagingApi.unstageAll(worktreePath));

  const handleDiscard = async (filePath: string) => {
    const yes = await ask(`Discard changes to "${filePath}"?`, { title: "Discard changes", kind: "warning" });
    if (!yes) return;
    runOp(() => stagingApi.discardFile(worktreePath, filePath));
  };

  const handleCommit = async (message: string) => {
    setOperating(true);
    try {
      await commitApi.gitCommit(worktreePath, message);
      await fetchFiles();
      onRefresh();
      onSelectFile(null);
    } catch (err) {
      toast.error("Commit failed", { description: String(err) });
    }
    setOperating(false);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground">
        <span className="animate-pulse">Loading...</span>
      </div>
    );
  }

  const grouped = AREA_ORDER.map((area) => ({
    area,
    files: files.filter((f) => f.area === area),
  })).filter((g) => g.files.length > 0);

  const hasStagedFiles = files.some((f) => f.area === "Staged");
  const hasUnstagedFiles = files.some((f) => f.area === "Unstaged" || f.area === "Untracked");

  if (files.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-xs text-muted-foreground gap-1">
        <Check className="w-5 h-5 text-primary opacity-60" />
        Clean
      </div>
    );
  }

  const isSelected = (f: ChangedFile) =>
    selectedFile?.path === f.path && (f.area === "Staged") === selectedFile?.staged;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="flex-1 overflow-y-auto min-h-0">
        {grouped.map(({ area, files: areaFiles }) => (
          <div key={area}>
            <div className="flex items-center justify-between px-2 py-1 bg-muted/50 sticky top-0 z-10 border-b">
              <span
                className={cn(
                  "text-[9px] font-semibold uppercase tracking-wide flex items-center gap-1",
                  AREA_COLORS[area],
                )}
              >
                {AREA_LABELS[area]}
                <span className="text-[8px] px-1 py-0.5 rounded-full bg-muted text-muted-foreground font-medium leading-none">
                  {areaFiles.length}
                </span>
              </span>
              <div className="flex gap-0.5">
                {area === "Staged" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 text-[8px] px-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleUnstageAll()}
                    disabled={operating}
                  >
                    Unstage all
                  </Button>
                )}
                {(area === "Unstaged" || area === "Untracked") && hasUnstagedFiles && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 text-[8px] px-1 text-muted-foreground hover:text-foreground"
                    onClick={() => handleStageAll()}
                    disabled={operating}
                  >
                    Stage all
                  </Button>
                )}
              </div>
            </div>
            {areaFiles.map((f) => (
              <div
                key={`${f.area}-${f.path}`}
                className={cn(
                  "group flex items-center gap-1 px-2 py-1 cursor-pointer text-[11px] transition-colors",
                  isSelected(f) ? "bg-accent" : "hover:bg-accent/50",
                )}
                onClick={() => requestAnimationFrame(() => onSelectFile({ path: f.path, staged: f.area === "Staged" }))}
              >
                <Tooltip>
                  <TooltipTrigger>
                    <span
                      className={cn(
                        "font-mono text-[10px] font-bold w-3.5 text-center shrink-0",
                        f.status === "Modified" && "text-grove-amber-fg",
                        f.status === "Added" && "text-grove-green-fg",
                        f.status === "Deleted" && "text-destructive",
                        f.status === "Renamed" && "text-grove-blue-fg",
                        f.status === "Untracked" && "text-muted-foreground",
                        f.status === "Conflicted" && "text-destructive",
                      )}
                    >
                      {STATUS_ICONS[f.status] ?? "?"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{f.status}</TooltipContent>
                </Tooltip>
                <span className="flex-1 font-mono text-[10px] truncate min-w-0" title={f.path}>
                  {f.path}
                </span>
                <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                  {area === "Staged" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnstage(f.path);
                      }}
                      disabled={operating}
                      title="Unstage"
                    >
                      <Minus className="w-2.5 h-2.5" />
                    </Button>
                  )}
                  {(area === "Unstaged" || area === "Untracked") && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStage(f.path);
                        }}
                        disabled={operating}
                        title="Stage"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 text-destructive hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDiscard(f.path);
                        }}
                        disabled={operating}
                        title="Discard"
                      >
                        <X className="w-2.5 h-2.5" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
      {hasStagedFiles && <CommitBox onCommit={handleCommit} disabled={operating} />}
    </div>
  );
}
