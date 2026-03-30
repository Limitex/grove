use std::path::PathBuf;

use crate::domain::diff::{CommitChangedFile, FileDiff};
use crate::domain::error::Result;
use crate::domain::worktree::ChangedFile;
use crate::service;

#[tauri::command]
pub async fn get_changed_files(worktree_path: String) -> Result<Vec<ChangedFile>> {
    super::blocking(move || service::diff::get_changed_files(&PathBuf::from(worktree_path))).await
}

#[tauri::command]
pub async fn get_file_diff(
    worktree_path: String,
    file_path: String,
    staged: bool,
) -> Result<FileDiff> {
    super::blocking(move || {
        service::diff::get_file_diff(&PathBuf::from(worktree_path), &file_path, staged)
    })
    .await
}

#[tauri::command]
pub async fn get_commit_changed_files(
    worktree_path: String,
    sha: String,
) -> Result<Vec<CommitChangedFile>> {
    super::blocking(move || {
        service::diff::get_commit_changed_files(&PathBuf::from(worktree_path), &sha)
    })
    .await
}

#[tauri::command]
pub async fn get_commit_full_diff(worktree_path: String, sha: String) -> Result<Vec<FileDiff>> {
    super::blocking(move || {
        service::diff::get_commit_full_diff(&PathBuf::from(worktree_path), &sha)
    })
    .await
}

#[tauri::command]
pub async fn get_commit_file_diff(
    worktree_path: String,
    sha: String,
    file_path: String,
) -> Result<FileDiff> {
    super::blocking(move || {
        service::diff::get_commit_file_diff(&PathBuf::from(worktree_path), &sha, &file_path)
    })
    .await
}

#[tauri::command]
pub async fn get_range_changed_files(
    worktree_path: String,
    from_sha: String,
    to_sha: String,
) -> Result<Vec<CommitChangedFile>> {
    super::blocking(move || {
        service::diff::get_range_changed_files(&PathBuf::from(worktree_path), &from_sha, &to_sha)
    })
    .await
}

#[tauri::command]
pub async fn get_range_full_diff(
    worktree_path: String,
    from_sha: String,
    to_sha: String,
) -> Result<Vec<FileDiff>> {
    super::blocking(move || {
        service::diff::get_range_full_diff(&PathBuf::from(worktree_path), &from_sha, &to_sha)
    })
    .await
}

#[tauri::command]
pub async fn get_range_file_diff(
    worktree_path: String,
    from_sha: String,
    to_sha: String,
    file_path: String,
) -> Result<FileDiff> {
    super::blocking(move || {
        service::diff::get_range_file_diff(
            &PathBuf::from(worktree_path),
            &from_sha,
            &to_sha,
            &file_path,
        )
    })
    .await
}
