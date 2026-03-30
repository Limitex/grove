use std::path::Path;
use std::process::Command;

use crate::domain::error::Result;
use crate::infra::repository::run_git_ok;

pub fn stage_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    run_git_ok(worktree_path, &["add", "--", file_path])
}

pub fn unstage_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    run_git_ok(worktree_path, &["restore", "--staged", "--", file_path])
}

pub fn stage_all(worktree_path: &Path) -> Result<()> {
    run_git_ok(worktree_path, &["add", "-A"])
}

pub fn unstage_all(worktree_path: &Path) -> Result<()> {
    run_git_ok(worktree_path, &["restore", "--staged", "."])
}

/// Discard unstaged changes to a tracked file, or remove an untracked file.
pub fn discard_file(worktree_path: &Path, file_path: &str) -> Result<()> {
    let output = Command::new("git")
        .args(["restore", "--", file_path])
        .current_dir(worktree_path)
        .output()?;

    if output.status.success() {
        return Ok(());
    }

    // Fallback: try cleaning untracked file
    run_git_ok(worktree_path, &["clean", "-f", "--", file_path])
}
