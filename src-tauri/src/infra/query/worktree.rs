use std::path::Path;

use git2::Repository;

use crate::domain::error::{GroveError, Result};
use crate::domain::worktree::WorktreeInfo;
use crate::infra::git_repo::{get_head_details, open_repo};
use crate::infra::query::status::compute_worktree_status_from_repo;

/// List all worktrees for the repository at `repo_path`.
pub fn list_worktrees(repo_path: &Path) -> Result<Vec<WorktreeInfo>> {
    let repo = open_repo(repo_path)?;
    let mut worktrees = Vec::new();

    if let Some(main_info) = build_worktree_info_for_main(&repo)? {
        worktrees.push(main_info);
    }

    let has_main = worktrees.iter().any(|w| w.is_main);
    let default_branch = if !has_main {
        let (branch, _, _) = get_head_details(&repo);
        branch
    } else {
        None
    };

    let wt_names = repo.worktrees()?;
    for name in wt_names.iter().flatten() {
        match build_worktree_info(&repo, name) {
            Ok(Some(mut info)) => {
                if !has_main {
                    if let (Some(ref db), Some(ref branch)) = (&default_branch, &info.branch) {
                        if db == branch {
                            info.is_main = true;
                        }
                    }
                }
                worktrees.push(info);
            }
            Ok(None) => {}
            Err(e) => {
                log::warn!("Failed to read worktree '{}': {}", name, e);
            }
        }
    }

    worktrees.sort_by(|a, b| {
        if a.is_main && !b.is_main {
            return std::cmp::Ordering::Less;
        }
        if !a.is_main && b.is_main {
            return std::cmp::Ordering::Greater;
        }
        b.status.last_commit_time.cmp(&a.status.last_commit_time)
    });

    Ok(worktrees)
}

/// Build WorktreeInfo for a single worktree path.
pub fn get_worktree_info(worktree_path: &Path) -> Result<WorktreeInfo> {
    let repo = Repository::open(worktree_path)?;
    let (branch, is_detached, head_short) = get_head_details(&repo);
    let status = compute_worktree_status_from_repo(&repo).unwrap_or_default();

    Ok(WorktreeInfo {
        path: worktree_path.to_path_buf(),
        branch,
        head_short,
        is_main: false,
        is_detached,
        status,
        label: None,
    })
}

fn build_worktree_info_for_main(repo: &Repository) -> Result<Option<WorktreeInfo>> {
    let workdir = if repo.is_bare() {
        return Ok(None);
    } else {
        repo.workdir()
            .ok_or_else(|| GroveError::Worktree("No workdir for main worktree".into()))?
            .to_path_buf()
    };

    let (branch, is_detached, head_short) = get_head_details(repo);
    let status = compute_worktree_status_from_repo(repo).unwrap_or_default();

    Ok(Some(WorktreeInfo {
        path: workdir,
        branch,
        head_short,
        is_main: true,
        is_detached,
        status,
        label: None,
    }))
}

fn build_worktree_info(repo: &Repository, name: &str) -> Result<Option<WorktreeInfo>> {
    let wt = repo.find_worktree(name)?;
    let wt_path = wt.path().to_path_buf();
    if !wt_path.exists() {
        return Ok(None);
    }

    let wt_repo = Repository::open(&wt_path)?;
    let (branch, is_detached, head_short) = get_head_details(&wt_repo);
    let status = compute_worktree_status_from_repo(&wt_repo).unwrap_or_default();

    Ok(Some(WorktreeInfo {
        path: wt_path,
        branch,
        head_short,
        is_main: false,
        is_detached,
        status,
        label: None,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::Signature;
    use std::process::Command;

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
    fn list_worktrees_normal_repo() {
        let (dir, _repo) = create_test_repo();
        let worktrees = list_worktrees(dir.path()).unwrap();
        // Normal repo has the main worktree
        assert_eq!(worktrees.len(), 1);
        assert!(worktrees[0].is_main);
        assert!(worktrees[0].branch.is_some());
    }

    #[test]
    fn list_worktrees_main_has_status() {
        let (dir, _repo) = create_test_repo();
        let worktrees = list_worktrees(dir.path()).unwrap();
        assert!(worktrees[0].status.is_clean);
        assert_eq!(worktrees[0].status.last_commit_message, "initial");
    }

    #[test]
    fn list_worktrees_with_additional_worktree() {
        let (dir, repo) = create_test_repo();

        // Create a branch and worktree via git CLI
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("feature", &head, false).unwrap();

        let wt_path = dir.path().join("feature-wt");
        Command::new("git")
            .args(["worktree", "add", &wt_path.to_string_lossy(), "feature"])
            .current_dir(dir.path())
            .output()
            .unwrap();

        let worktrees = list_worktrees(dir.path()).unwrap();
        assert_eq!(worktrees.len(), 2);

        // Main should come first
        assert!(worktrees[0].is_main);
        let feature_wt = worktrees.iter().find(|w| !w.is_main).unwrap();
        assert_eq!(feature_wt.branch.as_deref(), Some("feature"));
    }

    #[test]
    fn get_worktree_info_returns_correct_data() {
        let (dir, _repo) = create_test_repo();
        let info = get_worktree_info(dir.path()).unwrap();
        assert!(!info.is_main); // get_worktree_info always sets is_main = false
        assert!(!info.is_detached);
        assert!(info.branch.is_some());
        assert_eq!(info.head_short.len(), 7);
        assert!(info.status.is_clean);
    }

    #[test]
    fn list_worktrees_bare_repo_no_main() {
        let dir = tempfile::tempdir().unwrap();
        let bare_dir = dir.path().join(".bare");
        let repo = Repository::init_bare(&bare_dir).unwrap();

        // Bare repos need at least one commit for worktree operations.
        // Create a commit directly on refs/heads/main.
        {
            let sig = Signature::now("Test", "test@test.com").unwrap();
            let tree_id = repo.treebuilder(None).unwrap().write().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("refs/heads/main"), &sig, &sig, "initial", &tree, &[])
                .unwrap();
        }

        let worktrees = list_worktrees(dir.path()).unwrap();
        // Bare repo has no main worktree entry
        assert!(worktrees.iter().all(|w| !w.is_main) || worktrees.is_empty());
    }
}
