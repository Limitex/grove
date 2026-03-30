import { invoke } from "@tauri-apps/api/core";

export const stageFile = (worktreePath: string, filePath: string) =>
  invoke<void>("stage_file", { worktreePath, filePath });

export const unstageFile = (worktreePath: string, filePath: string) =>
  invoke<void>("unstage_file", { worktreePath, filePath });

export const stageAll = (worktreePath: string) => invoke<void>("stage_all", { worktreePath });

export const unstageAll = (worktreePath: string) => invoke<void>("unstage_all", { worktreePath });

export const discardFile = (worktreePath: string, filePath: string) =>
  invoke<void>("discard_file", { worktreePath, filePath });
