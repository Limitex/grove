pub mod claude;
pub mod clone;
pub mod commit;
pub mod config;
pub mod diff;
pub mod launch;
pub mod rebase;
pub mod remote;
pub mod repo;
pub mod staging;
pub mod worktree;

use crate::domain::error::{GroveError, Result};

/// Run a blocking closure on a dedicated thread to avoid blocking the async runtime.
pub async fn blocking<F, T>(f: F) -> Result<T>
where
    F: FnOnce() -> Result<T> + Send + 'static,
    T: Send + 'static,
{
    tokio::task::spawn_blocking(f)
        .await
        .map_err(|e| GroveError::Internal(format!("Task join error: {}", e)))?
}
