use std::path::Path;
use std::process::Command;

use crate::domain::error::{GroveError, Result};
use crate::infra::git_repo::open_repo;
use crate::infra::repository::run_git;

/// Create a new worktree.
pub fn create_worktree(
    repo_path: &Path,
    branch_name: &str,
    target_path: &Path,
    create_branch: bool,
    base_ref: Option<&str>,
) -> Result<()> {
    let repo = open_repo(repo_path)?;

    if target_path.exists() && target_path.read_dir()?.next().is_some() {
        return Err(GroveError::Worktree(format!(
            "Target directory is not empty: {}",
            target_path.display()
        )));
    }

    std::fs::create_dir_all(target_path)?;

    if create_branch {
        let base_commit = if let Some(refname) = base_ref {
            let obj = repo.revparse_single(refname)?;
            obj.peel_to_commit()?.id()
        } else {
            repo.head()?.peel_to_commit()?.id()
        };

        let commit = repo.find_commit(base_commit)?;
        repo.branch(branch_name, &commit, false)?;
    }

    let output = Command::new("git")
        .args([
            "worktree",
            "add",
            &target_path.to_string_lossy(),
            branch_name,
        ])
        .current_dir(repo_path)
        .output()?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let code = output
            .status
            .code()
            .map(|c| format!(" (exit code {})", c))
            .unwrap_or_default();
        return Err(GroveError::Worktree(format!(
            "git worktree add{}: {}",
            code,
            stderr.trim()
        )));
    }

    Ok(())
}

/// Remove a worktree.
pub fn remove_worktree(repo_path: &Path, worktree_path: &Path, force: bool) -> Result<()> {
    let mut args = vec!["worktree", "remove"];
    if force {
        args.push("--force");
    }
    let wt_str = worktree_path.to_string_lossy();
    args.push(&wt_str);

    run_git(repo_path, &args)?;
    Ok(())
}

/// Prune stale worktrees.
pub fn prune_worktrees(repo_path: &Path) -> Result<String> {
    run_git(repo_path, &["worktree", "prune", "--verbose"])
}
