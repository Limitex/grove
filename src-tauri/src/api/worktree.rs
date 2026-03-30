use std::path::PathBuf;

use serde::Deserialize;
use tauri::State;
use ts_rs::TS;

use crate::domain::commit::CommitEntry;
use crate::domain::error::Result;
use crate::domain::worktree::{WorktreeInfo, WorktreeStatus};
use crate::service;
use crate::state::AppState;

#[derive(Debug, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct CreateWorktreeArgs {
    pub branch: String,
    pub path: Option<String>,
    pub create_branch: bool,
    pub base_ref: Option<String>,
}

#[tauri::command]
pub async fn worktree_status(path: String) -> Result<WorktreeStatus> {
    super::blocking(move || service::worktree::worktree_status(&PathBuf::from(path))).await
}

#[tauri::command]
pub async fn create_worktree(
    state: State<'_, AppState>,
    args: CreateWorktreeArgs,
) -> Result<WorktreeInfo> {
    let repo_path = state.require_repo_path()?;
    super::blocking(move || {
        service::worktree::create_worktree(
            &repo_path,
            &args.branch,
            args.path.as_deref(),
            args.create_branch,
            args.base_ref.as_deref(),
        )
    })
    .await
}

#[tauri::command]
pub async fn remove_worktree(
    state: State<'_, AppState>,
    worktree_path: String,
    force: bool,
) -> Result<()> {
    let repo_path = state.require_repo_path()?;
    super::blocking(move || {
        service::worktree::remove_worktree(&repo_path, &PathBuf::from(worktree_path), force)
    })
    .await
}

#[tauri::command]
pub async fn prune_worktrees(state: State<'_, AppState>) -> Result<String> {
    let repo_path = state.require_repo_path()?;
    super::blocking(move || service::worktree::prune_worktrees(&repo_path)).await
}

#[tauri::command]
pub async fn list_branches(state: State<'_, AppState>) -> Result<Vec<String>> {
    let repo_path = state.require_repo_path()?;
    super::blocking(move || service::worktree::list_branches(&repo_path)).await
}

#[tauri::command]
pub async fn get_commit_history(
    worktree_path: String,
    max_count: Option<usize>,
) -> Result<Vec<CommitEntry>> {
    let max = max_count.unwrap_or(50);
    super::blocking(move || {
        service::worktree::get_commit_history(&PathBuf::from(worktree_path), max)
    })
    .await
}
