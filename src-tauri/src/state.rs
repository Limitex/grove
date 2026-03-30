use std::path::PathBuf;
use std::sync::Mutex;

use crate::domain::error::{GroveError, Result};

/// Shared application state managed by Tauri.
#[derive(Default)]
pub struct AppState {
    /// Path to the currently open repository.
    pub repo_path: Mutex<Option<PathBuf>>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            repo_path: Mutex::new(None),
        }
    }

    /// Get the active repo path or return an error.
    pub fn require_repo_path(&self) -> Result<PathBuf> {
        self.repo_path
            .lock()
            .map_err(|_| GroveError::Config("Internal state lock poisoned".into()))?
            .clone()
            .ok_or_else(|| GroveError::RepoNotFound("No repo open".into()))
    }

    /// Set the active repo path.
    pub fn set_repo_path(&self, path: Option<PathBuf>) -> Result<()> {
        let mut guard = self
            .repo_path
            .lock()
            .map_err(|_| GroveError::Config("Internal state lock poisoned".into()))?;
        *guard = path;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_state_has_no_repo() {
        let state = AppState::new();
        assert!(state.require_repo_path().is_err());
    }

    #[test]
    fn set_and_get_repo_path() {
        let state = AppState::new();
        state
            .set_repo_path(Some(PathBuf::from("/path/to/repo")))
            .unwrap();
        let path = state.require_repo_path().unwrap();
        assert_eq!(path, PathBuf::from("/path/to/repo"));
    }

    #[test]
    fn clear_repo_path() {
        let state = AppState::new();
        state.set_repo_path(Some(PathBuf::from("/repo"))).unwrap();
        state.set_repo_path(None).unwrap();
        assert!(state.require_repo_path().is_err());
    }

    #[test]
    fn require_repo_path_error_is_repo_not_found() {
        let state = AppState::new();
        let err = state.require_repo_path().unwrap_err();
        assert!(err.to_string().contains("No repo open"));
    }

    #[test]
    fn default_state_matches_new() {
        let state = AppState::default();
        assert!(state.require_repo_path().is_err());
    }
}
