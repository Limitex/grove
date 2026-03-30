import { ask } from "@tauri-apps/plugin-dialog";
import { Circle, Loader2, Plus, Power, Terminal, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import * as claudeApi from "@/api/claude";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useGroveStore } from "@/store";
import type { WorktreeInfo } from "@/types";

interface ClaudeSessionsPanelProps {
  worktrees: WorktreeInfo[];
  height: number;
  onResizeStart: (e: React.MouseEvent) => void;
}

const STATUS_CONFIG = {
  Idle: {
    icon: Circle,
    color: "text-grove-amber-fg",
    bg: "bg-grove-amber-bg",
    label: "Waiting for input",
    dot: "bg-grove-amber",
  },
  Running: { icon: Loader2, color: "text-primary", bg: "bg-primary/10", label: "Processing", dot: "bg-primary" },
  Exited: { icon: Power, color: "text-muted-foreground", bg: "", label: "Exited", dot: "bg-muted-foreground/40" },
} as const;

export function ClaudeSessionsPanel({ worktrees, height, onResizeStart }: ClaudeSessionsPanelProps) {
  const claudeSessions = useGroveStore((s) => s.claudeSessions);
  const fetchClaudeSessions = useGroveStore((s) => s.fetchClaudeSessions);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    fetchClaudeSessions();
    const timer = setInterval(fetchClaudeSessions, 2000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [fetchClaudeSessions]);

  useEffect(() => {
    const onFocus = () => fetchClaudeSessions();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchClaudeSessions]);

  const allSessions = useMemo(
    () =>
      worktrees
        .filter((wt) => claudeSessions[wt.path]?.length > 0)
        .map((wt) => ({ worktree: wt, sessions: claudeSessions[wt.path] })),
    [worktrees, claudeSessions],
  );

  const handleAttach = async (sessionName: string) => {
    try {
      await claudeApi.attachClaudeSession(sessionName);
    } catch (err) {
      toast.error("Failed to attach session", { description: String(err) });
    }
  };

  const handleKill = async (sessionName: string, displayName: string) => {
    const yes = await ask(`End session "${displayName}"?\nThis will terminate the Claude process.`, {
      title: "End Claude session",
      kind: "warning",
    });
    if (!yes) return;
    try {
      await claudeApi.killClaudeSession(sessionName);
      fetchClaudeSessions();
    } catch (err) {
      toast.error("Failed to end session", { description: String(err) });
    }
  };

  const handleNew = async (wt: WorktreeInfo) => {
    try {
      await claudeApi.openClaudeCode(wt.path, wt.branch ?? "", null);
      setTimeout(fetchClaudeSessions, 500);
    } catch (err) {
      toast.error("Failed to launch Claude session", { description: String(err) });
    }
  };

  const { totalSessions, idleCount, runningCount } = useMemo(() => {
    let total = 0;
    let idle = 0;
    let running = 0;
    for (const ws of allSessions) {
      for (const s of ws.sessions) {
        if (s.status === "Idle") {
          idle++;
          total++;
        } else if (s.status === "Running") {
          running++;
          total++;
        }
      }
    }
    return { totalSessions: total, idleCount: idle, runningCount: running };
  }, [allSessions]);

  return (
    <>
      {/* Resize handle */}
      <div
        className="cursor-row-resize border-t hover:bg-primary/20 active:bg-primary/40 transition-colors"
        style={{ height: "6px", flex: "none" }}
        onMouseDown={onResizeStart}
      />

      <div className="flex flex-col overflow-hidden" style={{ height: `${height}px`, flex: "none" }}>
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b bg-muted/30 shrink-0">
          <Terminal className="w-3.5 h-3.5 text-grove-claude-fg" />
          <span className="text-xs font-semibold">Claude Sessions</span>
          <div className="flex items-center gap-2 ml-auto text-[10px] text-muted-foreground">
            {runningCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                {runningCount} running
              </span>
            )}
            {idleCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-grove-amber animate-pulse" />
                {idleCount} waiting
              </span>
            )}
            {totalSessions === 0 && <span>No active sessions</span>}
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {allSessions.length === 0 ? (
            <div className="flex items-center justify-center h-full text-xs text-muted-foreground">
              No active Claude sessions
            </div>
          ) : (
            <div className="divide-y">
              {allSessions.map((ws) =>
                ws.sessions
                  .filter((s) => s.status !== "Exited")
                  .map((session) => {
                    const cfg = STATUS_CONFIG[session.status];
                    const StatusIcon = cfg.icon;
                    const branchName = ws.worktree.branch ?? ws.worktree.head_short;

                    return (
                      <div
                        key={session.name}
                        className={cn(
                          "flex items-center gap-3 px-3 py-1.5 hover:bg-accent/30 transition-colors cursor-pointer group",
                          cfg.bg,
                        )}
                        onClick={() => handleAttach(session.name)}
                      >
                        <StatusIcon
                          className={cn(
                            "w-3.5 h-3.5 shrink-0",
                            cfg.color,
                            session.status === "Running" && "animate-spin",
                          )}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-medium truncate">{branchName}</span>
                            <span className="text-[10px] text-muted-foreground truncate">
                              {session.label || `#${session.index}`}
                            </span>
                          </div>
                        </div>
                        <Tooltip>
                          <TooltipTrigger>
                            <span className={cn("text-[10px] shrink-0", cfg.color)}>
                              {session.status === "Idle"
                                ? "Waiting"
                                : session.status === "Running"
                                  ? "Running"
                                  : "Exited"}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>{cfg.label}</TooltipContent>
                        </Tooltip>
                        <div className="flex gap-0.5 opacity-60 group-hover:opacity-100 transition-opacity shrink-0">
                          <Tooltip>
                            <TooltipTrigger>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleKill(session.name, session.label || `Session ${session.index}`);
                                }}
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>End session</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  }),
              )}
            </div>
          )}
        </div>

        {/* Quick launch for worktrees */}
        {worktrees.length > 0 && (
          <div className="flex items-center gap-1 px-3 py-1 border-t bg-muted/20 shrink-0 overflow-x-auto">
            <span className="text-[9px] text-muted-foreground shrink-0">Launch:</span>
            {worktrees.slice(0, 6).map((wt) => (
              <Button
                key={wt.path}
                variant="ghost"
                size="sm"
                className="h-5 text-[9px] px-1.5 text-grove-claude-fg hover:bg-grove-claude-bg shrink-0"
                onClick={() => handleNew(wt)}
              >
                <Plus className="w-2.5 h-2.5 mr-0.5" />
                {wt.branch ?? wt.head_short}
              </Button>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
