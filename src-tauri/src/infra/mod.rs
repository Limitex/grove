pub mod claude;
pub mod git_repo;
pub mod persistence;
pub mod query;
pub mod repository;

/// Escape a string for safe inclusion in a POSIX shell single-quoted context.
pub fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
