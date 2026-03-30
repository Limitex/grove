pub mod clone;
pub mod commit;
pub mod rebase;
pub mod remote;
pub mod staging;
pub mod worktree;

use std::path::Path;
use std::process::Command;

use crate::domain::error::{GroveError, Result};

/// Run a git command and return stdout on success, or a detailed error.
///
/// The error message includes the command, exit code, and stderr content
/// for easier debugging.
pub fn run_git(dir: &Path, args: &[&str]) -> Result<String> {
    let output = Command::new("git").args(args).current_dir(dir).output()?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let code = output
            .status
            .code()
            .map(|c| format!(" (exit code {})", c))
            .unwrap_or_default();
        Err(GroveError::Worktree(format!(
            "git {}{}: {}",
            args.first().unwrap_or(&""),
            code,
            stderr
        )))
    }
}

/// Run a git command, returning Ok(()) on success or a detailed error.
pub fn run_git_ok(dir: &Path, args: &[&str]) -> Result<()> {
    run_git(dir, args)?;
    Ok(())
}

/// Run a git command, returning stdout+stderr combined on success.
pub fn run_git_combined(dir: &Path, args: &[&str]) -> Result<String> {
    let output = Command::new("git").args(args).current_dir(dir).output()?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        let stderr = String::from_utf8_lossy(&output.stderr);
        let mut result = stdout.into_owned();
        if !stderr.is_empty() {
            if !result.is_empty() {
                result.push('\n');
            }
            result.push_str(&stderr);
        }
        Ok(result)
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        let code = output
            .status
            .code()
            .map(|c| format!(" (exit code {})", c))
            .unwrap_or_default();
        Err(GroveError::Worktree(format!(
            "git {}{}: {}",
            args.first().unwrap_or(&""),
            code,
            stderr
        )))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature};

    fn create_test_repo() -> (tempfile::TempDir, Repository) {
        let dir = tempfile::tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();
        {
            let sig = Signature::now("Test", "test@test.com").unwrap();
            let tree_id = repo.index().unwrap().write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "initial", &tree, &[])
                .unwrap();
        }
        (dir, repo)
    }

    #[test]
    fn run_git_status_succeeds() {
        let (dir, _repo) = create_test_repo();
        let output = run_git(dir.path(), &["status", "--porcelain"]).unwrap();
        assert!(output.is_empty() || output.contains("??"));
    }

    #[test]
    fn run_git_invalid_command_fails() {
        let (dir, _repo) = create_test_repo();
        let result = run_git(dir.path(), &["not-a-real-command"]);
        assert!(result.is_err());
    }

    #[test]
    fn run_git_ok_succeeds() {
        let (dir, _repo) = create_test_repo();
        run_git_ok(dir.path(), &["status"]).unwrap();
    }

    #[test]
    fn run_git_ok_fails_on_error() {
        let (dir, _repo) = create_test_repo();
        let result = run_git_ok(dir.path(), &["checkout", "nonexistent-branch"]);
        assert!(result.is_err());
    }

    #[test]
    fn run_git_error_contains_command_name() {
        let (dir, _repo) = create_test_repo();
        let err = run_git(dir.path(), &["checkout", "nonexistent-branch"]).unwrap_err();
        assert!(err.to_string().contains("checkout"));
    }

    #[test]
    fn run_git_combined_succeeds() {
        let (dir, _repo) = create_test_repo();
        let output = run_git_combined(dir.path(), &["log", "--oneline", "-1"]).unwrap();
        assert!(output.contains("initial"));
    }

    #[test]
    fn run_git_combined_error() {
        let (dir, _repo) = create_test_repo();
        let result = run_git_combined(dir.path(), &["not-a-command"]);
        assert!(result.is_err());
    }

    #[test]
    fn run_git_returns_stdout() {
        let (dir, _repo) = create_test_repo();
        let output = run_git(dir.path(), &["rev-parse", "HEAD"]).unwrap();
        let sha = output.trim();
        assert_eq!(sha.len(), 40);
        assert!(sha.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
