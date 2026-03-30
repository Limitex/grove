import { ChevronDown, ChevronRight, FileCode2 } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { List } from "react-window";
import { toast } from "sonner";
import * as diffApi from "@/api/diff";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { FileDiff } from "@/types";
import type { HighlightedLine } from "../hooks/useHighlighter";
import { useHighlighter } from "../hooks/useHighlighter";

const MAX_VISIBLE_LINES = 300;
const LINE_HEIGHT = 20;
const ESTIMATED_FILE_HEIGHT = 200;

export type DiffSource =
  | { type: "working"; filePath: string; staged: boolean }
  | { type: "commit"; sha: string; filePath: string }
  | { type: "commit-full"; sha: string }
  | { type: "range-full"; fromSha: string; toSha: string }
  | { type: "range-file"; fromSha: string; toSha: string; filePath: string };

interface DiffPaneProps {
  worktreePath: string;
  source: DiffSource | null;
}

export function DiffPane({ worktreePath, source }: DiffPaneProps) {
  const [diffs, setDiffs] = useState<FileDiff[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [expandedAll, setExpandedAll] = useState<Set<string>>(new Set());
  const { highlightLines } = useHighlighter();
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);
  const requestId = useRef(0);

  const isFull = source?.type === "commit-full" || source?.type === "range-full";

  useEffect(() => {
    if (!source) {
      setDiffs([]);
      setLoading(false);
      return;
    }

    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    setCollapsed(new Set());
    setExpandedAll(new Set());
    highlightedRef.current = new Set();

    (async () => {
      try {
        let result: FileDiff[];
        if (source.type === "working") {
          result = [await diffApi.getFileDiff(worktreePath, source.filePath, source.staged)];
        } else if (source.type === "commit") {
          result = [await diffApi.getCommitFileDiff(worktreePath, source.sha, source.filePath)];
        } else if (source.type === "commit-full") {
          result = await diffApi.getCommitFullDiff(worktreePath, source.sha);
        } else if (source.type === "range-full") {
          result = await diffApi.getRangeFullDiff(worktreePath, source.fromSha, source.toSha);
        } else if (source.type === "range-file") {
          result = [await diffApi.getRangeFileDiff(worktreePath, source.fromSha, source.toSha, source.filePath)];
        } else {
          result = [];
        }
        if (id === requestId.current) {
          setDiffs(result);
          // Full mode: all files expanded by default (no collapse)
          setLoading(false);
        }
      } catch (err) {
        if (id === requestId.current) {
          setError(String(err));
          setLoading(false);
          toast.error("Failed to load diff", { description: String(err) });
        }
      }
    })();
  }, [worktreePath, source]);

  const [highlighted, setHighlighted] = useState<Record<string, HighlightedLine[]>>({});
  const highlightedRef = useRef<Set<string>>(new Set());

  // Track which files have entered the viewport (for lazy highlighting)
  const [enteredPaths, setEnteredPaths] = useState<Set<string>>(new Set());

  const visiblePaths = useMemo(() => {
    return diffs
      .filter((d) => !collapsed.has(d.path) && !d.is_binary && d.hunks.length > 0 && enteredPaths.has(d.path))
      .map((d) => d.path);
  }, [diffs, collapsed, enteredPaths]);

  // For non-full mode, all files are "entered" immediately
  useEffect(() => {
    if (!isFull && diffs.length > 0) {
      setEnteredPaths(new Set(diffs.map((d) => d.path)));
    }
  }, [isFull, diffs]);

  const handleFileEnterViewport = useCallback((path: string) => {
    setEnteredPaths((prev) => {
      if (prev.has(path)) return prev;
      const next = new Set(prev);
      next.add(path);
      return next;
    });
  }, []);

  useEffect(() => {
    if (diffs.length === 0 || visiblePaths.length === 0) {
      setHighlighted({});
      return;
    }
    let cancelled = false;

    (async () => {
      const result: Record<string, HighlightedLine[]> = {};
      for (const fileDiff of diffs) {
        if (cancelled) return;
        if (!visiblePaths.includes(fileDiff.path)) continue;
        if (fileDiff.is_binary || fileDiff.hunks.length === 0) continue;
        if (highlightedRef.current.has(fileDiff.path)) continue;
        const allLines = fileDiff.hunks.flatMap((h) => h.lines.map((l) => l.content.replace(/[\n\r]/g, "")));
        const tokens = await highlightLines(allLines, fileDiff.path, isDark);
        if (tokens) result[fileDiff.path] = tokens;
      }
      if (!cancelled && Object.keys(result).length > 0) {
        for (const key of Object.keys(result)) {
          highlightedRef.current.add(key);
        }
        setHighlighted((prev) => ({ ...prev, ...result }));
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diffs, visiblePaths, highlightLines, isDark]);

  const toggleCollapse = useCallback((path: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  const expandAll = useCallback(() => setCollapsed(new Set()), []);
  const collapseAll = useCallback(() => setCollapsed(new Set(diffs.map((d) => d.path))), [diffs]);

  const toggleExpandAll = useCallback((path: string) => {
    setExpandedAll((prev) => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  }, []);

  if (!source) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground gap-2">
        <FileCode2 className="w-8 h-8 opacity-30" />
        <span>Select a file to view changes</span>
      </div>
    );
  }

  const label =
    source.type === "working"
      ? source.staged
        ? "staged"
        : "unstaged"
      : source.type === "range-full" || source.type === "range-file"
        ? `${source.fromSha.slice(0, 7)}..${source.toSha.slice(0, 7)}`
        : "sha" in source
          ? source.sha.slice(0, 7)
          : "";

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {!isFull && diffs.length === 1 && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0">
          <span className="flex-1 font-mono text-[11px] truncate min-w-0" title={diffs[0]?.path}>
            {diffs[0]?.path}
          </span>
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {label}
          </Badge>
        </div>
      )}

      {isFull && (
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0">
          <span className="text-xs text-muted-foreground">{diffs.length} files changed</span>
          <div className="flex items-center gap-1 ml-auto">
            <button
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1"
              onClick={expandAll}
            >
              Expand all
            </button>
            <span className="text-muted-foreground/30">|</span>
            <button
              className="text-[9px] text-muted-foreground hover:text-foreground transition-colors px-1"
              onClick={collapseAll}
            >
              Collapse all
            </button>
          </div>
          <Badge variant="secondary" className="text-[9px] shrink-0">
            {label}
          </Badge>
        </div>
      )}

      <div className="flex-1 overflow-y-auto min-h-0 relative">
        {loading && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <span className="text-sm text-muted-foreground animate-pulse">Loading diff...</span>
          </div>
        )}
        <div className="font-mono text-[12px] leading-[20px]">
          {error ? (
            <div className="p-5 text-center text-destructive text-xs">Error: {error}</div>
          ) : diffs.length === 0 && !loading ? (
            <div className="p-5 text-center text-muted-foreground">No changes</div>
          ) : (
            diffs.map((fileDiff) => (
              <LazyFileDiff
                key={fileDiff.path}
                fileDiff={fileDiff}
                isFull={isFull}
                collapsed={collapsed.has(fileDiff.path)}
                onToggle={() => toggleCollapse(fileDiff.path)}
                tokens={highlighted[fileDiff.path]}
                showAll={expandedAll.has(fileDiff.path)}
                onToggleShowAll={() => toggleExpandAll(fileDiff.path)}
                onEnterViewport={handleFileEnterViewport}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

/** Wrapper that uses IntersectionObserver to lazily render file diffs */
const LazyFileDiff = memo(function LazyFileDiff({
  fileDiff,
  isFull,
  collapsed,
  onToggle,
  tokens,
  showAll,
  onToggleShowAll,
  onEnterViewport,
}: {
  fileDiff: FileDiff;
  isFull: boolean;
  collapsed: boolean;
  onToggle: () => void;
  tokens?: HighlightedLine[];
  showAll: boolean;
  onToggleShowAll: () => void;
  onEnterViewport: (path: string) => void;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [hasEntered, setHasEntered] = useState(!isFull);

  // Sync hasEntered when isFull changes (e.g. switching between commits tab and changes tab)
  useEffect(() => {
    if (!isFull) {
      setHasEntered(true);
    }
  }, [isFull]);

  useEffect(() => {
    if (hasEntered || !isFull) return;
    const el = sentinelRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEntered(true);
            onEnterViewport(fileDiff.path);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEntered, isFull, fileDiff.path, onEnterViewport]);

  // Estimate height for placeholder
  const totalLines = useMemo(() => fileDiff.hunks.reduce((sum, h) => sum + h.lines.length, 0), [fileDiff]);
  const estimatedHeight = Math.min(totalLines * LINE_HEIGHT, ESTIMATED_FILE_HEIGHT);

  return (
    <div ref={sentinelRef}>
      {isFull && <FileHeader fileDiff={fileDiff} collapsed={collapsed} onToggle={onToggle} />}

      {!collapsed &&
        (hasEntered ? (
          <FileDiffContent
            fileDiff={fileDiff}
            isFull={isFull}
            tokens={tokens}
            showAll={showAll}
            onToggleShowAll={onToggleShowAll}
          />
        ) : (
          <div
            className="flex items-center justify-center text-[10px] text-muted-foreground/40"
            style={{ height: `${estimatedHeight}px` }}
          />
        ))}
    </div>
  );
});

/** Sticky file header for full-diff mode */
const FileHeader = memo(function FileHeader({
  fileDiff,
  collapsed,
  onToggle,
}: {
  fileDiff: FileDiff;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 bg-muted/60 border-y cursor-pointer hover:bg-muted/80 transition-colors sticky top-0 z-10"
      onClick={onToggle}
    >
      {collapsed ? (
        <ChevronRight className="w-3 h-3 text-muted-foreground shrink-0" />
      ) : (
        <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" />
      )}
      <span className="text-[11px] truncate flex-1 min-w-0">{fileDiff.path}</span>
      {fileDiff.is_binary && <span className="text-[9px] text-muted-foreground">binary</span>}
      {!fileDiff.is_binary && <span className="text-[9px] text-muted-foreground shrink-0">{countLines(fileDiff)}</span>}
    </div>
  );
});

/** Actual diff content for a single file */
function FileDiffContent({
  fileDiff,
  isFull,
  tokens,
  showAll,
  onToggleShowAll,
}: {
  fileDiff: FileDiff;
  isFull: boolean;
  tokens?: HighlightedLine[];
  showAll: boolean;
  onToggleShowAll: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  const totalLines = useMemo(() => fileDiff.hunks.reduce((sum, h) => sum + h.lines.length, 0), [fileDiff]);
  const useVirtualization = totalLines > 500;

  const flatLines = useMemo((): FlatDiffLine[] => {
    if (fileDiff.is_binary || fileDiff.hunks.length === 0) return [];

    const lines: FlatDiffLine[] = [];
    let tokenIdx = 0;
    const limit = !showAll && !useVirtualization ? MAX_VISIBLE_LINES : Number.MAX_SAFE_INTEGER;
    let count = 0;

    for (const hunk of fileDiff.hunks) {
      if (count >= limit) break;

      if (hunk.header) {
        lines.push({ type: "header", hunkHeader: hunk.header });
      }

      const linesToTake = Math.min(hunk.lines.length, limit - count);
      for (let i = 0; i < linesToTake; i++) {
        const line = hunk.lines[i];
        lines.push({
          type: "line",
          origin: line.origin,
          content: line.content,
          old_lineno: line.old_lineno,
          new_lineno: line.new_lineno,
          tokenIdx: tokenIdx + i,
        });
        count++;
      }
      tokenIdx += hunk.lines.length;
    }

    return lines;
  }, [fileDiff, showAll, useVirtualization]);

  const isLimited = !showAll && !useVirtualization && totalLines > MAX_VISIBLE_LINES;

  useEffect(() => {
    if (!useVirtualization || !containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerHeight(entry.contentRect.height);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [useVirtualization]);

  if (fileDiff.is_binary) {
    return !isFull ? <div className="p-5 text-center text-muted-foreground font-sans">Binary file</div> : null;
  }

  if (fileDiff.hunks.length === 0) {
    return !isFull ? <div className="p-5 text-center text-muted-foreground font-sans">No changes</div> : null;
  }

  if (useVirtualization) {
    return (
      <div ref={containerRef} style={{ height: Math.min(totalLines * LINE_HEIGHT, 600) }}>
        {containerHeight > 0 && (
          <List<VirtualDiffRowProps>
            style={{ height: containerHeight, width: "100%" }}
            rowCount={flatLines.length}
            rowHeight={LINE_HEIGHT}
            overscanCount={20}
            rowComponent={VirtualDiffRow}
            rowProps={{ flatLines, tokens }}
          />
        )}
      </div>
    );
  }

  return (
    <>
      {flatLines.map((item, i) => (
        <DiffLineRow key={i} item={item} tokens={tokens} />
      ))}
      {isLimited && (
        <div
          className="px-3 py-1.5 text-center text-[10px] text-muted-foreground hover:text-foreground bg-muted/20 hover:bg-muted/40 cursor-pointer transition-colors border-t"
          onClick={onToggleShowAll}
        >
          {totalLines - MAX_VISIBLE_LINES} more lines — click to show all
        </div>
      )}
    </>
  );
}

/** A single diff line's data for virtualization */
interface FlatDiffLine {
  type: "header" | "line";
  hunkHeader?: string;
  origin?: string;
  content?: string;
  old_lineno?: number | null;
  new_lineno?: number | null;
  tokenIdx?: number;
}

/** Render a single diff line or hunk header */
function DiffLineRow({ item, tokens }: { item: FlatDiffLine; tokens?: HighlightedLine[] }) {
  if (item.type === "header") {
    return (
      <div className="px-3 py-0.5 text-muted-foreground bg-muted/30 text-[10px]" style={{ height: LINE_HEIGHT }}>
        {item.hunkHeader}
      </div>
    );
  }

  const tokenLine = item.tokenIdx != null ? tokens?.[item.tokenIdx] : undefined;

  return (
    <div
      className={cn(
        "flex whitespace-pre",
        item.origin === "+" && "bg-grove-green-bg/60",
        item.origin === "-" && "bg-destructive/10",
      )}
      style={{ height: LINE_HEIGHT }}
    >
      <span className="w-9 text-right pr-1.5 text-muted-foreground/50 shrink-0 select-none text-[10px]">
        {item.old_lineno ?? ""}
      </span>
      <span className="w-9 text-right pr-1.5 text-muted-foreground/50 shrink-0 select-none text-[10px]">
        {item.new_lineno ?? ""}
      </span>
      <span
        className={cn(
          "w-3.5 text-center shrink-0 select-none",
          item.origin === "+" && "text-grove-green-fg/70",
          item.origin === "-" && "text-destructive/70",
          item.origin === " " && "text-muted-foreground/30",
        )}
      >
        {item.origin}
      </span>
      <span className="flex-1 min-w-0">
        {tokenLine
          ? tokenLine.map((token, ti) => (
              <span key={ti} style={{ color: token.color }}>
                {token.content.replace(/[\n\r]/g, "")}
              </span>
            ))
          : (item.content ?? "").replace(/[\n\r]/g, "")}
      </span>
    </div>
  );
}

/** Props injected via rowProps for the virtualized list */
interface VirtualDiffRowProps {
  flatLines: FlatDiffLine[];
  tokens?: HighlightedLine[];
}

/** Row component for react-window v2 virtualized list */
function VirtualDiffRow({
  index,
  style,
  flatLines,
  tokens,
}: {
  ariaAttributes: unknown;
  index: number;
  style: React.CSSProperties;
} & VirtualDiffRowProps) {
  return (
    <div style={style}>
      <DiffLineRow item={flatLines[index]} tokens={tokens} />
    </div>
  );
}

function countLines(diff: FileDiff): string {
  let added = 0;
  let removed = 0;
  for (const hunk of diff.hunks) {
    for (const line of hunk.lines) {
      if (line.origin === "+") added++;
      if (line.origin === "-") removed++;
    }
  }
  const parts = [];
  if (added > 0) parts.push(`+${added}`);
  if (removed > 0) parts.push(`-${removed}`);
  return parts.join(" ") || "0";
}
