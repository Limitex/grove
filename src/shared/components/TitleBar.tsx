import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Plus, RefreshCw, Settings, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RepoSelector } from "@/features/repo";
import type { RepoEntry } from "@/types";
import { GroveLogo } from "./GroveLogo";

interface TitleBarProps {
  repos: RepoEntry[];
  repoPath: string | null;
  onSwitchRepo: (path: string) => void;
  onClone: () => void;
  onOpenExisting: () => void;
  onRemoveRepo: (path: string) => void;
  onRefresh: () => void;
  onSettings: () => void;
  onNew: () => void;
}

export function TitleBar({
  repos,
  repoPath,
  onSwitchRepo,
  onClone,
  onOpenExisting,
  onRemoveRepo,
  onRefresh,
  onSettings,
  onNew,
}: TitleBarProps) {
  const appWindow = getCurrentWindow();

  return (
    <div
      className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/40 select-none"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        appWindow.startDragging();
      }}
    >
      {/* Left: logo + repo */}
      <div className="flex items-center gap-2" data-no-drag="">
        <GroveLogo className="w-4 h-4" />
        <span className="text-xs font-semibold tracking-tight">Grove</span>
        <RepoSelector
          repos={repos}
          activeRepoPath={repoPath}
          onSwitch={onSwitchRepo}
          onClone={onClone}
          onOpenExisting={onOpenExisting}
          onRemove={onRemoveRepo}
        />
      </div>

      {/* Center: spacer for drag area */}
      <div className="flex-1" />

      {/* Right: actions + window controls */}
      <div className="flex items-center" data-no-drag="">
        {/* App actions */}
        <div className="flex items-center gap-0.5 mr-2">
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onRefresh}
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Refresh (r)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={onSettings}
              >
                <Settings className="w-3.5 h-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-primary hover:text-primary" onClick={onNew}>
                <Plus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>New worktree (n)</TooltipContent>
          </Tooltip>
        </div>

        {/* Window controls */}
        <div className="flex items-center -mr-1.5 ml-1 border-l pl-1.5">
          <button
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => appWindow.minimize()}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            onClick={() => appWindow.toggleMaximize()}
          >
            <Square className="w-3 h-3" />
          </button>
          <button
            className="h-7 w-7 inline-flex items-center justify-center rounded-sm text-muted-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
            onClick={() => appWindow.close()}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
