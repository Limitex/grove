use ts_rs::TS;

/// Claude session status.
#[derive(Debug, Clone, serde::Serialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub enum ClaudeSessionStatus {
    Idle,
    Running,
    Exited,
}

/// Claude session info returned to the frontend.
#[derive(Debug, Clone, serde::Serialize, TS)]
#[ts(export, export_to = "../../src/generated/")]
pub struct ClaudeSession {
    pub name: String,
    pub label: String,
    pub index: usize,
    pub status: ClaudeSessionStatus,
}
