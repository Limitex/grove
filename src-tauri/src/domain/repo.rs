use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A saved repository entry.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct RepoEntry {
    pub path: String,
    pub name: String,
    pub is_bare: bool,
}
