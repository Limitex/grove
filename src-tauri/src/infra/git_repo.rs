use std::path::{Path, PathBuf};

use git2::Repository;

use crate::domain::error::{GroveError, Result};

/// Handle to a Git repository (bare or normal).
#[derive(Debug)]
pub struct RepoHandle {
    path: PathBuf,
    is_bare: bool,
}

impl RepoHandle {
    /// Open a repository from a path. Supports:
    /// - Normal repos (path to working directory)
    /// - Bare repos (path to .git or *.git directory)
    /// - Worktree directories (discovers the parent repo)
    pub fn open(path: &Path) -> Result<Self> {
        let bare_dir = path.join(".bare");
        if bare_dir.is_dir() {
            Repository::open_bare(&bare_dir)?;
            return Ok(Self {
                path: path.to_path_buf(),
                is_bare: true,
            });
        }

        let repo = Repository::discover(path)?;
        let is_bare = repo.is_bare();

        let repo_path = if is_bare {
            let bare_path = repo.path().to_path_buf();
            if bare_path.file_name().is_some_and(|n| n == ".bare") {
                bare_path.parent().unwrap_or(&bare_path).to_path_buf()
            } else {
                bare_path
            }
        } else {
            repo.workdir()
                .map(|p| p.to_path_buf())
                .unwrap_or_else(|| repo.path().to_path_buf())
        };

        Ok(Self {
            path: repo_path,
            is_bare,
        })
    }

    /// Get the underlying git2 Repository.
    pub fn repo(&self) -> Result<Repository> {
        if self.is_bare {
            let bare_dir = self.path.join(".bare");
            let bare_path = if bare_dir.is_dir() {
                &bare_dir
            } else {
                &self.path
            };
            Repository::open_bare(bare_path).map_err(GroveError::from)
        } else {
            Repository::open(&self.path).map_err(GroveError::from)
        }
    }

    pub fn path(&self) -> &Path {
        &self.path
    }

    pub fn is_bare(&self) -> bool {
        self.is_bare
    }

    /// List all local branches.
    pub fn list_branches(&self) -> Result<Vec<String>> {
        let repo = self.repo()?;
        let branches = repo.branches(Some(git2::BranchType::Local))?;
        let mut result = Vec::new();

        for branch in branches {
            let (branch, _) = branch?;
            if let Some(name) = branch.name()? {
                result.push(name.to_string());
            }
        }

        result.sort();
        Ok(result)
    }
}

/// Open a repository, handling .bare structure.
pub fn open_repo(repo_path: &Path) -> Result<Repository> {
    let bare_dir = repo_path.join(".bare");
    if bare_dir.is_dir() {
        return Repository::open_bare(&bare_dir).map_err(GroveError::from);
    }
    Repository::discover(repo_path).map_err(GroveError::from)
}

/// Get the short SHA from HEAD.
pub fn get_head_short(repo: &Repository) -> String {
    repo.head()
        .ok()
        .and_then(|h| h.target())
        .map(|oid| oid.to_string()[..7].to_string())
        .unwrap_or_else(|| "-------".to_string())
}

/// Get branch name, detached status, and short SHA from HEAD in one read.
pub fn get_head_details(repo: &Repository) -> (Option<String>, bool, String) {
    match repo.head() {
        Ok(head) => {
            let short = head
                .target()
                .map(|oid| oid.to_string()[..7].to_string())
                .unwrap_or_else(|| "-------".to_string());
            if head.is_branch() {
                (head.shorthand().map(|s| s.to_string()), false, short)
            } else {
                (None, true, short)
            }
        }
        Err(_) => (None, true, "-------".to_string()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    /// Create a minimal git repo for testing. Returns (TempDir, Repository).
    fn create_test_repo() -> (tempfile::TempDir, Repository) {
        let dir = tempfile::tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();

        // Create an initial commit so HEAD exists
        {
            let sig = git2::Signature::now("Test", "test@test.com").unwrap();
            let tree_id = repo.index().unwrap().write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
                .unwrap();
        }

        (dir, repo)
    }

    #[test]
    fn repo_handle_open_normal_repo() {
        let (dir, _repo) = create_test_repo();
        let handle = RepoHandle::open(dir.path()).unwrap();
        assert!(!handle.is_bare());
        assert_eq!(handle.path(), dir.path());
    }

    #[test]
    fn repo_handle_open_nonexistent_fails() {
        let result = RepoHandle::open(Path::new("/nonexistent/path/to/repo"));
        assert!(result.is_err());
    }

    #[test]
    fn repo_handle_list_branches() {
        let (dir, _repo) = create_test_repo();
        let handle = RepoHandle::open(dir.path()).unwrap();
        let branches = handle.list_branches().unwrap();
        assert!(branches.contains(&"main".to_string()) || branches.contains(&"master".to_string()));
    }

    #[test]
    fn repo_handle_list_branches_multiple() {
        let (dir, repo) = create_test_repo();
        // Create another branch
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        repo.branch("feature-branch", &head, false).unwrap();

        let handle = RepoHandle::open(dir.path()).unwrap();
        let branches = handle.list_branches().unwrap();
        assert_eq!(branches.len(), 2);
        assert!(branches.contains(&"feature-branch".to_string()));
    }

    #[test]
    fn open_repo_normal() {
        let (dir, _repo) = create_test_repo();
        let repo = open_repo(dir.path()).unwrap();
        assert!(!repo.is_bare());
    }

    #[test]
    fn get_head_details_on_branch() {
        let (dir, _repo) = create_test_repo();
        let repo = open_repo(dir.path()).unwrap();
        let (branch, is_detached, short) = get_head_details(&repo);
        assert!(branch.is_some());
        assert!(!is_detached);
        assert_eq!(short.len(), 7);
    }

    #[test]
    fn get_head_details_detached() {
        let (dir, repo) = create_test_repo();
        let oid = repo.head().unwrap().target().unwrap();
        repo.set_head_detached(oid).unwrap();

        let repo = open_repo(dir.path()).unwrap();
        let (branch, is_detached, short) = get_head_details(&repo);
        assert!(branch.is_none());
        assert!(is_detached);
        assert_eq!(short.len(), 7);
    }

    #[test]
    fn repo_handle_bare_with_dot_bare() {
        let dir = tempfile::tempdir().unwrap();
        let bare_dir = dir.path().join(".bare");
        Repository::init_bare(&bare_dir).unwrap();

        let handle = RepoHandle::open(dir.path()).unwrap();
        assert!(handle.is_bare());
        assert_eq!(handle.path(), dir.path());
    }

    #[test]
    fn get_head_short_returns_7_chars() {
        let (_dir, repo) = create_test_repo();
        let short = get_head_short(&repo);
        assert_eq!(short.len(), 7);
        // Should be valid hex
        assert!(short.chars().all(|c| c.is_ascii_hexdigit()));
    }

    #[test]
    fn repo_handle_repo_method_returns_valid_repo() {
        let (dir, _repo) = create_test_repo();
        let handle = RepoHandle::open(dir.path()).unwrap();
        let repo = handle.repo().unwrap();
        assert!(!repo.is_bare());
        assert!(repo.head().is_ok());
    }

    #[test]
    fn worktree_discovery_from_subdirectory() {
        let (dir, _repo) = create_test_repo();
        let sub_dir = dir.path().join("subdir");
        fs::create_dir_all(&sub_dir).unwrap();

        let handle = RepoHandle::open(&sub_dir).unwrap();
        assert_eq!(handle.path(), dir.path());
    }
}
