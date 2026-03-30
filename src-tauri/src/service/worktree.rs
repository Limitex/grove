use std::path::{Path, PathBuf};

use crate::domain::error::Result;
use crate::domain::worktree::{WorktreeInfo, WorktreeStatus};
use crate::infra::git_repo::RepoHandle;
use crate::infra::persistence;
use crate::infra::query;
use crate::infra::repository;

pub fn list_worktrees(repo_path: &Path) -> Result<Vec<WorktreeInfo>> {
    query::worktree::list_worktrees(repo_path)
}

pub fn worktree_status(path: &Path) -> Result<WorktreeStatus> {
    query::status::compute_worktree_status(path)
}

pub fn create_worktree(
    repo_path: &Path,
    branch_name: &str,
    target_path: Option<&str>,
    create_branch: bool,
    base_ref: Option<&str>,
) -> Result<WorktreeInfo> {
    let target = if let Some(p) = target_path {
        PathBuf::from(p)
    } else {
        let config = persistence::config::load()?;
        let base = config.resolve_worktree_base(repo_path);
        let dir_name = branch_name.replace('/', "-");
        base.join(&dir_name)
    };

    repository::worktree::create_worktree(
        repo_path,
        branch_name,
        &target,
        create_branch,
        base_ref,
    )?;

    query::worktree::get_worktree_info(&target)
}

pub fn remove_worktree(repo_path: &Path, worktree_path: &Path, force: bool) -> Result<()> {
    repository::worktree::remove_worktree(repo_path, worktree_path, force)
}

pub fn prune_worktrees(repo_path: &Path) -> Result<String> {
    repository::worktree::prune_worktrees(repo_path)
}

pub fn list_branches(repo_path: &Path) -> Result<Vec<String>> {
    let handle = RepoHandle::open(repo_path)?;
    handle.list_branches()
}

pub fn get_commit_history(
    worktree_path: &Path,
    max_count: usize,
) -> Result<Vec<crate::domain::commit::CommitEntry>> {
    query::history::get_history(worktree_path, max_count)
}
