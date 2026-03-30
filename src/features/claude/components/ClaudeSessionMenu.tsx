import { ask } from "@tauri-apps/plugin-dialog";
import { Circle, Loader2, Plus, Power, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as claudeApi from "@/api/claude";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useGroveStore } from "@/store";
import type { ClaudeSession } from "@/types";

interface ClaudeSessionMenuProps {
  worktreePath: string;
  branch: string;
  compact?: boolean;
}

const EMPTY_SESSIONS: ClaudeSession[] = [];

const STATUS_CONFIG = {
  Idle: { icon: Circle, color: "text-grove-amber-fg", label: "Waiting for input", dotColor: "bg-grove-amber" },
  Running: { icon: Loader2, color: "text-primary", label: "Processing", dotColor: "bg-primary" },
  Exited: { icon: Power, color: "text-muted-foreground", label: "Exited", dotColor: "bg-muted-foreground" },
} as const;

export function ClaudeSessionMenu({ worktreePath, branch, compact }: ClaudeSessionMenuProps) {
  const sessions = useGroveStore((s) => s.claudeSessions[worktreePath]) ?? EMPTY_SESSIONS;
  const fetchClaudeSessions = useGroveStore((s) => s.fetchClaudeSessions);
  const [nameDialogOpen, setNameDialogOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");

  const handleCreate = async (label?: string) => {
    try {
      await claudeApi.openClaudeCode(worktreePath, branch, label || null);
      setTimeout(fetchClaudeSessions, 500);
    } catch (err) {
      toast.error("Failed to launch Claude session", { description: String(err) });
    }
  };

  const handleNewClick = () => {
    setSessionName("");
    setNameDialogOpen(true);
  };

  const handleNameSubmit = () => {
    const name = sessionName.trim();
    handleCreate(name || undefined);
    setNameDialogOpen(false);
    setSessionName("");
  };

  const handleAttach = async (name: string) => {
    try {
      await claudeApi.attachClaudeSession(name);
    } catch (err) {
      toast.error("Failed to attach session", { description: String(err) });
    }
  };

  const handleKill = async (name: string, displayName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const yes = await ask(`End session "${displayName}"?\nThis will terminate the Claude process.`, {
      title: "End Claude session",
      kind: "warning",
    });
    if (!yes) return;
    try {
      await claudeApi.killClaudeSession(name);
      fetchClaudeSessions();
    } catch (err) {
      toast.error("Failed to end session", { description: String(err) });
    }
  };

  const activeSessions = sessions.filter((s) => s.status !== "Exited");
  const count = activeSessions.length;
  const hasIdle = activeSessions.some((s) => s.status === "Idle");
  const hasRunning = activeSessions.some((s) => s.status === "Running");
  const buttonDot = hasIdle ? "bg-grove-amber animate-pulse" : hasRunning ? "bg-primary" : "";
  const btnSize = compact ? "h-5 text-[9px] px-1.5" : "h-6 text-[10px] px-2";

  return (
    <>
      <DropdownMenu
        onOpenChange={(open) => {
          if (open) fetchClaudeSessions();
        }}
      >
        <DropdownMenuTrigger>
          <Button
            variant="outline"
            size="sm"
            className={cn(btnSize, "border-grove-claude text-grove-claude-fg gap-1", count > 0 && "bg-grove-claude-bg")}
            onClick={(e) => e.stopPropagation()}
          >
            Claude
            {count > 0 && (
              <span className="flex items-center gap-0.5">
                <span className={cn("w-1.5 h-1.5 rounded-full", buttonDot)} />
                <span>{count}</span>
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          {sessions.length > 0 && (
            <>
              {sessions.map((s) => {
                const cfg = STATUS_CONFIG[s.status];
                const StatusIcon = cfg.icon;
                const displayName = s.label || `Session ${s.index}`;
                return (
                  <DropdownMenuItem
                    key={s.name}
                    className="text-xs gap-2 justify-between"
                    onClick={() => handleAttach(s.name)}
                  >
                    <span className="flex items-center gap-2 min-w-0">
                      <StatusIcon
                        className={cn("w-3 h-3 shrink-0", cfg.color, s.status === "Running" && "animate-spin")}
                      />
                      <span className="truncate">{displayName}</span>
                      <Tooltip>
                        <TooltipTrigger>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0",
                              cfg.dotColor,
                              s.status === "Idle" && "animate-pulse",
                            )}
                          />
                        </TooltipTrigger>
                        <TooltipContent>{cfg.label}</TooltipContent>
                      </Tooltip>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={(e) => handleKill(s.name, displayName, e)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="text-xs gap-2 text-grove-claude-fg" onClick={handleNewClick}>
            <Plus className="w-3 h-3" /> New session...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Name dialog */}
      <Dialog open={nameDialogOpen} onOpenChange={setNameDialogOpen}>
        <DialogContent
          className="sm:max-w-xs"
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleNameSubmit();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-sm">New Claude session</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Session name (optional)</Label>
            <Input
              placeholder="e.g. refactor, bugfix, review..."
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              autoFocus
              className="h-8"
            />
            <p className="text-[10px] text-muted-foreground">Leave empty for auto-numbered name</p>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setNameDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleNameSubmit}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
