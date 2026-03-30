import { listen } from "@tauri-apps/api/event";
import { useMemo } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import * as claudeApi from "@/api/claude";
import * as launchApi from "@/api/launch";
import * as remoteApi from "@/api/remote";
import * as repoApi from "@/api/repo";
import * as worktreeApi from "@/api/worktree";
import type { ClaudeSession, CreateWorktreeArgs, RepoEntry, SortBy, ViewMode, WorktreeInfo } from "@/types";

interface GroveState {
  // Data
  worktrees: WorktreeInfo[];
  repos: RepoEntry[];
  loading: boolean;
  error: string | null;
  repoPath: string | null;
  sortBy: SortBy;
  fetching: boolean;
  operationInProgress: Record<string, string>;

  // UI
  viewMode: ViewMode;
  filter: string;
  selectedIndex: number;
  createOpen: boolean;
  settingsOpen: boolean;
  cloneOpen: boolean;
  convertBarePath: string | null;
  focusSearch: boolean;
  showHelp: boolean;
  claudeSessions: Record<string, ClaudeSession[]>;

  // Data actions
  fetchClaudeSessions: () => Promise<void>;
  fetchWorktrees: () => Promise<void>;
  fetchRepos: () => Promise<void>;
  init: () => Promise<void>;
  addRepo: (path: string) => Promise<void>;
  removeRepo: (path: string) => Promise<void>;
  switchRepo: (path: string) => Promise<void>;
  createWorktree: (args: CreateWorktreeArgs) => Promise<void>;
  removeWorktree: (path: string, force?: boolean) => Promise<void>;
  openInEditor: (path: string, branch: string) => Promise<void>;
  openInTerminal: (path: string, branch: string) => Promise<void>;
  fetchRemotes: () => Promise<void>;
  pullWorktree: (path: string) => Promise<void>;
  pushWorktree: (path: string) => Promise<void>;

  // UI actions
  setViewMode: (mode: ViewMode) => void;
  setFilter: (filter: string) => void;
  setSelectedIndex: (index: number) => void;
  setSortBy: (sort: SortBy) => void;
  setCreateOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;
  setCloneOpen: (open: boolean) => void;
  setConvertBarePath: (path: string | null) => void;
  setFocusSearch: (focus: boolean) => void;
  setShowHelp: (show: boolean) => void;
}

function shallowEqualSessions(a: Record<string, ClaudeSession[]>, b: Record<string, ClaudeSession[]>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const sa = a[key];
    const sb = b[key];
    if (!sb || sa.length !== sb.length) return false;
    for (let i = 0; i < sa.length; i++) {
      if (sa[i].name !== sb[i].name || sa[i].status !== sb[i].status) return false;
    }
  }
  return true;
}

export const useGroveStore = create<GroveState>((set, get) => ({
  // Initial data state
  worktrees: [],
  repos: [],
  loading: true,
  error: null,
  repoPath: null,
  sortBy: "recent",
  fetching: false,
  operationInProgress: {},

  // Initial UI state
  viewMode: "grid",
  filter: "",
  selectedIndex: 0,
  createOpen: false,
  settingsOpen: false,
  cloneOpen: false,
  convertBarePath: null,
  focusSearch: false,
  showHelp: false,
  claudeSessions: {},

  // Data actions
  fetchClaudeSessions: async () => {
    const paths = get().worktrees.map((wt) => wt.path);
    if (paths.length === 0) {
      if (Object.keys(get().claudeSessions).length > 0) {
        set({ claudeSessions: {} });
      }
      return;
    }
    try {
      const result = await claudeApi.listAllClaudeSessions(paths);
      const next: Record<string, ClaudeSession[]> = {};
      for (const [path, sessions] of result) {
        next[path] = sessions;
      }
      const prev = get().claudeSessions;
      if (!shallowEqualSessions(prev, next)) {
        set({ claudeSessions: next });
      }
    } catch {
      // Session listing may fail — silent
    }
  },

  fetchWorktrees: async () => {
    try {
      const result = await worktreeApi.listWorktrees();
      set({ worktrees: result, error: null, loading: false });
    } catch (err) {
      set({ error: String(err), loading: false });
    }
  },

  fetchRepos: async () => {
    try {
      const result = await repoApi.listRepos();
      set({ repos: result });
    } catch {
      // ignore
    }
  },

  init: async () => {
    const { fetchRepos, fetchWorktrees } = get();
    await fetchRepos();
    const path = await repoApi.getRepoPath();
    if (path) {
      set({ repoPath: path });
      await fetchWorktrees();
      remoteApi
        .fetchAll()
        .then(() => fetchWorktrees())
        .catch(() => {});
    } else {
      set({ loading: false });
    }

    // Listen for filesystem changes
    listen("worktree-changed", () => {
      get().fetchWorktrees();
    });
  },

  addRepo: async (path: string) => {
    try {
      const updatedRepos = await repoApi.addRepo(path);
      set({ repos: updatedRepos, repoPath: path, loading: true });
      await get().fetchWorktrees();
      toast.success("Repository added");
    } catch (err) {
      toast.error("Failed to add repository", { description: String(err) });
    }
  },

  removeRepo: async (path: string) => {
    try {
      const updatedRepos = await repoApi.removeRepo(path);
      set({ repos: updatedRepos });
      const currentPath = await repoApi.getRepoPath();
      set({ repoPath: currentPath });
      if (currentPath) {
        await get().fetchWorktrees();
      } else {
        set({ worktrees: [] });
      }
      toast.success("Repository removed");
    } catch (err) {
      toast.error("Failed to remove repository", { description: String(err) });
    }
  },

  switchRepo: async (path: string) => {
    try {
      await repoApi.switchRepo(path);
      set({ repoPath: path, loading: true });
      await get().fetchWorktrees();
    } catch (err) {
      toast.error("Failed to switch repository", { description: String(err) });
    }
  },

  createWorktree: async (args: CreateWorktreeArgs) => {
    try {
      await worktreeApi.createWorktree(args);
      await get().fetchWorktrees();
      toast.success(`Worktree "${args.branch}" created`);
    } catch (err) {
      toast.error("Failed to create worktree", { description: String(err) });
      throw err;
    }
  },

  removeWorktree: async (path: string, force = false) => {
    try {
      await worktreeApi.removeWorktree(path, force);
      await get().fetchWorktrees();
      toast.success("Worktree removed");
    } catch (err) {
      toast.error("Failed to remove worktree", { description: String(err) });
      throw err;
    }
  },

  openInEditor: async (path: string, branch: string) => {
    try {
      await launchApi.openInEditor(path, branch);
    } catch (err) {
      toast.error("Failed to open editor", { description: String(err) });
    }
  },

  openInTerminal: async (path: string, branch: string) => {
    try {
      await launchApi.openInTerminal(path, branch);
    } catch (err) {
      toast.error("Failed to open terminal", { description: String(err) });
    }
  },

  fetchRemotes: async () => {
    set({ fetching: true });
    try {
      await remoteApi.fetchAll();
      await get().fetchWorktrees();
    } catch {
      // Network may be unavailable — silent
    } finally {
      set({ fetching: false });
    }
  },

  pullWorktree: async (path: string) => {
    set((s) => ({ operationInProgress: { ...s.operationInProgress, [path]: "pulling" } }));
    try {
      await remoteApi.pullWorktree(path);
      await get().fetchWorktrees();
      toast.success("Pull completed");
    } catch (err) {
      toast.error("Pull failed", { description: String(err) });
    } finally {
      set((s) => {
        const next = { ...s.operationInProgress };
        delete next[path];
        return { operationInProgress: next };
      });
    }
  },

  pushWorktree: async (path: string) => {
    set((s) => ({ operationInProgress: { ...s.operationInProgress, [path]: "pushing" } }));
    try {
      await remoteApi.pushWorktree(path);
      await get().fetchWorktrees();
      toast.success("Push completed");
    } catch (err) {
      toast.error("Push failed", { description: String(err) });
    } finally {
      set((s) => {
        const next = { ...s.operationInProgress };
        delete next[path];
        return { operationInProgress: next };
      });
    }
  },

  // UI actions
  setViewMode: (mode) => set({ viewMode: mode }),
  setFilter: (filter) => set({ filter }),
  setSelectedIndex: (index) => set({ selectedIndex: index }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setCreateOpen: (open) => set({ createOpen: open }),
  setSettingsOpen: (open) => set({ settingsOpen: open }),
  setCloneOpen: (open) => set({ cloneOpen: open }),
  setConvertBarePath: (path) => set({ convertBarePath: path }),
  setFocusSearch: (focus) => set({ focusSearch: focus }),
  setShowHelp: (show) => set({ showHelp: show }),
}));

/** Sorted worktrees selector (internal — used by useFilteredWorktrees) */
function useSortedWorktrees(): WorktreeInfo[] {
  const worktrees = useGroveStore((s) => s.worktrees);
  const sortBy = useGroveStore((s) => s.sortBy);

  return useMemo(() => {
    return [...worktrees].sort((a, b) => {
      if (a.is_main && !b.is_main) return -1;
      if (!a.is_main && b.is_main) return 1;

      switch (sortBy) {
        case "name":
          return (a.branch ?? "").localeCompare(b.branch ?? "");
        case "status":
          if (a.status.is_clean !== b.status.is_clean) {
            return a.status.is_clean ? 1 : -1;
          }
          return b.status.last_commit_time - a.status.last_commit_time;
        default:
          return b.status.last_commit_time - a.status.last_commit_time;
      }
    });
  }, [worktrees, sortBy]);
}

/** Filtered + sorted worktrees selector */
export function useFilteredWorktrees(): WorktreeInfo[] {
  const sorted = useSortedWorktrees();
  const filter = useGroveStore((s) => s.filter);

  return useMemo(() => {
    if (!filter) return sorted;
    const lower = filter.toLowerCase();
    return sorted.filter(
      (wt) =>
        (wt.branch ?? "").toLowerCase().includes(lower) ||
        wt.path.toLowerCase().includes(lower) ||
        (wt.label ?? "").toLowerCase().includes(lower),
    );
  }, [sorted, filter]);
}
