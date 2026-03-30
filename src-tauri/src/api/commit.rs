use std::path::PathBuf;

use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn git_commit(worktree_path: String, message: String) -> Result<String> {
    super::blocking(move || service::commit::git_commit(&PathBuf::from(worktree_path), &message))
        .await
}

#[tauri::command]
pub async fn amend_commit(worktree_path: String, message: Option<String>) -> Result<String> {
    super::blocking(move || {
        service::commit::amend_commit(&PathBuf::from(worktree_path), message.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn revert_commit(worktree_path: String, sha: String) -> Result<String> {
    super::blocking(move || service::commit::revert_commit(&PathBuf::from(worktree_path), &sha))
        .await
}

#[tauri::command]
pub async fn reset_to_commit(worktree_path: String, sha: String) -> Result<String> {
    super::blocking(move || service::commit::reset_to_commit(&PathBuf::from(worktree_path), &sha))
        .await
}
