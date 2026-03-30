use std::path::PathBuf;

use tauri::State;

use crate::domain::error::Result;
use crate::service;
use crate::state::AppState;

#[tauri::command]
pub async fn fetch_all(state: State<'_, AppState>) -> Result<String> {
    let repo_path = state.require_repo_path()?;
    super::blocking(move || service::remote::fetch_all(&repo_path)).await
}

#[tauri::command]
pub async fn pull_worktree(worktree_path: String) -> Result<String> {
    super::blocking(move || service::remote::pull_worktree(&PathBuf::from(worktree_path))).await
}

#[tauri::command]
pub async fn push_worktree(worktree_path: String) -> Result<String> {
    super::blocking(move || service::remote::push_worktree(&PathBuf::from(worktree_path))).await
}
