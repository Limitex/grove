import { ask, open } from "@tauri-apps/plugin-dialog";
import { FolderOpen } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import * as cloneApi from "@/api/clone";
import * as configApi from "@/api/config";
import * as repoApi from "@/api/repo";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ClaudeSessionsPanel } from "@/features/claude";
import { CloneDialog, ConvertBareDialog } from "@/features/repo";
import { SettingsDialog } from "@/features/settings";
import { CreateDialog, Dashboard, DetailPanel, Toolbar } from "@/features/worktree";
import { GroveLogo } from "@/shared/components/GroveLogo";
import { HelpOverlay } from "@/shared/components/HelpOverlay";
import { TitleBar } from "@/shared/components/TitleBar";
import { ToastProvider } from "@/shared/components/ToastProvider";
import { useKeyboard } from "@/shared/hooks/useKeyboard";
import { useResize } from "@/shared/hooks/useResize";
import { useFilteredWorktrees, useGroveStore } from "@/store";

function applyTheme(theme: string) {
  const root = document.documentElement;
  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

export default function App() {
  const loading = useGroveStore((s) => s.loading);
  const error = useGroveStore((s) => s.error);
  const repoPath = useGroveStore((s) => s.repoPath);
  const repos = useGroveStore((s) => s.repos);
  const worktrees = useGroveStore((s) => s.worktrees);
  const fetching = useGroveStore((s) => s.fetching);
  const operationInProgress = useGroveStore((s) => s.operationInProgress);
  const viewMode = useGroveStore((s) => s.viewMode);
  const filter = useGroveStore((s) => s.filter);
  const sortBy = useGroveStore((s) => s.sortBy);
  const createOpen = useGroveStore((s) => s.createOpen);
  const settingsOpen = useGroveStore((s) => s.settingsOpen);
  const cloneOpen = useGroveStore((s) => s.cloneOpen);
  const convertBarePath = useGroveStore((s) => s.convertBarePath);
  const focusSearch = useGroveStore((s) => s.focusSearch);
  const showHelp = useGroveStore((s) => s.showHelp);

  const {
    addRepo,
    removeRepo,
    switchRepo,
    createWorktree,
    removeWorktree,
    openInEditor,
    openInTerminal,
    fetchRemotes,
    pullWorktree,
    pushWorktree,
    fetchWorktrees: refresh,
    setViewMode,
    setFilter,
    setSortBy,
    setCreateOpen,
    setSettingsOpen,
    setCloneOpen,
    setConvertBarePath,
    setFocusSearch,
    setShowHelp,
  } = useGroveStore();

  const filtered = useFilteredWorktrees();

  // Load and apply theme on mount
  useEffect(() => {
    configApi
      .getConfig()
      .then((cfg) => applyTheme(cfg.general.theme))
      .catch(() => {});

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      configApi
        .getConfig()
        .then((cfg) => {
          if (cfg.general.theme === "system") applyTheme("system");
        })
        .catch(() => {});
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Validate repo and refresh worktrees when window regains focus
  useEffect(() => {
    const onFocus = async () => {
      try {
        await repoApi.validateRepo();
      } catch {
        // validate_repo itself failed
      }
      refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  const { size: sidebarWidth, onResizeStart: handleResizeStart } = useResize({
    initial: 560,
    min: 200,
    max: Infinity,
    direction: "horizontal",
  });
  const { size: sessionsPanelHeight, onResizeStart: handleSessionsResize } = useResize({
    initial: 120,
    min: 60,
    max: 400,
    direction: "vertical",
  });

  const gridColumns = useRef(3);
  const selectedIndex = useGroveStore((s) => s.selectedIndex);
  const setSelectedIndex = useGroveStore((s) => s.setSelectedIndex);

  const handleAction = useCallback(
    (action: (index: number) => void) => (index: number) => {
      const wt = filtered[index];
      if (wt) action(index);
    },
    [filtered],
  );

  useKeyboard({
    itemCount: filtered.length,
    selectedIndex,
    onSelectIndex: setSelectedIndex,
    showHelp,
    onShowHelpChange: setShowHelp,
    columns: gridColumns.current,
    onEnter: handleAction((i) => {
      const wt = filtered[i];
      if (wt) openInEditor(wt.path, wt.branch ?? "");
    }),
    onDelete: handleAction(async (i) => {
      const wt = filtered[i];
      if (!wt || wt.is_main) return;
      const yes = await ask(`Remove worktree "${wt.branch}"?\n${wt.path}`, {
        title: "Remove worktree",
        kind: "warning",
      });
      if (yes) removeWorktree(wt.path, false);
    }),
    onNew: () => setCreateOpen(true),
    onTerminal: handleAction((i) => {
      const wt = filtered[i];
      if (wt) openInTerminal(wt.path, wt.branch ?? "");
    }),
    onRefresh: refresh,
    onSearch: () => setFocusSearch(true),
    onFetch: fetchRemotes,
  });

  const handleOpenExisting = useCallback(async () => {
    const selected = await open({ directory: true, multiple: false });
    if (selected) {
      const path = selected as string;
      const hasBare = await cloneApi.checkHasBare(path).catch(() => false);
      if (hasBare) {
        await addRepo(path);
      } else {
        setConvertBarePath(path);
      }
    }
  }, [addRepo, setConvertBarePath]);

  const handleSwitchRepo = useCallback(
    async (path: string) => {
      await switchRepo(path);
    },
    [switchRepo],
  );

  // Empty state: no repos
  if (!repoPath && !loading) {
    return (
      <TooltipProvider>
        <div className="flex flex-col h-full bg-background">
          <TitleBar
            repos={repos}
            repoPath={null}
            onSwitchRepo={handleSwitchRepo}
            onClone={() => setCloneOpen(true)}
            onOpenExisting={handleOpenExisting}
            onRemoveRepo={removeRepo}
            onRefresh={refresh}
            onSettings={() => setSettingsOpen(true)}
            onNew={() => {}}
          />
          <div className="flex-1 flex flex-col items-center justify-center gap-3 p-10">
            <GroveLogo className="w-14 h-14 opacity-70" />
            <h2 className="text-lg font-semibold">Welcome to Grove</h2>
            <p className="text-muted-foreground text-sm">Clone a repository to get started with worktrees.</p>
            <div className="flex gap-2 mt-2">
              <Button className="gap-1.5" onClick={() => setCloneOpen(true)}>
                Clone repository
              </Button>
              <Button variant="outline" className="gap-1.5" onClick={handleOpenExisting}>
                <FolderOpen className="w-4 h-4" /> Open existing
              </Button>
            </div>
          </div>
          <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onThemeChange={applyTheme} />
          <CloneDialog
            open={cloneOpen}
            onClose={() => setCloneOpen(false)}
            onComplete={async (barePath) => {
              setCloneOpen(false);
              const repoDir = barePath.replace(/\/.bare$/, "");
              await addRepo(repoDir);
            }}
          />
          <ConvertBareDialog
            open={convertBarePath !== null}
            repoPath={convertBarePath}
            onClose={() => setConvertBarePath(null)}
            onConvert={async (path) => {
              setConvertBarePath(null);
              await addRepo(path);
            }}
            onSkip={async (path) => {
              setConvertBarePath(null);
              await addRepo(path);
            }}
          />
        </div>
        <ToastProvider />
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-background">
        <TitleBar
          repos={repos}
          repoPath={repoPath}
          onSwitchRepo={handleSwitchRepo}
          onClone={() => setCloneOpen(true)}
          onOpenExisting={handleOpenExisting}
          onRemoveRepo={removeRepo}
          onRefresh={refresh}
          onSettings={() => setSettingsOpen(true)}
          onNew={() => setCreateOpen(true)}
        />
        <Toolbar
          filter={filter}
          onFilterChange={setFilter}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          sortBy={sortBy}
          onSortChange={setSortBy}
          worktreeCount={worktrees.length}
          focusSearch={focusSearch}
          onSearchFocused={() => setFocusSearch(false)}
          onFetch={fetchRemotes}
          fetching={fetching}
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
            {loading ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground animate-pulse">
                Loading worktrees...
              </div>
            ) : error ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
                <p className="text-destructive">Error: {error}</p>
                <Button variant="outline" size="sm" onClick={refresh}>
                  Retry
                </Button>
              </div>
            ) : (
              <Dashboard
                worktrees={filtered}
                viewMode={viewMode}
                selectedIndex={selectedIndex}
                onSelectIndex={setSelectedIndex}
                onOpenEditor={(wt) => openInEditor(wt.path, wt.branch ?? "")}
                onOpenTerminal={(wt) => openInTerminal(wt.path, wt.branch ?? "")}
                onRemove={async (wt) => {
                  const yes = await ask(`Remove worktree "${wt.branch}"?\n${wt.path}`, {
                    title: "Remove worktree",
                    kind: "warning",
                  });
                  if (yes) removeWorktree(wt.path, false);
                }}
                onPull={pullWorktree}
                onPush={pushWorktree}
                operationInProgress={operationInProgress}
                onNew={() => setCreateOpen(true)}
              />
            )}

            <ClaudeSessionsPanel
              worktrees={worktrees}
              height={sessionsPanelHeight}
              onResizeStart={handleSessionsResize}
            />
          </div>

          {filtered[selectedIndex] && (
            <>
              <div
                className="w-2 cursor-col-resize shrink-0 border-l hover:bg-primary/20 active:bg-primary/40 transition-colors"
                onMouseDown={handleResizeStart}
              />
              <DetailPanel
                key={filtered[selectedIndex].path}
                worktree={filtered[selectedIndex]}
                onRefresh={refresh}
                width={sidebarWidth}
              />
            </>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 px-3.5 py-1.5 border-t text-[10px] text-muted-foreground select-none">
          <span>
            <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary">n</kbd> new
          </span>
          <span>
            <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary">Enter</kbd> editor
          </span>
          <span>
            <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary">t</kbd> term
          </span>
          <span>
            <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary">F</kbd> fetch
          </span>
          <span>
            <kbd className="font-mono text-[10px] px-1 border rounded bg-secondary">?</kbd> help
          </span>
        </div>

        <CreateDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreate={createWorktree} />
        <HelpOverlay open={showHelp} onClose={() => setShowHelp(false)} />
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} onThemeChange={applyTheme} />
        <CloneDialog
          open={cloneOpen}
          onClose={() => setCloneOpen(false)}
          onComplete={async (barePath) => {
            setCloneOpen(false);
            const repoDir = barePath.replace(/\/.bare$/, "");
            await addRepo(repoDir);
          }}
        />
        <ConvertBareDialog
          open={convertBarePath !== null}
          repoPath={convertBarePath}
          onClose={() => setConvertBarePath(null)}
          onConvert={async (path) => {
            setConvertBarePath(null);
            await addRepo(path);
          }}
          onSkip={async (path) => {
            setConvertBarePath(null);
            await addRepo(path);
          }}
        />
      </div>
      <ToastProvider />
    </TooltipProvider>
  );
}
