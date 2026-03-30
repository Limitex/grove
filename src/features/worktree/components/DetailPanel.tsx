import { useCallback, useRef, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChangedFilesList, CommitHistory } from "@/features/commit";
import type { DiffSource } from "@/features/diff";
import { DiffPane } from "@/features/diff";
import type { WorktreeInfo } from "@/types";

interface DetailPanelProps {
  worktree: WorktreeInfo;
  onRefresh: () => void;
  width?: number;
}

type LeftTab = "changes" | "commits";

export function DetailPanel({ worktree, onRefresh, width }: DetailPanelProps) {
  const branchName = worktree.branch ?? `(${worktree.head_short})`;
  const [leftTab, setLeftTab] = useState<LeftTab>("changes");
  const [diffSource, setDiffSource] = useState<DiffSource | null>(null);
  const [leftWidth, setLeftWidth] = useState(220);
  const resizingH = useRef(false);

  const [selectedWorkingFile, setSelectedWorkingFile] = useState<{ path: string; staged: boolean } | null>(null);

  const handleSelectWorkingFile = useCallback((file: { path: string; staged: boolean } | null) => {
    setSelectedWorkingFile(file);
    setDiffSource(file ? { type: "working", filePath: file.path, staged: file.staged } : null);
  }, []);

  const handleSelectCommit = useCallback((sha: string) => {
    setSelectedWorkingFile(null);
    setDiffSource({ type: "commit-full", sha });
  }, []);

  const handleSelectCommitFile = useCallback((sha: string, filePath: string) => {
    setSelectedWorkingFile(null);
    setDiffSource({ type: "commit", sha, filePath });
  }, []);

  const handleSelectRange = useCallback((fromSha: string, toSha: string) => {
    setSelectedWorkingFile(null);
    setDiffSource({ type: "range-full", fromSha, toSha });
  }, []);

  const handleSelectRangeFile = useCallback((fromSha: string, toSha: string, filePath: string) => {
    setSelectedWorkingFile(null);
    setDiffSource({ type: "range-file", fromSha, toSha, filePath });
  }, []);

  // Horizontal resize (left / right)
  const handleHResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizingH.current = true;
      const startX = e.clientX;
      const startW = leftWidth;
      const panelW = width ?? 560;

      const onMove = (ev: MouseEvent) => {
        if (!resizingH.current) return;
        setLeftWidth(Math.max(150, Math.min(panelW * 0.55, startW + (ev.clientX - startX))));
      };
      const onUp = () => {
        resizingH.current = false;
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [leftWidth, width],
  );

  return (
    <div className="flex flex-col overflow-hidden shrink-0 min-w-0" style={{ width: `${width ?? 560}px` }}>
      <div className="flex flex-1 overflow-hidden">
        {/* Left pane */}
        <div className="flex flex-col overflow-hidden" style={{ width: `${leftWidth}px`, minWidth: "150px" }}>
          {/* Tab bar + branch */}
          <div className="flex items-center gap-2 px-2 py-1.5 border-b shrink-0">
            <Tabs value={leftTab} onValueChange={(v) => setLeftTab(v as LeftTab)} className="flex-none">
              <TabsList className="h-6 p-0.5">
                <TabsTrigger value="changes" className="text-[10px] px-2 h-5">
                  Changes
                </TabsTrigger>
                <TabsTrigger value="commits" className="text-[10px] px-2 h-5">
                  Commits
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <span className="text-[10px] font-mono text-muted-foreground truncate flex-1 min-w-0" title={branchName}>
              {branchName}
            </span>
          </div>

          {/* Tab content */}
          {leftTab === "changes" ? (
            <ChangedFilesList
              worktreePath={worktree.path}
              onRefresh={onRefresh}
              selectedFile={selectedWorkingFile}
              onSelectFile={handleSelectWorkingFile}
            />
          ) : (
            <CommitHistory
              worktreePath={worktree.path}
              branchName={worktree.branch}
              onClose={() => {}}
              embedded
              onSelectCommit={handleSelectCommit}
              onSelectCommitFile={handleSelectCommitFile}
              onSelectRange={handleSelectRange}
              onSelectRangeFile={handleSelectRangeFile}
            />
          )}
        </div>

        {/* Horizontal resize handle */}
        <div
          className="w-2 cursor-col-resize shrink-0 border-l hover:bg-primary/20 active:bg-primary/40 transition-colors"
          onMouseDown={handleHResize}
        />

        {/* Right pane: diff */}
        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <DiffPane worktreePath={worktree.path} source={diffSource} />
        </div>
      </div>
    </div>
  );
}
