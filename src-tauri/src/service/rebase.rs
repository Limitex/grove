use std::path::Path;

use crate::domain::error::Result;
use crate::domain::rebase::RebaseAction;
use crate::infra::repository;

pub fn squash_commits(worktree_path: &Path, count: usize, message: &str) -> Result<String> {
    repository::rebase::squash_commits(worktree_path, count, message)
}

pub fn cherry_pick(worktree_path: &Path, sha: &str) -> Result<String> {
    repository::rebase::cherry_pick(worktree_path, sha)
}

pub fn interactive_rebase(
    worktree_path: &Path,
    onto: &str,
    actions: &[RebaseAction],
) -> Result<String> {
    repository::rebase::interactive_rebase(worktree_path, onto, actions)
}

pub fn abort_rebase(worktree_path: &Path) -> Result<String> {
    repository::rebase::abort_rebase(worktree_path)
}

pub fn continue_rebase(worktree_path: &Path) -> Result<String> {
    repository::rebase::continue_rebase(worktree_path)
}
