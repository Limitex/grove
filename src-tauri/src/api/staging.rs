use std::path::PathBuf;

use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn stage_file(worktree_path: String, file_path: String) -> Result<()> {
    super::blocking(move || service::staging::stage_file(&PathBuf::from(worktree_path), &file_path))
        .await
}

#[tauri::command]
pub async fn unstage_file(worktree_path: String, file_path: String) -> Result<()> {
    super::blocking(move || {
        service::staging::unstage_file(&PathBuf::from(worktree_path), &file_path)
    })
    .await
}

#[tauri::command]
pub async fn stage_all(worktree_path: String) -> Result<()> {
    super::blocking(move || service::staging::stage_all(&PathBuf::from(worktree_path))).await
}

#[tauri::command]
pub async fn unstage_all(worktree_path: String) -> Result<()> {
    super::blocking(move || service::staging::unstage_all(&PathBuf::from(worktree_path))).await
}

#[tauri::command]
pub async fn discard_file(worktree_path: String, file_path: String) -> Result<()> {
    super::blocking(move || {
        service::staging::discard_file(&PathBuf::from(worktree_path), &file_path)
    })
    .await
}
