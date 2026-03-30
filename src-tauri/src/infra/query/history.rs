use std::path::Path;

use git2::Repository;

use crate::domain::commit::CommitEntry;
use crate::domain::error::Result;

pub fn get_history(worktree_path: &Path, max_count: usize) -> Result<Vec<CommitEntry>> {
    let repo = Repository::open(worktree_path)?;
    let mut revwalk = repo.revwalk()?;
    revwalk.push_head()?;
    revwalk.set_sorting(git2::Sort::TIME)?;

    let head_oid = repo.head().ok().and_then(|h| h.target());

    let mut commits = Vec::new();
    for (i, oid_result) in revwalk.enumerate() {
        if i >= max_count {
            break;
        }
        let oid = oid_result?;
        let commit = repo.find_commit(oid)?;
        let author = commit.author();

        commits.push(CommitEntry {
            sha: oid.to_string(),
            short_sha: oid.to_string()[..7].to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            author_name: author.name().unwrap_or("").to_string(),
            author_email: author.email().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
            is_head: head_oid == Some(oid),
        });
    }

    Ok(commits)
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
            let sig = Signature::now("Alice", "alice@example.com").unwrap();
            let tree_id = repo.index().unwrap().write_tree().unwrap();
            let tree = repo.find_tree(tree_id).unwrap();
            repo.commit(Some("HEAD"), &sig, &sig, "initial commit", &tree, &[])
                .unwrap();
        }
        (dir, repo)
    }

    fn add_commit(repo: &Repository, dir: &Path, filename: &str, message: &str) {
        fs::write(dir.join(filename), message).unwrap();
        let mut index = repo.index().unwrap();
        index.add_path(Path::new(filename)).unwrap();
        index.write().unwrap();
        let tree_id = index.write_tree().unwrap();
        let tree = repo.find_tree(tree_id).unwrap();
        let head = repo.head().unwrap().peel_to_commit().unwrap();
        let sig = Signature::now("Alice", "alice@example.com").unwrap();
        repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&head])
            .unwrap();
    }

    #[test]
    fn history_single_commit() {
        let (dir, _repo) = create_test_repo();
        let history = get_history(dir.path(), 100).unwrap();
        assert_eq!(history.len(), 1);
        assert_eq!(history[0].message, "initial commit");
        assert!(history[0].is_head);
        assert_eq!(history[0].short_sha.len(), 7);
        assert_eq!(history[0].author_name, "Alice");
        assert_eq!(history[0].author_email, "alice@example.com");
        assert!(history[0].timestamp > 0);
    }

    #[test]
    fn history_multiple_commits_returns_all() {
        let (dir, repo) = create_test_repo();
        add_commit(&repo, dir.path(), "a.txt", "second commit");
        add_commit(&repo, dir.path(), "b.txt", "third commit");

        let history = get_history(dir.path(), 100).unwrap();
        assert_eq!(history.len(), 3);
        let messages: Vec<&str> = history.iter().map(|c| c.message.as_str()).collect();
        assert!(messages.contains(&"initial commit"));
        assert!(messages.contains(&"second commit"));
        assert!(messages.contains(&"third commit"));
        // HEAD commit should be first
        assert!(history[0].is_head);
        assert_eq!(history[0].message, "third commit");
    }

    #[test]
    fn history_max_count_limits_results() {
        let (dir, repo) = create_test_repo();
        add_commit(&repo, dir.path(), "a.txt", "second");
        add_commit(&repo, dir.path(), "b.txt", "third");

        let history = get_history(dir.path(), 2).unwrap();
        assert_eq!(history.len(), 2);
    }

    #[test]
    fn history_only_head_is_marked() {
        let (dir, repo) = create_test_repo();
        add_commit(&repo, dir.path(), "a.txt", "second");

        let history = get_history(dir.path(), 100).unwrap();
        assert!(history[0].is_head);
        assert!(!history[1].is_head);
    }

    #[test]
    fn history_sha_is_full_length() {
        let (dir, _repo) = create_test_repo();
        let history = get_history(dir.path(), 1).unwrap();
        assert_eq!(history[0].sha.len(), 40);
        assert!(history[0].sha.chars().all(|c| c.is_ascii_hexdigit()));
    }
}
