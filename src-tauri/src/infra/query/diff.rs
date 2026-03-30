use std::cell::RefCell;
use std::path::Path;

use git2::{Diff, DiffFormat, DiffOptions, Oid, Repository, Tree};

use crate::domain::diff::{CommitChangedFile, DiffHunk, DiffLine, FileDiff};
use crate::domain::error::Result;

/// Parse a single-file diff from a git2 Diff object into a FileDiff.
fn parse_single_file_diff(diff: &Diff, file_path: &str) -> Result<FileDiff> {
    let result = RefCell::new(FileDiff {
        path: file_path.to_string(),
        is_binary: false,
        hunks: Vec::new(),
    });

    diff.print(DiffFormat::Patch, |delta, hunk, line| {
        let mut r = result.borrow_mut();

        if delta.flags().is_binary() {
            r.is_binary = true;
            return true;
        }

        match line.origin() {
            'H' => {
                let header = hunk
                    .map(|h| String::from_utf8_lossy(h.header()).trim_end().to_string())
                    .unwrap_or_default();
                r.hunks.push(DiffHunk {
                    header,
                    lines: Vec::new(),
                });
            }
            '+' | '-' | ' ' => {
                if r.hunks.is_empty() {
                    r.hunks.push(DiffHunk {
                        header: String::new(),
                        lines: Vec::new(),
                    });
                }
                if let Some(current_hunk) = r.hunks.last_mut() {
                    current_hunk.lines.push(DiffLine {
                        origin: line.origin(),
                        content: String::from_utf8_lossy(line.content()).to_string(),
                        old_lineno: line.old_lineno(),
                        new_lineno: line.new_lineno(),
                    });
                }
            }
            _ => {}
        }
        true
    })?;

    Ok(result.into_inner())
}

/// Parse a multi-file diff from a git2 Diff object into a Vec<FileDiff>.
fn parse_multi_file_diff(diff: &Diff) -> Result<Vec<FileDiff>> {
    let files: RefCell<Vec<FileDiff>> = RefCell::new(Vec::new());

    diff.print(DiffFormat::Patch, |delta, hunk, line| {
        let mut fs = files.borrow_mut();
        let current_path = delta
            .new_file()
            .path()
            .or_else(|| delta.old_file().path())
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        if fs.last().is_none_or(|f| f.path != current_path) {
            fs.push(FileDiff {
                path: current_path,
                is_binary: delta.flags().is_binary(),
                hunks: Vec::new(),
            });
        }

        let Some(file) = fs.last_mut() else {
            return true;
        };
        if file.is_binary {
            return true;
        }

        match line.origin() {
            'H' => {
                let header = hunk
                    .map(|h| String::from_utf8_lossy(h.header()).trim_end().to_string())
                    .unwrap_or_default();
                file.hunks.push(DiffHunk {
                    header,
                    lines: Vec::new(),
                });
            }
            '+' | '-' | ' ' => {
                if file.hunks.is_empty() {
                    file.hunks.push(DiffHunk {
                        header: String::new(),
                        lines: Vec::new(),
                    });
                }
                if let Some(current_hunk) = file.hunks.last_mut() {
                    current_hunk.lines.push(DiffLine {
                        origin: line.origin(),
                        content: String::from_utf8_lossy(line.content()).to_string(),
                        old_lineno: line.old_lineno(),
                        new_lineno: line.new_lineno(),
                    });
                }
            }
            _ => {}
        }
        true
    })?;

    Ok(files.into_inner())
}

fn diff_trees_with_context<'a>(
    repo: &'a Repository,
    old: Option<&Tree<'a>>,
    new: Option<&Tree<'a>>,
    pathspec: Option<&str>,
) -> Result<Diff<'a>> {
    let mut diff_opts = DiffOptions::new();
    diff_opts.context_lines(3);
    if let Some(path) = pathspec {
        diff_opts.pathspec(path);
    }
    let diff = repo.diff_tree_to_tree(old, new, Some(&mut diff_opts))?;
    Ok(diff)
}

fn collect_changed_files(diff: &Diff) -> Result<Vec<CommitChangedFile>> {
    let mut files = Vec::new();
    diff.foreach(
        &mut |delta, _| {
            let path = delta
                .new_file()
                .path()
                .or_else(|| delta.old_file().path())
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();

            let status = match delta.status() {
                git2::Delta::Added => "Added",
                git2::Delta::Deleted => "Deleted",
                git2::Delta::Renamed => "Renamed",
                _ => "Modified",
            };

            files.push(CommitChangedFile {
                path,
                status: status.to_string(),
            });
            true
        },
        None,
        None,
        None,
    )?;
    Ok(files)
}

/// Get the diff for a specific file in a worktree.
pub fn file_diff(worktree_path: &Path, file_path: &str, staged: bool) -> Result<FileDiff> {
    let repo = Repository::open(worktree_path)?;

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path);
    diff_opts.context_lines(3);

    let diff = if staged {
        let head_tree = repo.head().ok().and_then(|h| h.peel_to_tree().ok());
        repo.diff_tree_to_index(head_tree.as_ref(), None, Some(&mut diff_opts))?
    } else {
        diff_opts.include_untracked(true);
        diff_opts.show_untracked_content(true);
        repo.diff_index_to_workdir(None, Some(&mut diff_opts))?
    };

    parse_single_file_diff(&diff, file_path)
}

pub fn commit_changed_files(worktree_path: &Path, sha: &str) -> Result<Vec<CommitChangedFile>> {
    let repo = Repository::open(worktree_path)?;
    let commit = repo.find_commit(Oid::from_str(sha)?)?;
    let tree = commit.tree()?;
    let parent_tree = commit.parent(0).ok().and_then(|p| p.tree().ok());
    let diff = repo.diff_tree_to_tree(parent_tree.as_ref(), Some(&tree), None)?;
    collect_changed_files(&diff)
}

pub fn commit_full_diff(worktree_path: &Path, sha: &str) -> Result<Vec<FileDiff>> {
    let repo = Repository::open(worktree_path)?;
    let commit = repo.find_commit(Oid::from_str(sha)?)?;
    let tree = commit.tree()?;
    let parent_tree = commit.parent(0).ok().and_then(|p| p.tree().ok());
    let diff = diff_trees_with_context(&repo, parent_tree.as_ref(), Some(&tree), None)?;
    parse_multi_file_diff(&diff)
}

pub fn commit_file_diff(worktree_path: &Path, sha: &str, file_path: &str) -> Result<FileDiff> {
    let repo = Repository::open(worktree_path)?;
    let commit = repo.find_commit(Oid::from_str(sha)?)?;
    let tree = commit.tree()?;
    let parent_tree = commit.parent(0).ok().and_then(|p| p.tree().ok());
    let diff = diff_trees_with_context(&repo, parent_tree.as_ref(), Some(&tree), Some(file_path))?;
    parse_single_file_diff(&diff, file_path)
}

pub fn range_changed_files(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
) -> Result<Vec<CommitChangedFile>> {
    let repo = Repository::open(worktree_path)?;
    let from_tree = repo.find_commit(Oid::from_str(from_sha)?)?.tree()?;
    let to_tree = repo.find_commit(Oid::from_str(to_sha)?)?.tree()?;
    let diff = repo.diff_tree_to_tree(Some(&from_tree), Some(&to_tree), None)?;
    collect_changed_files(&diff)
}

pub fn range_full_diff(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
) -> Result<Vec<FileDiff>> {
    let repo = Repository::open(worktree_path)?;
    let from_tree = repo.find_commit(Oid::from_str(from_sha)?)?.tree()?;
    let to_tree = repo.find_commit(Oid::from_str(to_sha)?)?.tree()?;
    let diff = diff_trees_with_context(&repo, Some(&from_tree), Some(&to_tree), None)?;
    parse_multi_file_diff(&diff)
}

pub fn range_file_diff(
    worktree_path: &Path,
    from_sha: &str,
    to_sha: &str,
    file_path: &str,
) -> Result<FileDiff> {
    let repo = Repository::open(worktree_path)?;
    let from_tree = repo.find_commit(Oid::from_str(from_sha)?)?.tree()?;
    let to_tree = repo.find_commit(Oid::from_str(to_sha)?)?.tree()?;
    let diff = diff_trees_with_context(&repo, Some(&from_tree), Some(&to_tree), Some(file_path))?;
    parse_single_file_diff(&diff, file_path)
}

#[cfg(test)]
mod tests {
    use super::*;
    use git2::Signature;
    use std::fs;

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

    fn commit_file(
        repo: &Repository,
        dir: &std::path::Path,
        name: &str,
        content: &str,
        msg: &str,
    ) -> Oid {
        fs::write(dir.join(name), content).unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new(name)).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, msg, &tree, &[&head])
            .unwrap()
    }

    // --- file_diff (working tree) ---

    #[test]
    fn file_diff_unstaged_modification() {
        let (dir, repo) = create_test_repo();
        commit_file(&repo, dir.path(), "file.txt", "line1\n", "add file");
        fs::write(dir.path().join("file.txt"), "line1\nline2\n").unwrap();

        let diff = file_diff(dir.path(), "file.txt", false).unwrap();
        assert_eq!(diff.path, "file.txt");
        assert!(!diff.is_binary);
        assert!(!diff.hunks.is_empty());

        let lines: Vec<char> = diff.hunks[0].lines.iter().map(|l| l.origin).collect();
        assert!(lines.contains(&'+'));
    }

    #[test]
    fn file_diff_staged_new_file() {
        let (dir, repo) = create_test_repo();
        fs::write(dir.path().join("new.txt"), "content\n").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("new.txt")).unwrap();
        index.write().unwrap();

        let diff = file_diff(dir.path(), "new.txt", true).unwrap();
        assert_eq!(diff.path, "new.txt");
        assert!(!diff.hunks.is_empty());

        let added: Vec<_> = diff.hunks[0]
            .lines
            .iter()
            .filter(|l| l.origin == '+')
            .collect();
        assert!(!added.is_empty());
    }

    #[test]
    fn file_diff_untracked_file() {
        let (dir, _repo) = create_test_repo();
        fs::write(dir.path().join("untracked.txt"), "hello\n").unwrap();

        let diff = file_diff(dir.path(), "untracked.txt", false).unwrap();
        assert_eq!(diff.path, "untracked.txt");
        assert!(!diff.hunks.is_empty());
    }

    #[test]
    fn file_diff_no_changes_empty_hunks() {
        let (dir, repo) = create_test_repo();
        commit_file(&repo, dir.path(), "file.txt", "content\n", "add file");

        let diff = file_diff(dir.path(), "file.txt", false).unwrap();
        assert!(diff.hunks.is_empty());
    }

    // --- commit_changed_files ---

    #[test]
    fn commit_changed_files_added() {
        let (dir, repo) = create_test_repo();
        let sha = commit_file(&repo, dir.path(), "new.txt", "data\n", "add new file");

        let files = commit_changed_files(dir.path(), &sha.to_string()).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "new.txt");
        assert_eq!(files[0].status, "Added");
    }

    #[test]
    fn commit_changed_files_modified() {
        let (dir, repo) = create_test_repo();
        commit_file(&repo, dir.path(), "file.txt", "v1\n", "create");
        let sha = commit_file(&repo, dir.path(), "file.txt", "v2\n", "modify");

        let files = commit_changed_files(dir.path(), &sha.to_string()).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].status, "Modified");
    }

    #[test]
    fn commit_changed_files_multiple() {
        let (dir, repo) = create_test_repo();

        // Commit two files at once
        fs::write(dir.path().join("a.txt"), "a\n").unwrap();
        fs::write(dir.path().join("b.txt"), "b\n").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("a.txt")).unwrap();
        index.add_path(Path::new("b.txt")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        let sha = repo
            .commit(Some("HEAD"), &sig, &sig, "add two", &tree, &[&head])
            .unwrap();

        let files = commit_changed_files(dir.path(), &sha.to_string()).unwrap();
        assert_eq!(files.len(), 2);
        let paths: Vec<&str> = files.iter().map(|f| f.path.as_str()).collect();
        assert!(paths.contains(&"a.txt"));
        assert!(paths.contains(&"b.txt"));
    }

    // --- commit_full_diff ---

    #[test]
    fn commit_full_diff_has_hunks() {
        let (dir, repo) = create_test_repo();
        let sha = commit_file(&repo, dir.path(), "file.txt", "hello\nworld\n", "add file");

        let diffs = commit_full_diff(dir.path(), &sha.to_string()).unwrap();
        assert_eq!(diffs.len(), 1);
        assert_eq!(diffs[0].path, "file.txt");
        assert!(!diffs[0].hunks.is_empty());

        let added: Vec<_> = diffs[0].hunks[0]
            .lines
            .iter()
            .filter(|l| l.origin == '+')
            .collect();
        assert_eq!(added.len(), 2); // "hello\n" and "world\n"
    }

    // --- commit_file_diff ---

    #[test]
    fn commit_file_diff_filters_by_path() {
        let (dir, repo) = create_test_repo();

        fs::write(dir.path().join("a.txt"), "a\n").unwrap();
        fs::write(dir.path().join("b.txt"), "b\n").unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new("a.txt")).unwrap();
        index.add_path(Path::new("b.txt")).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Test", "test@test.com").unwrap();
        let sha = repo
            .commit(Some("HEAD"), &sig, &sig, "add two", &tree, &[&head])
            .unwrap();

        let diff = commit_file_diff(dir.path(), &sha.to_string(), "a.txt").unwrap();
        assert_eq!(diff.path, "a.txt");
        assert!(!diff.hunks.is_empty());
    }

    // --- range diffs ---

    #[test]
    fn range_changed_files_between_commits() {
        let (dir, repo) = create_test_repo();
        let sha1 = commit_file(&repo, dir.path(), "file.txt", "v1\n", "first");
        let sha2 = commit_file(&repo, dir.path(), "file.txt", "v2\n", "second");

        let files = range_changed_files(dir.path(), &sha1.to_string(), &sha2.to_string()).unwrap();
        assert_eq!(files.len(), 1);
        assert_eq!(files[0].path, "file.txt");
        assert_eq!(files[0].status, "Modified");
    }

    #[test]
    fn range_full_diff_shows_changes() {
        let (dir, repo) = create_test_repo();
        let sha1 = commit_file(&repo, dir.path(), "file.txt", "old\n", "v1");
        let sha2 = commit_file(&repo, dir.path(), "file.txt", "new\n", "v2");

        let diffs = range_full_diff(dir.path(), &sha1.to_string(), &sha2.to_string()).unwrap();
        assert_eq!(diffs.len(), 1);
        assert!(!diffs[0].hunks.is_empty());

        let origins: Vec<char> = diffs[0].hunks[0].lines.iter().map(|l| l.origin).collect();
        assert!(origins.contains(&'+'));
        assert!(origins.contains(&'-'));
    }

    #[test]
    fn range_file_diff_specific_file() {
        let (dir, repo) = create_test_repo();
        let sha1 = commit_file(&repo, dir.path(), "file.txt", "a\n", "v1");
        let sha2 = commit_file(&repo, dir.path(), "file.txt", "b\n", "v2");

        let diff =
            range_file_diff(dir.path(), &sha1.to_string(), &sha2.to_string(), "file.txt").unwrap();
        assert_eq!(diff.path, "file.txt");
        assert!(!diff.hunks.is_empty());
    }

    #[test]
    fn diff_line_has_line_numbers() {
        let (dir, repo) = create_test_repo();
        commit_file(&repo, dir.path(), "file.txt", "line1\nline2\n", "create");
        fs::write(dir.path().join("file.txt"), "line1\nchanged\n").unwrap();

        let diff = file_diff(dir.path(), "file.txt", false).unwrap();
        assert!(!diff.hunks.is_empty());

        // Context and change lines should have line numbers
        for line in &diff.hunks[0].lines {
            match line.origin {
                ' ' => {
                    assert!(line.old_lineno.is_some());
                    assert!(line.new_lineno.is_some());
                }
                '-' => assert!(line.old_lineno.is_some()),
                '+' => assert!(line.new_lineno.is_some()),
                _ => {}
            }
        }
    }
}
