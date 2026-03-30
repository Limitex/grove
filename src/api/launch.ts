import { invoke } from "@tauri-apps/api/core";

export const openInEditor = (worktreePath: string, branch: string) =>
  invoke<void>("open_in_editor", { worktreePath, branch });

export const openInTerminal = (worktreePath: string, branch: string) =>
  invoke<void>("open_in_terminal", { worktreePath, branch });
