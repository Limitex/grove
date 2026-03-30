use crate::domain::claude::ClaudeSession;
use crate::domain::error::Result;
use crate::service;

#[tauri::command]
pub async fn open_claude_code(
    worktree_path: String,
    branch: String,
    label: Option<String>,
) -> Result<()> {
    super::blocking(move || {
        service::claude::open_claude_code(&worktree_path, &branch, label.as_deref())
    })
    .await
}

#[tauri::command]
pub async fn attach_claude_session(session_name: String) -> Result<()> {
    super::blocking(move || service::claude::attach_claude_session(&session_name)).await
}

#[tauri::command]
pub async fn kill_claude_session(session_name: String) -> Result<()> {
    super::blocking(move || service::claude::kill_claude_session(&session_name)).await
}

#[tauri::command]
pub async fn list_claude_sessions(worktree_path: String) -> Result<Vec<ClaudeSession>> {
    super::blocking(move || Ok(service::claude::list_claude_sessions(&worktree_path))).await
}

#[tauri::command]
pub async fn has_claude_session(worktree_path: String) -> Result<bool> {
    super::blocking(move || Ok(service::claude::has_claude_session(&worktree_path))).await
}

#[tauri::command]
pub async fn list_all_claude_sessions(
    worktree_paths: Vec<String>,
) -> Result<Vec<(String, Vec<ClaudeSession>)>> {
    super::blocking(move || Ok(service::claude::list_all_claude_sessions(&worktree_paths))).await
}
