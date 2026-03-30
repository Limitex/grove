import { invoke } from "@tauri-apps/api/core";

export const gitCommit = (worktreePath: string, message: string) =>
  invoke<string>("git_commit", { worktreePath, message });

export const amendCommit = (worktreePath: string, message: string | null) =>
  invoke<string>("amend_commit", { worktreePath, message });

export const revertCommit = (worktreePath: string, sha: string) =>
  invoke<string>("revert_commit", { worktreePath, sha });

export const resetToCommit = (worktreePath: string, sha: string) =>
  invoke<string>("reset_to_commit", { worktreePath, sha });
