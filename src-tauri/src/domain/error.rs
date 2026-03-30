use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum GroveError {
    #[error("Git error: {0}")]
    Git(#[from] git2::Error),

    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("Config error: {0}")]
    Config(String),

    #[error("Worktree error: {0}")]
    Worktree(String),

    #[error("Repository not found at: {0}")]
    RepoNotFound(String),

    #[error("Internal error: {0}")]
    Internal(String),

    #[error("Rebase conflict: {0}")]
    RebaseConflict(String),
}

pub type Result<T> = std::result::Result<T, GroveError>;

impl Serialize for GroveError {
    fn serialize<S>(&self, serializer: S) -> std::result::Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn error_display_config() {
        let err = GroveError::Config("bad toml".to_string());
        assert_eq!(err.to_string(), "Config error: bad toml");
    }

    #[test]
    fn error_display_worktree() {
        let err = GroveError::Worktree("already exists".to_string());
        assert_eq!(err.to_string(), "Worktree error: already exists");
    }

    #[test]
    fn error_display_repo_not_found() {
        let err = GroveError::RepoNotFound("/path".to_string());
        assert_eq!(err.to_string(), "Repository not found at: /path");
    }

    #[test]
    fn error_display_internal() {
        let err = GroveError::Internal("oops".to_string());
        assert_eq!(err.to_string(), "Internal error: oops");
    }

    #[test]
    fn error_display_rebase_conflict() {
        let err = GroveError::RebaseConflict("conflicts in file.rs".to_string());
        assert_eq!(err.to_string(), "Rebase conflict: conflicts in file.rs");
    }

    #[test]
    fn error_serializes_as_string() {
        let err = GroveError::Config("test".to_string());
        let json = serde_json::to_string(&err).unwrap();
        assert_eq!(json, "\"Config error: test\"");
    }

    #[test]
    fn io_error_converts() {
        let io_err = std::io::Error::new(std::io::ErrorKind::NotFound, "file missing");
        let err: GroveError = io_err.into();
        assert!(err.to_string().contains("file missing"));
    }
}
