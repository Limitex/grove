use std::path::Path;

use crate::domain::error::Result;
use crate::infra::repository::run_git_combined;

pub fn fetch_all(repo_path: &Path) -> Result<String> {
    run_git_combined(repo_path, &["fetch", "--all", "--prune"])
}

pub fn pull(worktree_path: &Path) -> Result<String> {
    run_git_combined(worktree_path, &["pull", "--ff-only"])
}

pub fn push(worktree_path: &Path) -> Result<String> {
    run_git_combined(worktree_path, &["push"])
}
