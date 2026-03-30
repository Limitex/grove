use std::path::{Path, PathBuf};
use std::process::Command;

use crate::domain::error::{GroveError, Result};

/// Extract repository name from a URL.
pub fn repo_name_from_url(url: &str) -> String {
    url.trim_end_matches('/')
        .rsplit('/')
        .next()
        .unwrap_or("repo")
        .trim_end_matches(".git")
        .to_string()
}

/// Clone a repository as bare into clone_dir/<name>/.bare,
/// then create a worktree for the default branch.
pub fn clone_repo(url: &str, clone_dir: &Path, name: Option<&str>) -> Result<PathBuf> {
    let repo_name = name
        .map(|n| n.to_string())
        .unwrap_or_else(|| repo_name_from_url(url));

    let repo_dir = clone_dir.join(&repo_name);
    let bare_dir = repo_dir.join(".bare");

    if bare_dir.exists() {
        return Err(GroveError::Worktree(format!(
            "Repository already exists at {}",
            repo_dir.display()
        )));
    }

    std::fs::create_dir_all(&repo_dir)?;

    let output = Command::new("git")
        .args(["clone", "--bare", url, ".bare"])
        .current_dir(&repo_dir)
        .output()?;

    if !output.status.success() {
        let _ = std::fs::remove_dir_all(&repo_dir);
        return Err(GroveError::Worktree(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    std::fs::write(repo_dir.join(".git"), "gitdir: .bare\n")?;

    let _ = Command::new("git")
        .args([
            "config",
            "remote.origin.fetch",
            "+refs/heads/*:refs/remotes/origin/*",
        ])
        .current_dir(&bare_dir)
        .output();

    let _ = Command::new("git")
        .args(["fetch", "origin"])
        .current_dir(&bare_dir)
        .output();

    let default_branch = detect_default_branch(&bare_dir).unwrap_or_else(|| "main".to_string());

    let wt_dir = repo_dir.join(&default_branch);
    let output = Command::new("git")
        .args([
            "worktree",
            "add",
            &wt_dir.to_string_lossy(),
            &default_branch,
        ])
        .current_dir(&bare_dir)
        .output()?;

    if !output.status.success() {
        let _ = Command::new("git")
            .args([
                "worktree",
                "add",
                &wt_dir.to_string_lossy(),
                &format!("origin/{}", default_branch),
                "-b",
                &default_branch,
            ])
            .current_dir(&bare_dir)
            .output();
    }

    Ok(bare_dir)
}

/// Convert an existing (non-bare) repository to .bare worktree structure.
pub fn convert_to_bare(repo_path: &Path) -> Result<PathBuf> {
    let git_dir = repo_path.join(".git");
    if !git_dir.is_dir() {
        return Err(GroveError::Worktree(
            "Not a git repository (no .git directory found)".to_string(),
        ));
    }

    let bare_dir = repo_path.join(".bare");
    if bare_dir.exists() {
        return Err(GroveError::Worktree(
            "Already has .bare structure".to_string(),
        ));
    }

    let output = Command::new("git")
        .args(["rev-parse", "--abbrev-ref", "HEAD"])
        .current_dir(repo_path)
        .output()?;

    let branch = if output.status.success() {
        let b = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if b == "HEAD" {
            "main".to_string()
        } else {
            b
        }
    } else {
        "main".to_string()
    };

    let wt_dir = repo_path.join(&branch);
    if wt_dir.exists() {
        return Err(GroveError::Worktree(format!(
            "Directory '{}' already exists — conflicts with worktree directory",
            branch
        )));
    }

    let entries: Vec<_> = std::fs::read_dir(repo_path)?
        .filter_map(|e| e.ok())
        .filter(|e| e.file_name() != ".git")
        .collect();

    std::fs::rename(&git_dir, &bare_dir)?;

    let rollback_bare = |bare: &Path, git: &Path| {
        let _ = std::fs::rename(bare, git);
    };

    if let Err(e) = Command::new("git")
        .args(["config", "core.bare", "true"])
        .current_dir(&bare_dir)
        .output()
    {
        rollback_bare(&bare_dir, &git_dir);
        return Err(GroveError::Worktree(format!(
            "Failed to set core.bare: {}",
            e
        )));
    }

    if let Err(e) = std::fs::write(repo_path.join(".git"), "gitdir: .bare\n") {
        rollback_bare(&bare_dir, &git_dir);
        return Err(GroveError::Io(e));
    }

    let tmp_dir = repo_path.join(".grove_convert_tmp");
    if let Err(e) = std::fs::create_dir_all(&tmp_dir) {
        // Restore .git file and bare dir
        let _ = std::fs::remove_file(repo_path.join(".git"));
        rollback_bare(&bare_dir, &git_dir);
        return Err(GroveError::Io(e));
    }
    for entry in &entries {
        let dest = tmp_dir.join(entry.file_name());
        std::fs::rename(entry.path(), &dest)?;
    }

    let _ = Command::new("git")
        .args([
            "config",
            "remote.origin.fetch",
            "+refs/heads/*:refs/remotes/origin/*",
        ])
        .current_dir(&bare_dir)
        .output();

    let output = Command::new("git")
        .args(["worktree", "add", &wt_dir.to_string_lossy(), &branch])
        .current_dir(&bare_dir)
        .output()?;

    if !output.status.success() {
        let output2 = Command::new("git")
            .args([
                "worktree",
                "add",
                "--force",
                &wt_dir.to_string_lossy(),
                &branch,
            ])
            .current_dir(&bare_dir)
            .output()?;

        if !output2.status.success() {
            // Restore working files
            for entry in std::fs::read_dir(&tmp_dir)?.filter_map(|e| e.ok()) {
                let dest = repo_path.join(entry.file_name());
                let _ = std::fs::rename(entry.path(), &dest);
            }
            let _ = std::fs::remove_dir_all(&tmp_dir);
            // Restore .git structure
            let _ = std::fs::remove_file(repo_path.join(".git"));
            rollback_bare(&bare_dir, &git_dir);
            let stderr = String::from_utf8_lossy(&output2.stderr);
            return Err(GroveError::Worktree(format!(
                "git worktree add failed: {}",
                stderr.trim()
            )));
        }
    }

    for entry in std::fs::read_dir(&tmp_dir)?.filter_map(|e| e.ok()) {
        let dest = wt_dir.join(entry.file_name());
        if dest.exists() {
            if dest.is_dir() {
                let _ = std::fs::remove_dir_all(&dest);
            } else {
                let _ = std::fs::remove_file(&dest);
            }
        }
        std::fs::rename(entry.path(), &dest)?;
    }
    let _ = std::fs::remove_dir_all(&tmp_dir);

    Ok(repo_path.to_path_buf())
}

fn detect_default_branch(bare_dir: &Path) -> Option<String> {
    let output = Command::new("git")
        .args(["symbolic-ref", "HEAD"])
        .current_dir(bare_dir)
        .output()
        .ok()?;

    if output.status.success() {
        let refname = String::from_utf8_lossy(&output.stdout).trim().to_string();
        return refname.strip_prefix("refs/heads/").map(|s| s.to_string());
    }

    for branch in &["main", "master"] {
        let output = Command::new("git")
            .args(["rev-parse", "--verify", &format!("refs/heads/{}", branch)])
            .current_dir(bare_dir)
            .output()
            .ok()?;
        if output.status.success() {
            return Some(branch.to_string());
        }
    }

    None
}
