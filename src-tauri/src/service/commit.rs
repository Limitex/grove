use std::path::Path;

use crate::domain::error::Result;
use crate::infra::repository;

pub fn git_commit(worktree_path: &Path, message: &str) -> Result<String> {
    repository::commit::commit(worktree_path, message)
}

pub fn amend_commit(worktree_path: &Path, message: Option<&str>) -> Result<String> {
    repository::commit::amend(worktree_path, message)
}

pub fn revert_commit(worktree_path: &Path, sha: &str) -> Result<String> {
    repository::commit::revert(worktree_path, sha)
}

pub fn reset_to_commit(worktree_path: &Path, sha: &str) -> Result<String> {
    repository::commit::reset_to(worktree_path, sha)
}
