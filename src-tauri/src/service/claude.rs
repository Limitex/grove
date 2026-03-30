use std::process::Command;

use crate::domain::claude::ClaudeSession;
use crate::domain::config::GroveConfig;
use crate::domain::error::{GroveError, Result};
use crate::infra::claude as claude_infra;
use crate::infra::persistence;
use crate::infra::shell_escape;

pub fn open_claude_code(worktree_path: &str, branch: &str, label: Option<&str>) -> Result<()> {
    let config = persistence::config::load()?;
    let prefix = claude_infra::session_prefix(worktree_path);

    let session_name = if let Some(lbl) = label {
        let sanitized = lbl.trim().replace([' ', '/', '.'], "_");
        if sanitized.is_empty() {
            claude_infra::next_session_name(&prefix)
        } else {
            let name = format!("{}_{}", prefix, sanitized);
            if claude_infra::list_tmux_sessions(&prefix).contains(&name) {
                format!("{}_2", name)
            } else {
                name
            }
        }
    } else {
        claude_infra::next_session_name(&prefix)
    };

    let claude_args = GroveConfig::substitute_args(&config.claude.args, worktree_path, branch);
    let mut claude_full = vec![config.claude.command.clone()];
    claude_full.extend(claude_args);
    let claude_cmd = claude_full.join(" ");

    let tmux_cmd = format!(
        "unset CLAUDECODE; tmux new-session -s {} -c {} {}",
        shell_escape(&session_name),
        shell_escape(worktree_path),
        claude_cmd
    );

    Command::new(&config.terminal.command)
        .arg("-e")
        .args(["sh", "-c", &tmux_cmd])
        .spawn()
        .map_err(|e| GroveError::Config(format!("Failed to launch Claude session: {}", e)))?;

    Ok(())
}

pub fn attach_claude_session(session_name: &str) -> Result<()> {
    if claude_infra::has_attached_client(session_name) {
        return Ok(());
    }

    let config = persistence::config::load()?;
    let tmux_cmd = format!("tmux attach-session -t {}", shell_escape(session_name));

    Command::new(&config.terminal.command)
        .arg("-e")
        .args(["sh", "-c", &tmux_cmd])
        .spawn()
        .map_err(|e| GroveError::Config(format!("Failed to attach to session: {}", e)))?;

    Ok(())
}

pub fn kill_claude_session(session_name: &str) -> Result<()> {
    Command::new("tmux")
        .args(["kill-session", "-t", session_name])
        .output()
        .map_err(|e| GroveError::Config(format!("Failed to kill session: {}", e)))?;
    Ok(())
}

pub fn list_claude_sessions(worktree_path: &str) -> Vec<ClaudeSession> {
    claude_infra::list_sessions(worktree_path)
}

pub fn has_claude_session(worktree_path: &str) -> bool {
    claude_infra::has_session(worktree_path)
}

pub fn list_all_claude_sessions(worktree_paths: &[String]) -> Vec<(String, Vec<ClaudeSession>)> {
    claude_infra::list_all_sessions(worktree_paths)
}
