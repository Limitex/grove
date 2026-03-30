use std::path::PathBuf;

use tauri::State;

use crate::domain::error::Result;
use crate::domain::repo::RepoEntry;
use crate::domain::worktree::WorktreeInfo;
use crate::service;
use crate::state::AppState;

#[tauri::command]
pub async fn list_repos() -> Result<Vec<RepoEntry>> {
    super::blocking(move || Ok(service::repo::list_repos())).await
}

#[tauri::command]
pub async fn add_repo(state: State<'_, AppState>, path: String) -> Result<Vec<RepoEntry>> {
    let (repos, resolved_path) = service::repo::add_repo(&path)?;
    state.set_repo_path(Some(resolved_path))?;
    Ok(repos)
}

#[tauri::command]
pub async fn remove_repo(state: State<'_, AppState>, path: String) -> Result<Vec<RepoEntry>> {
    let repos = service::repo::remove_repo(&path)?;

    let current = state.require_repo_path().ok();
    if current.is_some_and(|p| p.to_string_lossy() == path) {
        // Active repo was removed; pick new active if available
        let active = service::repo::get_active_repo();
        let new_path = active
            .and_then(|i| repos.get(i))
            .map(|r| PathBuf::from(&r.path));
        state.set_repo_path(new_path)?;
    }

    Ok(repos)
}

#[tauri::command]
pub async fn switch_repo(state: State<'_, AppState>, path: String) -> Result<()> {
    service::repo::switch_repo(&path)?;
    state.set_repo_path(Some(PathBuf::from(&path)))?;
    Ok(())
}

#[tauri::command]
pub async fn get_active_repo() -> Result<Option<usize>> {
    super::blocking(move || Ok(service::repo::get_active_repo())).await
}

#[tauri::command]
pub async fn set_repo_path(state: State<'_, AppState>, path: String) -> Result<()> {
    use crate::infra::git_repo::RepoHandle;
    let path = PathBuf::from(&path);
    let path_clone = path.clone();
    super::blocking(move || {
        let _handle = RepoHandle::open(&path_clone)?;
        Ok(())
    })
    .await?;
    state.set_repo_path(Some(path))?;
    Ok(())
}

#[tauri::command]
pub async fn get_repo_path(state: State<'_, AppState>) -> Result<Option<String>> {
    Ok(state
        .require_repo_path()
        .ok()
        .map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
pub async fn list_worktrees(state: State<'_, AppState>) -> Result<Vec<WorktreeInfo>> {
    match state.require_repo_path() {
        Ok(path) => super::blocking(move || service::worktree::list_worktrees(&path)).await,
        Err(_) => Ok(Vec::new()),
    }
}

#[tauri::command]
pub async fn validate_repo(state: State<'_, AppState>) -> Result<Vec<String>> {
    match state.require_repo_path() {
        Ok(path) => super::blocking(move || service::repo::validate_repo(&path)).await,
        Err(_) => Ok(Vec::new()),
    }
}
