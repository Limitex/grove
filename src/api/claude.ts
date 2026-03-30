import { invoke } from "@tauri-apps/api/core";
import type { ClaudeSession } from "@/types";

export const openClaudeCode = (worktreePath: string, branch: string, label: string | null) =>
  invoke<void>("open_claude_code", { worktreePath, branch, label });

export const attachClaudeSession = (sessionName: string) => invoke<void>("attach_claude_session", { sessionName });

export const killClaudeSession = (sessionName: string) => invoke<void>("kill_claude_session", { sessionName });

export const listAllClaudeSessions = (worktreePaths: string[]) =>
  invoke<[string, ClaudeSession[]][]>("list_all_claude_sessions", { worktreePaths });
