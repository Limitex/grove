use std::path::{Path, PathBuf};

use crate::domain::error::Result;
use crate::domain::repo::RepoEntry;
use crate::infra::git_repo::RepoHandle;
use crate::infra::persistence::repo_store::RepoStore;

pub fn list_repos() -> Vec<RepoEntry> {
    RepoStore::load().repos
}

pub fn add_repo(path: &str) -> Result<(Vec<RepoEntry>, PathBuf)> {
    let repo_path = PathBuf::from(path);
    let handle = RepoHandle::open(&repo_path)?;

    let name = repo_path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path.to_string());

    let mut store = RepoStore::load();
    let idx = store.add(&handle.path().to_string_lossy(), &name, handle.is_bare());
    store.active_index = Some(idx);
    store.save()?;

    let resolved_path = handle.path().to_path_buf();
    Ok((store.repos, resolved_path))
}

pub fn remove_repo(path: &str) -> Result<Vec<RepoEntry>> {
    let mut store = RepoStore::load();
    store.remove(path);
    store.save()?;
    Ok(store.repos)
}

pub fn switch_repo(path: &str) -> Result<()> {
    let repo_path = PathBuf::from(path);
    let _handle = RepoHandle::open(&repo_path)?;

    let mut store = RepoStore::load();
    if let Some(idx) = store.repos.iter().position(|r| r.path == path) {
        store.active_index = Some(idx);
        store.save()?;
    }
    Ok(())
}

pub fn get_active_repo() -> Option<usize> {
    RepoStore::load().active_index
}

pub fn validate_repo(path: &Path) -> Result<Vec<String>> {
    let mut issues = Vec::new();

    if !path.exists() {
        issues.push(format!(
            "Repository directory not found: {}",
            path.display()
        ));
        return Ok(issues);
    }

    let bare_dir = path.join(".bare");
    let git_dir = path.join(".git");
    let is_bare = bare_dir.is_dir();

    if !is_bare && !git_dir.exists() {
        issues.push("Not a git repository (.git not found)".to_string());
        return Ok(issues);
    }

    if RepoHandle::open(path).is_err() {
        issues.push("Failed to open git repository".to_string());
        return Ok(issues);
    }

    if is_bare {
        let worktrees_dir = bare_dir.join("worktrees");
        if let Ok(entries) = std::fs::read_dir(&worktrees_dir) {
            for entry in entries.filter_map(|e| e.ok()) {
                let name = entry.file_name().to_string_lossy().to_string();
                let gitdir_file = entry.path().join("gitdir");
                if !gitdir_file.exists() {
                    issues.push(format!("Worktree '{}': missing gitdir file", name));
                    continue;
                }
                if let Ok(content) = std::fs::read_to_string(&gitdir_file) {
                    let wt_git_path = PathBuf::from(content.trim());
                    let wt_dir = wt_git_path.parent().unwrap_or(&wt_git_path);
                    if !wt_dir.exists() {
                        issues.push(format!(
                            "Worktree '{}': directory missing ({})",
                            name,
                            wt_dir.display()
                        ));
                    }
                }
            }
        }
    }

    Ok(issues)
}
