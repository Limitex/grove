// Re-export generated types from Rust domain (via ts-rs)
export type { ChangedFile } from "@/generated/ChangedFile";
export type { ClaudeSession } from "@/generated/ClaudeSession";
export type { CommitChangedFile } from "@/generated/CommitChangedFile";
export type { CommitEntry } from "@/generated/CommitEntry";
export type { CreateWorktreeArgs } from "@/generated/CreateWorktreeArgs";
export type { FileArea } from "@/generated/FileArea";
export type { FileDiff } from "@/generated/FileDiff";
export type { GroveConfig } from "@/generated/GroveConfig";
export type { RebaseAction } from "@/generated/RebaseAction";
export type { RebaseActionType } from "@/generated/RebaseActionType";
export type { RepoEntry } from "@/generated/RepoEntry";
export type { WorktreeInfo } from "@/generated/WorktreeInfo";
export type { WorktreeStatus } from "@/generated/WorktreeStatus";

// Frontend-only types (not generated from Rust)

/** View mode for the dashboard. */
export type ViewMode = "grid" | "list";

/** Sort options for worktrees. */
export type SortBy = "recent" | "name" | "status";
