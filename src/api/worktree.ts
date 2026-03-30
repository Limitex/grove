import { invoke } from "@tauri-apps/api/core";
import type { CommitEntry, CreateWorktreeArgs, WorktreeInfo } from "@/types";

export const listWorktrees = () => invoke<WorktreeInfo[]>("list_worktrees");

export const createWorktree = (args: CreateWorktreeArgs) => invoke<WorktreeInfo>("create_worktree", { args });

export const removeWorktree = (worktreePath: string, force: boolean) =>
  invoke<void>("remove_worktree", { worktreePath, force });

export const listBranches = () => invoke<string[]>("list_branches");

export const getCommitHistory = (worktreePath: string, maxCount: number = 50) =>
  invoke<CommitEntry[]>("get_commit_history", { worktreePath, maxCount });
