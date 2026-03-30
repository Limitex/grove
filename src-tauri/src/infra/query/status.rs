use std::path::Path;

use git2::{Repository, StatusOptions};

use crate::domain::error::Result;
use crate::domain::worktree::{ChangedFile, FileArea, FileStatus, WorktreeStatus};

/// Compute the status for a worktree at the given path.
pub fn compute_worktree_status(worktree_path: &Path) -> Result<WorktreeStatus> {
    let repo = Repository::open(worktree_path)?;
    compute_worktree_status_from_repo(&repo)
}

/// Compute the status for a worktree using an already-opened repository.
pub fn compute_worktree_status_from_repo(repo: &Repository) -> Result<WorktreeStatus> {
    let mut status = WorktreeStatus::default();

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts))?;

    for entry in statuses.iter() {
        let s = entry.status();

        if s.is_conflicted() {
            status.conflicted += 1;
        } else if s.is_index_new()
            || s.is_index_modified()
            || s.is_index_deleted()
            || s.is_index_renamed()
            || s.is_index_typechange()
        {
            status.staged += 1;
        }

        if s.is_wt_modified() || s.is_wt_deleted() || s.is_wt_typechange() || s.is_wt_renamed() {
            status.modified += 1;
        }

        if s.is_wt_new() {
            status.untracked += 1;
        }
    }

    if let Ok(head) = repo.head() {
        if let Some(oid) = head.target() {
            if let Ok(commit) = repo.find_commit(oid) {
                status.last_commit_time = commit.time().seconds();
                status.last_commit_message = commit.summary().unwrap_or("").to_string();
            }

            if let Ok(local_branch) =
                repo.find_branch(head.shorthand().unwrap_or(""), git2::BranchType::Local)
            {
                if let Ok(upstream) = local_branch.upstream() {
                    if let Some(upstream_oid) = upstream.get().target() {
                        if let Ok((ahead, behind)) = repo.graph_ahead_behind(oid, upstream_oid) {
                            status.ahead = ahead as u32;
                            status.behind = behind as u32;
                        }
                    }
                }
            }
        }
    }

    status.is_clean = status.modified == 0 && status.staged == 0 && status.conflicted == 0;

    Ok(status)
}

/// Get the list of changed files in a worktree.
pub fn changed_files(worktree_path: &Path) -> Result<Vec<ChangedFile>> {
    let repo = Repository::open(worktree_path)?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts))?;
    let mut files = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();

        if s.is_conflicted() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Conflicted,
                area: FileArea::Conflicted,
            });
            continue;
        }

        // Index (staged) changes
        if s.is_index_new() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Added,
                area: FileArea::Staged,
            });
        } else if s.is_index_modified() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Modified,
                area: FileArea::Staged,
            });
        } else if s.is_index_deleted() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Deleted,
                area: FileArea::Staged,
            });
        } else if s.is_index_renamed() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Renamed,
                area: FileArea::Staged,
            });
        } else if s.is_index_typechange() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::TypeChanged,
                area: FileArea::Staged,
            });
        }

        // Working tree changes
        if s.is_wt_modified() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Modified,
                area: FileArea::Unstaged,
            });
        } else if s.is_wt_deleted() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Deleted,
                area: FileArea::Unstaged,
            });
        } else if s.is_wt_renamed() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::Renamed,
                area: FileArea::Unstaged,
            });
        } else if s.is_wt_typechange() {
            files.push(ChangedFile {
                path: path.clone(),
                status: FileStatus::TypeChanged,
                area: FileArea::Unstaged,
            });
        }

        if s.is_wt_new() {
            files.push(ChangedFile {
                path,
                status: FileStatus::Untracked,
                area: FileArea::Untracked,
            });
        }
    }

    Ok(files)
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::{Repository, Signature};
    use std::fs;

    /// Create a test repo with an initial commit.
    fn create_test_repo() -> (tempfile::TempDir, Repository) {
        let dir = tempfile::tempdir().unwrap();
        let repo = Repository::init(dir.path()).unwrap();

        {
            let sig = Signature::now("Test", "test@test.com").unwrap();
            let tree_id = repo.index().unwrap().write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
                .unwrap();
        }

        (dir, repo)
    }

    #[test]
    fn clean_repo_status() {
        let (dir, _repo) = create_test_repo();
        let status = compute_worktree_status(dir.path()).unwrap();
        assert!(status.is_clean);
        assert_eq!(status.modified, 0);
        assert_eq!(status.staged, 0);
        assert_eq!(status.untracked, 0);
        assert_eq!(status.conflicted, 0);
    }

    #[test]
    fn untracked_file_detected() {
        let (dir, _repo) = create_test_repo();
        fs::write(dir.path().join("new_file.txt"), "hello").unwrap();

        let status = compute_worktree_status(dir.path()).unwrap();
        assert_eq!(status.untracked, 1);
        // Untracked files don't affect is_clean
        assert!(status.is_clean);
    }

    #[test]
    fn modified_file_detected() {
        let (dir, repo) = create_test_repo();

        // Create and commit a file
        let file_path = dir.path().join("file.txt");
        fs::write(&file_path, "original").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("file.txt")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "add file", &tree, &[&head])
            .unwrap();

        // Modify the file
        fs::write(&file_path, "modified").unwrap();

        let status = compute_worktree_status(dir.path()).unwrap();
        assert_eq!(status.modified, 1);
        assert!(!status.is_clean);
    }

    #[test]
    fn staged_file_detected() {
        let (dir, repo) = create_test_repo();

        // Create and stage a new file
        fs::write(dir.path().join("staged.txt"), "content").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("staged.txt")).unwrap();
        index.write().unwrap();

        let status = compute_worktree_status(dir.path()).unwrap();
        assert_eq!(status.staged, 1);
        assert!(!status.is_clean);
    }

    #[test]
    fn last_commit_info_populated() {
        let (dir, _repo) = create_test_repo();
        let status = compute_worktree_status(dir.path()).unwrap();
        assert!(status.last_commit_time > 0);
        assert_eq!(status.last_commit_message, "initial commit");
    }

    #[test]
    fn changed_files_untracked() {
        let (dir, _repo) = create_test_repo();
        fs::write(dir.path().join("new.txt"), "hello").unwrap();

        let files = changed_files(dir.path()).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "new.txt");
        assert!(matches!(files[0].status, FileStatus::Untracked));
        assert!(matches!(files[0].area, FileArea::Untracked));
    }

    #[test]
    fn changed_files_staged_new() {
        let (dir, repo) = create_test_repo();
        fs::write(dir.path().join("added.txt"), "content").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("added.txt")).unwrap();
        index.write().unwrap();

        let files = changed_files(dir.path()).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "added.txt");
        assert!(matches!(files[0].status, FileStatus::Added));
        assert!(matches!(files[0].area, FileArea::Staged));
    }

    #[test]
    fn changed_files_mixed_staged_and_modified() {
        let (dir, repo) = create_test_repo();

        // Commit a file
        let file_path = dir.path().join("file.txt");
        fs::write(&file_path, "original").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("file.txt")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "add file", &tree, &[&head])
            .unwrap();

        // Stage a new file and modify the committed one
        fs::write(dir.path().join("new.txt"), "new").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("new.txt")).unwrap();
        index.write().unwrap();
        fs::write(&file_path, "changed").unwrap();

        let files = changed_files(dir.path()).unwrap();
        assert!(files.len() >= 2);

        let staged: Vec<_> = files
            .iter()
            .filter(|f| matches!(f.area, FileArea::Staged))
            .collect();
        let unstaged: Vec<_> = files
            .iter()
            .filter(|f| matches!(f.area, FileArea::Unstaged))
            .collect();
        assert_eq!(staged.len(), 1);
        assert_eq!(unstaged.len(), 1);
    }

    #[test]
    fn changed_files_deleted() {
        let (dir, repo) = create_test_repo();

        // Commit a file then delete it
        fs::write(dir.path().join("to_delete.txt"), "bye").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("to_delete.txt")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, "add file", &tree, &[&head])
            .unwrap();

        fs::remove_file(dir.path().join("to_delete.txt")).unwrap();

        let files = changed_files(dir.path()).unwrap();
        assert_eq!(files.len(), 1);
        assert!(matches!(files[0].status, FileStatus::Deleted));
        assert!(matches!(files[0].area, FileArea::Unstaged));
    }

    #[test]
    fn empty_repo_has_no_changed_files() {
        let (dir, _repo) = create_test_repo();
        let files = changed_files(dir.path()).unwrap();
        assert!(files.is_empty());
    }
}
