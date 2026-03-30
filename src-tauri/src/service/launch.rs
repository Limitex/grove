use std::process::Command;

use crate::domain::config::GroveConfig;
use crate::domain::error::{GroveError, Result};
use crate::infra::persistence;

pub fn open_in_editor(worktree_path: &str, branch: &str) -> Result<()> {
    let config = persistence::config::load()?;
    let args = GroveConfig::substitute_args(&config.editor.args, worktree_path, branch);

    Command::new(&config.editor.command)
        .args(&args)
        .spawn()
        .map_err(|e| {
            GroveError::Config(format!(
                "Failed to launch editor '{}': {}",
                config.editor.command, e
            ))
        })?;

    Ok(())
}

pub fn open_in_terminal(worktree_path: &str, branch: &str) -> Result<()> {
    let config = persistence::config::load()?;
    let args = GroveConfig::substitute_args(&config.terminal.args, worktree_path, branch);

    Command::new(&config.terminal.command)
        .args(&args)
        .spawn()
        .map_err(|e| {
            GroveError::Config(format!(
                "Failed to launch terminal '{}': {}",
                config.terminal.command, e
            ))
        })?;

    Ok(())
}

pub fn open_in_file_manager(worktree_path: &str) -> Result<()> {
    #[cfg(target_os = "linux")]
    let cmd = "xdg-open";
    #[cfg(target_os = "macos")]
    let cmd = "open";
    #[cfg(target_os = "windows")]
    let cmd = "explorer";

    Command::new(cmd)
        .arg(worktree_path)
        .spawn()
        .map_err(|e| GroveError::Config(format!("Failed to open file manager: {}", e)))?;

    Ok(())
}
