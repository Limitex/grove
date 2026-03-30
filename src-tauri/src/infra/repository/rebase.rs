use std::io::Write;
use std::path::Path;
use std::process::Command;

use crate::domain::error::{GroveError, Result};
use crate::domain::rebase::RebaseAction;
use crate::infra::repository::run_git;

pub fn squash_commits(worktree_path: &Path, count: usize, message: &str) -> Result<String> {
    if count < 2 {
        return Err(GroveError::Worktree(
            "Need at least 2 commits to squash".into(),
        ));
    }

    let total_str = run_git(worktree_path, &["rev-list", "--count", "HEAD"])?;
    let total_commits: usize = total_str
        .trim()
        .parse()
        .map_err(|_| GroveError::Worktree("Failed to determine commit count".into()))?;

    if count >= total_commits {
        run_git(worktree_path, &["update-ref", "-d", "HEAD"])?;
    } else {
        run_git(
            worktree_path,
            &["reset", "--soft", &format!("HEAD~{}", count)],
        )?;
    }

    run_git(worktree_path, &["commit", "-m", message])
}

pub fn cherry_pick(worktree_path: &Path, sha: &str) -> Result<String> {
    run_git(worktree_path, &["cherry-pick", sha])
}

pub fn interactive_rebase(
    worktree_path: &Path,
    onto: &str,
    actions: &[RebaseAction],
) -> Result<String> {
    if actions.is_empty() {
        return Err(GroveError::Worktree("No rebase actions provided".into()));
    }

    let todo_content: String = actions
        .iter()
        .map(|a| format!("{} {}", a.action.as_str(), a.sha))
        .collect::<Vec<_>>()
        .join("\n");

    let mut temp = tempfile::NamedTempFile::new()?;
    temp.write_all(todo_content.as_bytes())?;
    temp.flush()?;
    let temp_path = temp.path().to_string_lossy().to_string();

    let editor_cmd = format!("cp {} \"$1\"", temp_path);

    let output = Command::new("git")
        .args(["rebase", "-i", onto])
        .env("GIT_SEQUENCE_EDITOR", format!("sh -c '{}'", editor_cmd))
        .current_dir(worktree_path)
        .output()?;

    drop(temp);

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).to_string();
        if stderr.contains("Successfully rebased") {
            Ok(stderr)
        } else if stderr.contains("CONFLICT") || stderr.contains("could not apply") {
            Err(GroveError::RebaseConflict(stderr.trim().to_string()))
        } else {
            let code = output
                .status
                .code()
                .map(|c| format!(" (exit code {})", c))
                .unwrap_or_default();
            Err(GroveError::Worktree(format!(
                "git rebase{}: {}",
                code,
                stderr.trim()
            )))
        }
    }
}

pub fn abort_rebase(worktree_path: &Path) -> Result<String> {
    run_git(worktree_path, &["rebase", "--abort"])
}

pub fn continue_rebase(worktree_path: &Path) -> Result<String> {
    run_git(worktree_path, &["rebase", "--continue"])
}
