use std::path::Path;

use crate::domain::diff::{CommitChangedFile, FileDiff};
use crate::domain::error::Result;
use crate::domain::worktree::ChangedFile;
use crate::infra::query;

pub fn get_changed_files(worktree_path: &Path) -> Result<Vec<ChangedFile>> {
    query::status::changed_files(worktree_path)
}

pub fn get_file_diff(worktree_path: &Path, file_path: &str, staged: bool) -> Result<FileDiff> {
    query::diff::file_diff(worktree_path, file_path, staged)
}

pub fn get_commit_changed_files(worktree_path: &Path, sha: &str) -> Result<Vec<CommitChangedFile>> {
    query::diff::commit_changed_files(worktree_path, sha)
}

pub fn get_commit_full_diff(worktree_path: &Path, sha: &str) -> Result<Vec<FileDiff>> {
    query::diff::commit_full_diff(worktree_path, sha)
}

pub fn get_commit_file_diff(worktree_path: &Path, sha: &str, file_path: &str) -> Result<FileDiff> {
    query::diff::commit_file_diff(worktree_path, sha, file_path)
}

pub fn get_range_changed_files(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
) -> Result<Vec<CommitChangedFile>> {
    query::diff::range_changed_files(worktree_path, from_sha, to_sha)
}

pub fn get_range_full_diff(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
) -> Result<Vec<FileDiff>> {
    query::diff::range_full_diff(worktree_path, from_sha, to_sha)
}

pub fn get_range_file_diff(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
    file_path: &str,
) -> Result<FileDiff> {
    query::diff::range_file_diff(worktree_path, from_sha, to_sha, file_path)
}
