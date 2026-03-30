use std::path::PathBuf;

use crate::domain::error::Result;
use crate::domain::rebase::RebaseAction;
use crate::service;

#[tauri::command]
pub async fn squash_commits(
    worktree_path: String,
    count: usize,
    message: String,
) -> Result<String> {
    super::blocking(move || {
        service::rebase::squash_commits(&PathBuf::from(worktree_path), count, &message)
    })
    .await
}

#[tauri::command]
pub async fn cherry_pick(worktree_path: String, sha: String) -> Result<String> {
    super::blocking(move || service::rebase::cherry_pick(&PathBuf::from(worktree_path), &sha)).await
}

#[tauri::command]
pub async fn interactive_rebase(
    worktree_path: String,
    onto: String,
    actions: Vec<RebaseAction>,
) -> Result<String> {
    super::blocking(move || {
        service::rebase::interactive_rebase(&PathBuf::from(worktree_path), &onto, &actions)
    })
    .await
}

#[tauri::command]
pub async fn abort_rebase(worktree_path: String) -> Result<String> {
    super::blocking(move || service::rebase::abort_rebase(&PathBuf::from(worktree_path))).await
}

#[tauri::command]
pub async fn continue_rebase(worktree_path: String) -> Result<String> {
    super::blocking(move || service::rebase::continue_rebase(&PathBuf::from(worktree_path))).await
}
