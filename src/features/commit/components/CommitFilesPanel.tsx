import { memo } from "react";
import { cn } from "@/lib/utils";
import type { CommitChangedFile } from "@/types";

interface CommitFilesPanelProps {
  files: CommitChangedFile[];
  loading: boolean;
  activeSha: string | null;
  range: { fromSha: string; toSha: string } | null;
  height: number;
  onSelectFile: (filePath: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  Added: "text-grove-green-fg",
  Modified: "text-grove-amber-fg",
  Deleted: "text-destructive",
  Renamed: "text-grove-blue-fg",
};

export const CommitFilesPanel = memo(function CommitFilesPanel({
  files,
  loading,
  activeSha,
  range,
  height,
  onSelectFile,
}: CommitFilesPanelProps) {
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: `${height}px`, flex: "none" }}>
      <div className="flex items-center gap-1.5 px-2 py-1 bg-muted/40 border-b shrink-0">
        <span className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Files</span>
        {activeSha && !range && (
          <span className="text-[9px] text-muted-foreground font-mono">{activeSha.slice(0, 7)}</span>
        )}
        {range && (
          <span className="text-[9px] text-muted-foreground font-mono">
            {range.fromSha.slice(0, 7)}..{range.toSha.slice(0, 7)}
          </span>
        )}
        <span className="text-[9px] text-muted-foreground ml-auto">{files.length} changed</span>
      </div>
      <div className="overflow-y-auto min-h-0 flex-1">
        {loading ? (
          <div className="px-2 py-2 text-[9px] text-muted-foreground animate-pulse text-center">Loading...</div>
        ) : files.length === 0 ? (
          <div className="px-2 py-2 text-[9px] text-muted-foreground text-center">No files</div>
        ) : (
          files.map((f) => (
            <div
              key={f.path}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] hover:bg-accent/40 cursor-pointer transition-colors"
              onClick={() => onSelectFile(f.path)}
            >
              <span
                className={cn(
                  "font-mono font-bold w-3 text-center shrink-0",
                  STATUS_COLORS[f.status] ?? "text-muted-foreground",
                )}
              >
                {f.status[0]}
              </span>
              <span className="font-mono truncate min-w-0" title={f.path}>
                {f.path}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
});
