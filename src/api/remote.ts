import { invoke } from "@tauri-apps/api/core";

export const fetchAll = () => invoke<string>("fetch_all");

export const pullWorktree = (worktreePath: string) => invoke<string>("pull_worktree", { worktreePath });

export const pushWorktree = (worktreePath: string) => invoke<string>("push_worktree", { worktreePath });
