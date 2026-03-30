use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A single commit entry.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct CommitEntry {
    pub sha: String,
    pub short_sha: String,
    pub message: String,
    pub author_name: String,
    pub author_email: String,
    #[ts(type = "number")]
    pub timestamp: i64,
    pub is_head: bool,
}
