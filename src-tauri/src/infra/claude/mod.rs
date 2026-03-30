use std::process::Command;

use crate::domain::claude::{ClaudeSession, ClaudeSessionStatus};

/// Generate a session name prefix from a worktree path.
pub fn session_prefix(worktree_path: &str) -> String {
    let sanitized = worktree_path
        .replace(['/', '.'], "_")
        .trim_start_matches('_')
        .to_string();
    format!("grove_{}", sanitized)
}

/// List all tmux sessions matching the grove prefix for a worktree.
pub fn list_tmux_sessions(prefix: &str) -> Vec<String> {
    let output = Command::new("tmux")
        .args(["list-sessions", "-F", "#{session_name}"])
        .output();

    match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter(|s| s.starts_with(prefix))
            .map(|s| s.to_string())
            .collect(),
        _ => Vec::new(),
    }
}

/// List all tmux sessions with "grove_" prefix in a single tmux invocation.
fn list_all_grove_tmux_sessions() -> Vec<String> {
    let output = Command::new("tmux")
        .args(["list-sessions", "-F", "#{session_name}"])
        .output();

    match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter(|s| s.starts_with("grove_"))
            .map(|s| s.to_string())
            .collect(),
        _ => Vec::new(),
    }
}

/// Find the next available session number for a worktree.
pub fn next_session_name(prefix: &str) -> String {
    let existing = list_tmux_sessions(prefix);
    for i in 1..100 {
        let name = format!("{}_{}", prefix, i);
        if !existing.contains(&name) {
            return name;
        }
    }
    format!("{}_{}", prefix, existing.len() + 1)
}

/// Extract the user label from a session name.
pub fn extract_session_label(session_name: &str, prefix: &str) -> String {
    let suffix = session_name.strip_prefix(prefix).unwrap_or(session_name);
    let suffix = suffix.strip_prefix('_').unwrap_or(suffix);
    if suffix.is_empty() {
        return String::new();
    }
    suffix.replace('_', " ")
}

/// Check if a tmux session already has an attached client.
pub fn has_attached_client(session_name: &str) -> bool {
    let output = Command::new("tmux")
        .args(["list-clients", "-t", session_name, "-F", "#{client_name}"])
        .output();

    match output {
        Ok(o) if o.status.success() => !String::from_utf8_lossy(&o.stdout).trim().is_empty(),
        _ => false,
    }
}

/// Find the main child process (e.g. claude) of a shell pane PID.
/// Returns the child PID if found, otherwise falls back to the pane PID itself.
fn find_main_child_pid(pane_pid: u32) -> u32 {
    let children = Command::new("pgrep")
        .args(["-P", &pane_pid.to_string()])
        .output();

    match children {
        Ok(o) if o.status.success() => {
            // Take the first child — typically the main process (e.g. claude)
            String::from_utf8_lossy(&o.stdout)
                .lines()
                .next()
                .and_then(|l| l.trim().parse().ok())
                .unwrap_or(pane_pid)
        }
        _ => pane_pid,
    }
}

/// Detect Claude Code session status using process-level inspection.
/// Looks at the main child process (claude) rather than the shell (fish/bash).
pub fn detect_session_status(session_name: &str) -> ClaudeSessionStatus {
    let output = Command::new("tmux")
        .args(["list-panes", "-t", session_name, "-F", "#{pane_pid}"])
        .output();

    let pane_pid_str = match output {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout).trim().to_string(),
        _ => return ClaudeSessionStatus::Exited,
    };

    let pane_pid: u32 = match pane_pid_str.parse() {
        Ok(p) => p,
        Err(_) => return ClaudeSessionStatus::Exited,
    };

    // Check if the shell process is alive
    let (shell_alive, _) = get_process_info(pane_pid);
    if !shell_alive {
        return ClaudeSessionStatus::Exited;
    }

    // Find the actual claude process (child of shell)
    let target_pid = find_main_child_pid(pane_pid);

    let (alive, cpu_ticks) = get_process_info(target_pid);
    if !alive {
        // Shell is alive but no child process — waiting for user to start claude
        return ClaudeSessionStatus::Idle;
    }

    let child_count = get_child_process_count(&target_pid.to_string());

    let cache_path = std::env::temp_dir().join(format!("grove_cpu_{}", session_name));
    let prev_ticks: u64 = std::fs::read_to_string(&cache_path)
        .ok()
        .and_then(|s| s.trim().parse().ok())
        .unwrap_or(0);

    let _ = std::fs::write(&cache_path, cpu_ticks.to_string());

    if prev_ticks == 0 {
        if child_count > 15 {
            return ClaudeSessionStatus::Running;
        }
        return ClaudeSessionStatus::Idle;
    }

    let delta = cpu_ticks.saturating_sub(prev_ticks);

    if delta > 3 {
        ClaudeSessionStatus::Running
    } else {
        ClaudeSessionStatus::Idle
    }
}

/// Read /proc/{pid}/stat once and extract alive status + CPU ticks.
#[cfg(target_os = "linux")]
fn read_process_info(pid: u32) -> (bool, u64) {
    let stat_path = format!("/proc/{}/stat", pid);
    let stat_content = match std::fs::read_to_string(&stat_path) {
        Ok(c) => c,
        Err(_) => return (false, 0),
    };

    let close_paren = match stat_content.find(')') {
        Some(i) => i,
        None => return (false, 0),
    };

    let after = &stat_content[close_paren + 2..];

    // Check alive: state char is first field after ")"
    let state_char = after.chars().next();
    let alive = !matches!(state_char, Some('Z') | Some('X') | None);

    // Parse CPU ticks: fields 12 and 13 (0-indexed from after state)
    let fields: Vec<&str> = after.split_whitespace().collect();
    let utime: u64 = fields.get(11).and_then(|s| s.parse().ok()).unwrap_or(0);
    let stime: u64 = fields.get(12).and_then(|s| s.parse().ok()).unwrap_or(0);
    let cpu_ticks = utime + stime;

    (alive, cpu_ticks)
}

/// Combined process info: uses single /proc read on Linux, separate calls elsewhere.
#[cfg(target_os = "linux")]
fn get_process_info(pid: u32) -> (bool, u64) {
    read_process_info(pid)
}

#[cfg(target_os = "macos")]
fn get_process_info(pid: u32) -> (bool, u64) {
    (is_process_alive(pid), get_process_cpu_ticks(pid))
}

#[cfg(not(any(target_os = "linux", target_os = "macos")))]
fn get_process_info(pid: u32) -> (bool, u64) {
    (is_process_alive(pid), 0)
}

/// Check if a process is alive.
#[cfg(not(target_os = "linux"))]
fn is_process_alive(pid: u32) -> bool {
    // On non-Linux platforms, use `kill -0` to check if process exists.
    Command::new("kill")
        .args(["-0", &pid.to_string()])
        .output()
        .is_ok_and(|o| o.status.success())
}

/// Get CPU ticks for a process (used for activity detection).
#[cfg(target_os = "macos")]
fn get_process_cpu_ticks(pid: u32) -> u64 {
    let output = Command::new("ps")
        .args(["-o", "cputime=", "-p", &pid.to_string()])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            // Parse "MM:SS.xx" format into a comparable tick value
            let time_str = String::from_utf8_lossy(&o.stdout).trim().to_string();
            parse_cputime_to_ticks(&time_str)
        }
        _ => 0,
    }
}

#[cfg(target_os = "macos")]
fn parse_cputime_to_ticks(time_str: &str) -> u64 {
    // Format: "H:MM:SS.xx" or "MM:SS.xx"
    let parts: Vec<&str> = time_str.split(':').collect();
    let (hours, minutes, seconds_str) = match parts.len() {
        3 => (
            parts[0].parse::<u64>().unwrap_or(0),
            parts[1].parse::<u64>().unwrap_or(0),
            parts[2],
        ),
        2 => (0, parts[0].parse::<u64>().unwrap_or(0), parts[1]),
        _ => return 0,
    };

    let seconds: f64 = seconds_str.parse().unwrap_or(0.0);
    // Convert to centiseconds for comparable granularity
    (hours * 360000 + minutes * 6000 + (seconds * 100.0) as u64)
}

/// Get the number of child processes.
fn get_child_process_count(pid_str: &str) -> usize {
    let children = Command::new("pgrep").args(["-P", pid_str]).output();

    match children {
        Ok(o) if o.status.success() => String::from_utf8_lossy(&o.stdout)
            .lines()
            .filter(|l| !l.trim().is_empty())
            .count(),
        _ => 0,
    }
}

/// List all active Claude Code sessions for a worktree with status.
pub fn list_sessions(worktree_path: &str) -> Vec<ClaudeSession> {
    let prefix = session_prefix(worktree_path);
    let sessions = list_tmux_sessions(&prefix);
    sessions
        .iter()
        .enumerate()
        .map(|(i, name)| ClaudeSession {
            label: extract_session_label(name, &prefix),
            name: name.clone(),
            index: i + 1,
            status: detect_session_status(name),
        })
        .collect()
}

/// List all active Claude Code sessions across multiple worktrees.
pub fn list_all_sessions(worktree_paths: &[String]) -> Vec<(String, Vec<ClaudeSession>)> {
    let all_sessions = list_all_grove_tmux_sessions();
    if all_sessions.is_empty() {
        return Vec::new();
    }

    worktree_paths
        .iter()
        .filter_map(|path| {
            let prefix = session_prefix(path);
            let matching: Vec<ClaudeSession> = all_sessions
                .iter()
                .filter(|s| s.starts_with(&prefix))
                .enumerate()
                .map(|(i, name)| ClaudeSession {
                    label: extract_session_label(name, &prefix),
                    name: name.clone(),
                    index: i + 1,
                    status: detect_session_status(name),
                })
                .collect();

            if matching.is_empty() {
                None
            } else {
                Some((path.clone(), matching))
            }
        })
        .collect()
}

/// Check if any Claude Code sessions are active for a worktree.
pub fn has_session(worktree_path: &str) -> bool {
    let prefix = session_prefix(worktree_path);
    !list_tmux_sessions(&prefix).is_empty()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn session_prefix_simple_path() {
        // Leading / becomes _ which is then trimmed by trim_start_matches('_')
        let result = session_prefix("/home/user/repos/my-project");
        assert_eq!(result, "grove_home_user_repos_my-project");
    }

    #[test]
    fn session_prefix_strips_leading_separators() {
        let result = session_prefix("/path");
        assert_eq!(result, "grove_path");
    }

    #[test]
    fn session_prefix_replaces_dots() {
        let result = session_prefix("/home/user/.config");
        assert_eq!(result, "grove_home_user__config");
    }

    #[test]
    fn session_prefix_multiple_slashes() {
        let result = session_prefix("/a/b/c/d");
        assert_eq!(result, "grove_a_b_c_d");
    }

    #[test]
    fn extract_label_with_number_suffix() {
        let prefix = "grove__home_user_repo";
        let session = "grove__home_user_repo_1";
        let label = extract_session_label(session, prefix);
        assert_eq!(label, "1");
    }

    #[test]
    fn extract_label_with_text() {
        let prefix = "grove__home_user_repo";
        let session = "grove__home_user_repo_my_session";
        let label = extract_session_label(session, prefix);
        assert_eq!(label, "my session");
    }

    #[test]
    fn extract_label_no_suffix() {
        let prefix = "grove__home_user_repo";
        let session = "grove__home_user_repo";
        let label = extract_session_label(session, prefix);
        assert_eq!(label, "");
    }

    #[test]
    fn extract_label_non_matching_prefix() {
        let prefix = "grove__other";
        let session = "grove__home_user_repo_1";
        let label = extract_session_label(session, prefix);
        // Falls through to the full session name when prefix doesn't match
        assert!(!label.is_empty());
    }
}
