use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// Full information about a single worktree.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct WorktreeInfo {
    pub path: PathBuf,
    pub branch: Option<String>,
    pub head_short: String,
    pub is_main: bool,
    pub is_detached: bool,
    pub status: WorktreeStatus,
    pub label: Option<String>,
}

/// Git status summary for a single worktree.
#[derive(Debug, Clone, Serialize, Deserialize, Default, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct WorktreeStatus {
    pub modified: u32,
    pub staged: u32,
    pub untracked: u32,
    pub conflicted: u32,
    pub ahead: u32,
    pub behind: u32,
    #[ts(type = "number")]
    pub last_commit_time: i64,
    pub last_commit_message: String,
    pub is_clean: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub enum FileStatus {
    Modified,
    Added,
    Deleted,
    Renamed,
    Untracked,
    Conflicted,
    TypeChanged,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub enum FileArea {
    Staged,
    Unstaged,
    Untracked,
    Conflicted,
}

/// A single changed file entry.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct ChangedFile {
    pub path: String,
    pub status: FileStatus,
    pub area: FileArea,
}
