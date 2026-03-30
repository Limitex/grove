import { invoke } from "@tauri-apps/api/core";
import type { RebaseAction } from "@/types";

export const squashCommits = (worktreePath: string, count: number, message: string) =>
  invoke<string>("squash_commits", { worktreePath, count, message });

export const cherryPick = (worktreePath: string, sha: string) => invoke<string>("cherry_pick", { worktreePath, sha });

export const interactiveRebase = (worktreePath: string, onto: string, actions: RebaseAction[]) =>
  invoke<string>("interactive_rebase", { worktreePath, onto, actions });
