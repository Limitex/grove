use std::path::Path;

use crate::domain::error::Result;
use crate::infra::repository::run_git;

pub fn commit(worktree_path: &Path, message: &str) -> Result<String> {
    run_git(worktree_path, &["commit", "-m", message])
}

pub fn amend(worktree_path: &Path, message: Option<&str>) -> Result<String> {
    let mut args = vec!["commit", "--amend"];
    if let Some(msg) = message {
        args.push("-m");
        args.push(msg);
    } else {
        args.push("--no-edit");
    }
    run_git(worktree_path, &args)
}

pub fn revert(worktree_path: &Path, sha: &str) -> Result<String> {
    run_git(worktree_path, &["revert", "--no-edit", sha])
}

pub fn reset_to(worktree_path: &Path, sha: &str) -> Result<String> {
    run_git(worktree_path, &["reset", sha])
}
