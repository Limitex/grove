import { invoke } from "@tauri-apps/api/core";
import type { ChangedFile, CommitChangedFile, FileDiff } from "@/types";

export const getChangedFiles = (worktreePath: string) => invoke<ChangedFile[]>("get_changed_files", { worktreePath });

export const getFileDiff = (worktreePath: string, filePath: string, staged: boolean) =>
  invoke<FileDiff>("get_file_diff", { worktreePath, filePath, staged });

export const getCommitChangedFiles = (worktreePath: string, sha: string) =>
  invoke<CommitChangedFile[]>("get_commit_changed_files", { worktreePath, sha });

export const getCommitFullDiff = (worktreePath: string, sha: string) =>
  invoke<FileDiff[]>("get_commit_full_diff", { worktreePath, sha });

export const getCommitFileDiff = (worktreePath: string, sha: string, filePath: string) =>
  invoke<FileDiff>("get_commit_file_diff", { worktreePath, sha, filePath });

export const getRangeChangedFiles = (worktreePath: string, fromSha: string, toSha: string) =>
  invoke<CommitChangedFile[]>("get_range_changed_files", { worktreePath, fromSha, toSha });

export const getRangeFullDiff = (worktreePath: string, fromSha: string, toSha: string) =>
  invoke<FileDiff[]>("get_range_full_diff", { worktreePath, fromSha, toSha });

export const getRangeFileDiff = (worktreePath: string, fromSha: string, toSha: string, filePath: string) =>
  invoke<FileDiff>("get_range_file_diff", { worktreePath, fromSha, toSha, filePath });
