use std::path::PathBuf;

use serde::{Deserialize, Serialize};

use crate::domain::error::{GroveError, Result};
use crate::domain::repo::RepoEntry;

/// Persistent list of known repositories.
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct RepoStore {
    pub repos: Vec<RepoEntry>,
    pub active_index: Option<usize>,
}

impl RepoStore {
    fn store_path() -> PathBuf {
        dirs::config_dir()
            .unwrap_or_else(|| PathBuf::from("."))
            .join("grove")
            .join("repos.json")
    }

    pub fn load() -> Self {
        let path = Self::store_path();
        if path.exists() {
            std::fs::read_to_string(&path)
                .ok()
                .and_then(|s| serde_json::from_str(&s).ok())
                .unwrap_or_default()
        } else {
            Self::default()
        }
    }

    pub fn save(&self) -> Result<()> {
        let path = Self::store_path();
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent)?;
        }
        let json =
            serde_json::to_string_pretty(self).map_err(|e| GroveError::Config(e.to_string()))?;
        std::fs::write(&path, json)?;
        Ok(())
    }

    pub fn add(&mut self, path: &str, name: &str, is_bare: bool) -> usize {
        if let Some(idx) = self.repos.iter().position(|r| r.path == path) {
            return idx;
        }
        self.repos.push(RepoEntry {
            path: path.to_string(),
            name: name.to_string(),
            is_bare,
        });
        self.repos.len() - 1
    }

    pub fn remove(&mut self, path: &str) {
        self.repos.retain(|r| r.path != path);
        if let Some(idx) = self.active_index {
            if idx >= self.repos.len() {
                self.active_index = if self.repos.is_empty() {
                    None
                } else {
                    Some(self.repos.len() - 1)
                };
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn default_store_is_empty() {
        let store = RepoStore::default();
        assert!(store.repos.is_empty());
        assert_eq!(store.active_index, None);
    }

    #[test]
    fn add_repo_returns_index() {
        let mut store = RepoStore::default();
        let idx = store.add("/path/to/repo", "repo", false);
        assert_eq!(idx, 0);
        assert_eq!(store.repos.len(), 1);
        assert_eq!(store.repos[0].path, "/path/to/repo");
        assert_eq!(store.repos[0].name, "repo");
        assert!(!store.repos[0].is_bare);
    }

    #[test]
    fn add_duplicate_returns_existing_index() {
        let mut store = RepoStore::default();
        let idx1 = store.add("/path/to/repo", "repo", false);
        let idx2 = store.add("/path/to/repo", "different-name", true);
        assert_eq!(idx1, idx2);
        assert_eq!(store.repos.len(), 1);
    }

    #[test]
    fn add_multiple_repos() {
        let mut store = RepoStore::default();
        let idx0 = store.add("/repo/a", "a", false);
        let idx1 = store.add("/repo/b", "b", true);
        assert_eq!(idx0, 0);
        assert_eq!(idx1, 1);
        assert_eq!(store.repos.len(), 2);
    }

    #[test]
    fn remove_existing_repo() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.add("/repo/b", "b", false);
        store.remove("/repo/a");
        assert_eq!(store.repos.len(), 1);
        assert_eq!(store.repos[0].path, "/repo/b");
    }

    #[test]
    fn remove_nonexistent_repo_is_noop() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.remove("/repo/nonexistent");
        assert_eq!(store.repos.len(), 1);
    }

    #[test]
    fn remove_adjusts_active_index_when_out_of_bounds() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.add("/repo/b", "b", false);
        store.active_index = Some(1);
        store.remove("/repo/b");
        assert_eq!(store.active_index, Some(0));
    }

    #[test]
    fn remove_last_repo_clears_active_index() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.active_index = Some(0);
        store.remove("/repo/a");
        assert_eq!(store.active_index, None);
    }

    #[test]
    fn remove_keeps_valid_active_index() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.add("/repo/b", "b", false);
        store.add("/repo/c", "c", false);
        store.active_index = Some(0);
        store.remove("/repo/c");
        // Index 0 is still valid
        assert_eq!(store.active_index, Some(0));
    }

    #[test]
    fn serde_roundtrip() {
        let mut store = RepoStore::default();
        store.add("/repo/a", "a", false);
        store.add("/repo/b", "b", true);
        store.active_index = Some(1);

        let json = serde_json::to_string(&store).unwrap();
        let parsed: RepoStore = serde_json::from_str(&json).unwrap();
        assert_eq!(parsed.repos.len(), 2);
        assert_eq!(parsed.active_index, Some(1));
        assert_eq!(parsed.repos[0].path, "/repo/a");
        assert!(parsed.repos[1].is_bare);
    }
}
