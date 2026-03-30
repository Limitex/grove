use std::path::Path;

use crate::domain::error::Result;
use crate::infra::repository;

pub fn stage_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    repository::staging::stage_file(worktree_path, file_path)
}

pub fn unstage_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    repository::staging::unstage_file(worktree_path, file_path)
}

pub fn stage_all(worktree_path: &Path) -> Result<()> {
    repository::staging::stage_all(worktree_path)
}

pub fn unstage_all(worktree_path: &Path) -> Result<()> {
    repository::staging::unstage_all(worktree_path)
}

pub fn discard_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    repository::staging::discard_file(worktree_path, file_path)
}
