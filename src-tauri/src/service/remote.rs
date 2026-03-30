use std::path::Path;

use crate::domain::error::Result;
use crate::infra::repository;

pub fn fetch_all(repo_path: &Path) -> Result<String> {
    repository::remote::fetch_all(repo_path)
}

pub fn pull_worktree(worktree_path: &Path) -> Result<String> {
    repository::remote::pull(worktree_path)
}

pub fn push_worktree(worktree_path: &Path) -> Result<String> {
    repository::remote::push(worktree_path)
}
