use serde::{Deserialize, Serialize};
use ts_rs::TS;

/// A single action for interactive rebase.
#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct RebaseAction {
    pub sha: String,
    pub action: RebaseActionType,
    pub message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub enum RebaseActionType {
    Pick,
    Reword,
    Squash,
    Drop,
}

impl RebaseActionType {
    pub fn as_str(&self) -> &str {
        match self {
            Self::Pick => "pick",
            Self::Reword => "reword",
            Self::Squash => "squash",
            Self::Drop => "drop",
        }
    }
}
