use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn open_in_editor(worktree_path: String, branch: String) -> Result<()> {
    super::blocking(move || service::launch::open_in_editor(&worktree_path, &branch)).await
}

#[tauri::command]
pub async fn open_in_terminal(worktree_path: String, branch: String) -> Result<()> {
    super::blocking(move || service::launch::open_in_terminal(&worktree_path, &branch)).await
}

#[tauri::command]
pub async fn open_in_file_manager(worktree_path: String) -> Result<()> {
    super::blocking(move || service::launch::open_in_file_manager(&worktree_path)).await
}
